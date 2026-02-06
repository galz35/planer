import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';

import * as planningRepo from './planning.repo';
import * as authRepo from '../auth/auth.repo';
import * as avanceMensualRepo from './avance-mensual.repo';
import * as grupoRepo from './grupo.repo';
import { AuditService } from '../common/audit.service';
import { VisibilidadService } from '../acceso/visibilidad.service';
import * as tasksRepo from '../clarity/tasks.repo';

@Injectable()
export class PlanningService {
    constructor(
        private auditService: AuditService,
        private visibilidadService: VisibilidadService,
    ) { }

    // ============================
    // Helpers (validación/sanitizado)
    // ============================
    private isAdminRole(rol: string | null | undefined) {
        const r = String(rol || '').trim();
        return r === 'Admin' || r === 'Administrador' || r === 'SuperAdmin';
    }

    private async isAdminUser(idUsuario: number): Promise<boolean> {
        const u = await authRepo.obtenerUsuarioPorId(idUsuario);
        return this.isAdminRole(u?.rolGlobal);
    }

    private ensureMonthYear(mes: number, anio: number) {
        if (!mes || Number.isNaN(mes) || mes < 1 || mes > 12) {
            throw new BadRequestException('mes inválido (1-12).');
        }
        if (!anio || Number.isNaN(anio) || anio < 2000 || anio > 2100) {
            throw new BadRequestException('anio inválido (2000-2100).');
        }
    }

    private ensurePercent(p: number) {
        if (p === null || p === undefined || Number.isNaN(p) || p < 0 || p > 100) {
            throw new BadRequestException('porcentajeMes inválido (0-100).');
        }
    }

    // Campos permitidos para request-change (evita que te actualicen cualquier columna)
    private readonly CAMPOS_PERMITIDOS_SOLICITUD = new Set<string>([
        'titulo',
        'nombre',
        'descripcion',
        'progreso',
        'porcentaje',
        'fechaObjetivo',
        'fechaInicioPlanificada',
        'fechaFinPlanificada',
        'prioridad',
        'estado',
    ]);

    // Mapeo frontend -> DB
    private mapCampoToDb(campo: string): string {
        const c = String(campo || '').trim();
        if (c === 'titulo') return 'nombre';
        if (c === 'progreso') return 'porcentaje';
        return c;
    }

    // Normalización básica de valores (según campo)
    private normalizeValorNuevo(campoDb: string, valor: any): any {
        // Fechas: deja ISO string / Date string (tu repo decide)
        if (
            campoDb === 'fechaObjetivo' ||
            campoDb === 'fechaInicioPlanificada' ||
            campoDb === 'fechaFinPlanificada'
        ) {
            if (valor === null || valor === undefined || valor === '') return null;
            const s = String(valor).trim();
            if (!s) return null;
            // no parseo agresivo: solo validación mínima
            const d = new Date(s);
            if (Number.isNaN(d.getTime())) throw new BadRequestException(`Fecha inválida para ${campoDb}.`);
            return s;
        }

        if (campoDb === 'porcentaje') {
            const n = Number(valor);
            if (Number.isNaN(n) || n < 0 || n > 100) throw new BadRequestException('porcentaje inválido.');
            return n;
        }

        // Default: string
        if (valor === null || valor === undefined) return null;
        return String(valor);
    }

    private async assertPuedeVerUsuario(idSolicitante: number, idObjetivo: number) {
        if (idSolicitante === idObjetivo) return true;
        if (await this.isAdminUser(idSolicitante)) return true;

        const ok = await this.visibilidadService.verificarAccesoPorId(idSolicitante, idObjetivo);
        if (!ok) throw new ForbiddenException('No tienes acceso a este usuario.');
        return true;
    }

    public async verificarAccesoTarea(idSolicitante: number, tarea: any) {
        // Si el usuario es el mismo que el dueño/asignado
        const idOwner = tarea?.idUsuario ?? tarea?.idUsuarioAsignado ?? tarea?.planIdUsuario;
        if (idOwner === idSolicitante) return true;

        // Admin siempre puede
        if (await this.isAdminUser(idSolicitante)) return true;

        // 1. Visibilidad Jerárquica
        if (idOwner && typeof idOwner === 'number') {
            const jerarquiaOk = await this.visibilidadService.verificarAccesoPorId(idSolicitante, idOwner);
            if (jerarquiaOk) return true;
        } else {
            // Si no hay dueño, asumimos que es pública o asignable? 
            // Mejor verificar proyecto
        }

        // 2. Visibilidad por Proyecto (Colaboración)
        // Si la tarea pertenece a un proyecto visible para el usuario, permite acceso.
        const user = await authRepo.obtenerUsuarioPorId(idSolicitante);
        if (tarea.idProyecto) {
            const proyectos = await planningRepo.obtenerProyectosVisibles(idSolicitante, user);
            const accesoProyecto = proyectos.some((p: any) => p.idProyecto === tarea.idProyecto);
            if (accesoProyecto) return true;

            // 3. NUEVO: Fallback Estructural (Gerencia/Subgerencia)
            // Si el proyecto pertenece a mi gerencia/area y soy Gerente/Jefe/Director
            // Consultamos el proyecto para ver su metadata
            try {
                const proyecto = await planningRepo.obtenerProyectoPorId(tarea.idProyecto);
                if (proyecto && user) {
                    const rol = (user.rolGlobal || '').trim();

                    // A. Gerentes/Directores ven todo lo de su Gerencia
                    if ((rol === 'Gerente' || rol === 'Director') && user.gerencia && proyecto.gerencia === user.gerencia) {
                        return true;
                    }

                    // B. Jefes ven todo lo de su Subgerencia/Area (si coincide)
                    if (rol === 'Jefe' || rol === 'Coordinador' || rol === 'Lider') {
                        if (user.subgerencia && proyecto.subgerencia === user.subgerencia) return true;
                        if (user.area && proyecto.area === user.area) return true;
                    }

                    // C. Proyectos Públicos o de mi Nodo Organizacional (Si idNodoDuenio coincide con un nodo que lidero)
                    // Esto requeriría consultar mis nodos liderados, asumiendo idOrg en usuario o query extra
                    // Por ahora la coincidencia de nombres es un buen proxy.
                }
            } catch (e) {
                console.warn('[PlanningService] Error checking project structure visibility', e);
            }
        }

        // Si falló todo
        console.warn(`[Access Denied] User ${idSolicitante} tried to access Task ${tarea.idTarea} (Project ${tarea.idProyecto}). Role: ${user?.rolGlobal}`);
        throw new ForbiddenException(`No tienes permisos para ver/editar esta tarea (Restringido por Jerarquía y Proyecto: ${tarea.idProyecto || 'N/A'}).`);
    }

    // ============================
    // Core
    // ============================

    async checkEditPermission(
        idTarea: number,
        idUsuario: number,
    ): Promise<{ puedeEditar: boolean; requiereAprobacion: boolean; tipoProyecto: string }> {
        const tarea = await planningRepo.obtenerTareaPorId(idTarea);
        if (!tarea) throw new NotFoundException('Tarea no encontrada');

        // Seguridad: si es tarea de alguien más, debo poder verlo (jerarquía o admin)
        await this.verificarAccesoTarea(idUsuario, tarea);

        // Si no tiene proyecto, tarea personal -> Libre
        if (!tarea.idProyecto) {
            return { puedeEditar: true, requiereAprobacion: false, tipoProyecto: 'Personal' };
        }

        // Proyectos estratégicos requieren aprobación
        if (tarea.proyectoTipo === 'Estrategico' || tarea.proyectoRequiereAprobacion) {
            const usuario = await authRepo.obtenerUsuarioPorId(idUsuario);

            // 1. Admin siempre libre
            if (this.isAdminRole(usuario?.rolGlobal)) {
                return { puedeEditar: true, requiereAprobacion: false, tipoProyecto: tarea.proyectoTipo || 'Estrategico' };
            }

            // 2. Si soy el CREADOR de la tarea, puedo editarla libremente (agilidad para "cosa vieja")
            if (tarea.idCreador === idUsuario) {
                return { puedeEditar: true, requiereAprobacion: false, tipoProyecto: tarea.proyectoTipo || 'Estrategico' };
            }

            // 3. Si soy el DUEÑO o RESPONSABLE del proyecto completo
            const proyecto = await planningRepo.obtenerProyectoPorId(tarea.idProyecto);
            if (proyecto) {
                const esDuenio = proyecto.idCreador === idUsuario || proyecto.responsableCarnet === usuario?.carnet;
                if (esDuenio) {
                    return { puedeEditar: true, requiereAprobacion: false, tipoProyecto: tarea.proyectoTipo || 'Estrategico' };
                }
            }

            // 4. [FIX] Si soy el ASIGNADO de la tarea, puedo trabajarla (Operational freedom)
            const esAsignado = await planningRepo.esAsignado(idTarea, idUsuario);
            if (esAsignado) {
                return { puedeEditar: true, requiereAprobacion: false, tipoProyecto: tarea.proyectoTipo || 'Estrategico' };
            }

            // Permitimos editar pero con flujo de aprobación para otros
            return { puedeEditar: true, requiereAprobacion: true, tipoProyecto: tarea.proyectoTipo || 'Estrategico' };
        }

        // Operativo / Táctico -> Libre
        return { puedeEditar: true, requiereAprobacion: false, tipoProyecto: tarea.proyectoTipo || 'General' };
    }

    async solicitarCambio(
        idUsuario: number,
        idTarea: number,
        campo: string,
        valorNuevo: any,
        motivo: string,
    ) {
        const tarea = await planningRepo.obtenerTareaPorId(idTarea);
        if (!tarea) throw new NotFoundException('Tarea no encontrada');

        await this.verificarAccesoTarea(idUsuario, tarea);

        const campoRaw = String(campo || '').trim();
        if (!this.CAMPOS_PERMITIDOS_SOLICITUD.has(campoRaw)) {
            throw new BadRequestException(`Campo no permitido para solicitud: ${campoRaw}`);
        }

        const campoDb = this.mapCampoToDb(campoRaw);
        const user = await authRepo.obtenerUsuarioPorId(idUsuario);
        if (!user) throw new ForbiddenException('Usuario inválido.');

        const valorAnterior = (tarea as any)[campoDb] !== undefined && (tarea as any)[campoDb] !== null
            ? String((tarea as any)[campoDb])
            : '';

        const valorNormalizado = this.normalizeValorNuevo(campoDb, valorNuevo);

        // Importante: guardamos el campo ORIGINAL que pidió el front + el DB
        return await planningRepo.crearSolicitudCambio({
            idTarea,
            idUsuario,
            campo: campoRaw,
            valorAnterior,
            valorNuevo: valorNormalizado === null ? '' : String(valorNormalizado),
            motivo: String(motivo || '').trim()
        });
    }

    async getSolicitudesPendientes(idUsuario: number) {
        const user = await authRepo.obtenerUsuarioPorId(idUsuario);
        if (!user) return [];

        // Admin ve todas
        if (this.isAdminRole(user.rolGlobal)) {
            return await planningRepo.obtenerSolicitudesPendientes();
        }

        // Líder: ve solicitudes de su equipo (por carnets)
        if (user.carnet) {
            const team = await planningRepo.obtenerEquipoDirecto(user.carnet);
            const teamCarnets = (team || []).map((u: any) => u.carnet).filter((c: any) => c);
            if (teamCarnets.length > 0) {
                return await planningRepo.obtenerSolicitudesPorCarnets(teamCarnets);
            }
        }

        // No es admin ni líder: por defecto no tiene bandeja de aprobaciones
        return [];
    }

    async resolverSolicitud(
        idUsuarioResolutor: number,
        idSolicitud: number,
        accion: 'Aprobar' | 'Rechazar',
        comentario?: string,
    ) {
        const user = await authRepo.obtenerUsuarioPorId(idUsuarioResolutor);
        if (!user) throw new ForbiddenException('Usuario inválido.');

        const solicitud = await planningRepo.obtenerSolicitudPorId(idSolicitud);
        if (!solicitud) throw new NotFoundException('Solicitud no encontrada');

        // ✅ Permisos: Admin O superior del solicitante (visibilidad)
        const esAdmin = this.isAdminRole(user.rolGlobal);
        if (!esAdmin) {
            const solicitanteId = Number((solicitud as any).idUsuarioSolicitante);
            if (!solicitanteId || Number.isNaN(solicitanteId)) {
                throw new ForbiddenException('No se puede validar jerarquía del solicitante.');
            }
            const esSuperior = await this.visibilidadService.verificarAccesoPorId(idUsuarioResolutor, solicitanteId);
            if (!esSuperior) {
                throw new ForbiddenException('No tienes permisos para resolver esta solicitud.');
            }
        }

        const comentarioFinal = comentario ? String(comentario).trim() : '';

        if (accion === 'Rechazar') {
            await planningRepo.resolverSolicitud(
                idSolicitud,
                'Rechazado',
                idUsuarioResolutor,
                comentarioFinal || 'Rechazado por superior'
            );
            return { mensaje: 'Solicitud rechazada' };
        }

        // Aprobar: aplicar cambio con whitelist/mapeo
        const campoRaw = String(solicitud.campo || '').trim();
        if (!this.CAMPOS_PERMITIDOS_SOLICITUD.has(campoRaw)) {
            throw new BadRequestException(`Campo no permitido en solicitud: ${campoRaw}`);
        }

        const campoDb = this.mapCampoToDb(campoRaw);
        const valorDb = this.normalizeValorNuevo(campoDb, solicitud.valorNuevo);

        // Seguridad extra: validar que resolutor puede ver la tarea (por dueño)
        const tarea = await planningRepo.obtenerTareaPorId(solicitud.idTarea);
        if (!tarea) throw new NotFoundException('Tarea no encontrada');
        await this.verificarAccesoTarea(idUsuarioResolutor, tarea);

        // MIGRACION v2.1: Usar tasksRepo para asegurar Roll-up
        await tasksRepo.actualizarTarea(solicitud.idTarea, { [campoDb]: valorDb });

        await planningRepo.resolverSolicitud(
            idSolicitud,
            'Aprobado',
            idUsuarioResolutor,
            comentarioFinal || 'Aprobado por superior'
        );

        await this.auditService.log({
            accion: 'CAMBIO_APROBADO',
            recurso: 'Tarea',
            recursoId: String((solicitud as any).idTarea),
            idUsuario: idUsuarioResolutor,
            detalles: { idSolicitud, campo: campoDb, valor: valorDb },
        });

        return { mensaje: 'Solicitud aprobada y cambio aplicado correctamente' };
    }

    async updateTareaOperativa(idUsuario: number, idTarea: number, updates: any) {
        const tarea = await planningRepo.obtenerTareaPorId(idTarea);
        if (!tarea) throw new NotFoundException('Tarea no encontrada');

        await this.verificarAccesoTarea(idUsuario, tarea);

        const permiso = await this.checkEditPermission(idTarea, idUsuario);

        if (!permiso.puedeEditar) throw new ForbiddenException('No tienes permiso para editar esta tarea');
        if (permiso.requiereAprobacion) {
            throw new BadRequestException('Esta tarea requiere aprobación. Usa request-change.');
        }

        // ✅ Sanitizar updates: solo campos operativos permitidos
        const allowed = new Set<string>([
            'nombre',
            'descripcion',
            'porcentaje',
            'estado',
            'prioridad',
            'fechaObjetivo',
            'fechaInicioPlanificada',
            'fechaFinPlanificada',
        ]);

        const safe: any = {};
        for (const k of Object.keys(updates || {})) {
            if (!allowed.has(k)) continue;
            safe[k] = this.normalizeValorNuevo(k, updates[k]);
        }

        if (Object.keys(safe).length === 0) {
            throw new BadRequestException('No hay campos válidos para actualizar.');
        }

        // MIGRACION v2.1: Blindaje de actualizaciones operativas
        await tasksRepo.actualizarTarea(idTarea, safe);

        await this.auditService.log({
            accion: 'TAREA_ACTUALIZADA',
            recurso: 'Tarea',
            recursoId: String(idTarea),
            idUsuario,
            detalles: { tipo: 'UpdateOperativa', campos: Object.keys(safe) },
        });

        return { exito: true };
    }

    // ==========================================
    // PLANES DE TRABAJO
    // ==========================================
    async getPlans(idSolicitante: number, idObjetivo: number, mes: number, anio: number) {
        this.ensureMonthYear(mes, anio);
        await this.assertPuedeVerUsuario(idSolicitante, idObjetivo);

        const carnetObjetivo = await this.visibilidadService.obtenerCarnetPorId(idObjetivo);
        if (!carnetObjetivo) throw new NotFoundException('Carnet de usuario objetivo no encontrado');

        return await planningRepo.obtenerPlanes(carnetObjetivo, mes, anio);
    }

    async upsertPlan(idUsuario: number, body: any) {
        const targetUserId = Number(body?.idUsuario);
        const mes = Number(body?.mes);
        const anio = Number(body?.anio);

        if (!targetUserId || Number.isNaN(targetUserId)) throw new BadRequestException('idUsuario inválido.');
        this.ensureMonthYear(mes, anio);

        // Si editas el plan de otro: debes poder verlo (jerarquía o admin)
        await this.assertPuedeVerUsuario(idUsuario, targetUserId);

        const objetivos = body?.objetivos ?? null;
        const estado = body?.estado ? String(body.estado) : 'Borrador';

        return await planningRepo.upsertPlan({
            idUsuario: targetUserId,
            mes,
            anio,
            objetivos,
            estado,
            idCreador: idUsuario,
        });
    }

    // ==========================================
    // DASHBOARD & TEAM
    // ==========================================
    async getMyTeam(idUsuario: number) {
        const user = await authRepo.obtenerUsuarioPorId(idUsuario);
        if (!user || !user.carnet) return [];
        const team = await this.visibilidadService.obtenerMiEquipo(user.carnet);

        // ✅ Garantizar que el usuario mismo esté en la lista para auto-asignarse
        const isSelfInTeam = (team || []).some((m: any) =>
            String(m.carnet).trim() === String(user.carnet || '').trim() ||
            Number(m.idUsuario) === Number(idUsuario)
        );

        if (!isSelfInTeam) {
            team.unshift({
                ...user,
                nombre: user.nombreCompleto || user.nombre,
                nivel: 0,
                fuente: 'MISMO'
            });
        }

        return team;
    }

    async getMyProjects(idUsuario: number) {
        const carnet = await this.visibilidadService.obtenerCarnetPorId(idUsuario);
        if (!carnet) return [];
        return await planningRepo.obtenerProyectosPorUsuario(carnet);
    }

    // ==========================================
    // Pendientes (igual que tenías, pero con firma segura)
    // ==========================================
    async cloneTask(idUsuario: number, idTarea: number) {
        const tarea = await planningRepo.obtenerTareaPorId(idTarea);
        if (!tarea) throw new NotFoundException('Tarea no encontrada');
        await this.verificarAccesoTarea(idUsuario, tarea);

        const carnet = await this.visibilidadService.obtenerCarnetPorId(idUsuario);
        if (!carnet) throw new ForbiddenException('No se pudo resolver el carnet del usuario');

        const idNueva = await planningRepo.clonarTarea(idTarea, carnet);

        await this.auditService.log({
            accion: 'TAREA_CREADA',
            recurso: 'Tarea',
            recursoId: String(idNueva),
            idUsuario,
            detalles: { origenId: idTarea, tipo: 'Clonacion' },
        });

        return { id: idNueva };
    }

    async reassignTasks(idUsuario: number, from: number, to: number, tasks: number[]) {
        // Validar que el usuario pueda ver a ambos (jerarquía o admin)
        await this.assertPuedeVerUsuario(idUsuario, from);
        await this.assertPuedeVerUsuario(idUsuario, to);

        const toCarnet = await this.visibilidadService.obtenerCarnetPorId(to);
        if (!toCarnet) throw new BadRequestException('Usuario destino no tiene carnet válido');

        await planningRepo.reasignarTareas(tasks, toCarnet);

        await this.auditService.log({
            accion: 'TAREA_REASIGNADA',
            recurso: 'Tarea', // Podría ser una lista, pero simplificamos log
            recursoId: 'Multiple',
            idUsuario,
            detalles: { tasks, from, to },
        });

        return { exito: true };
    }

    async getTaskHistory(idTarea: number, idSolicitante: number) {
        const tarea = await planningRepo.obtenerTareaPorId(idTarea);
        if (!tarea) throw new NotFoundException('Tarea no encontrada');
        await this.verificarAccesoTarea(idSolicitante, tarea);

        return await this.auditService.getHistorialEntidad('Tarea', String(idTarea));
    }

    async closePlan(idUsuario: number, idPlan: number) {
        const plan = await planningRepo.obtenerPlanPorId(idPlan);
        if (!plan) throw new NotFoundException('Plan no encontrado');

        await this.assertPuedeVerUsuario(idUsuario, plan.idUsuario);

        await planningRepo.cerrarPlan(idPlan);
        return { success: true };
    }

    // ==========================================
    // AVANCE MENSUAL
    // ==========================================
    async registrarAvanceMensual(
        idTarea: number,
        anio: number,
        mes: number,
        porcentajeMes: number,
        comentario: string | null,
        idUsuario: number,
    ) {
        this.ensureMonthYear(mes, anio);
        this.ensurePercent(porcentajeMes);

        // Validar que el usuario pueda ver la tarea
        const tarea = await planningRepo.obtenerTareaPorId(idTarea);
        if (!tarea) throw new NotFoundException('Tarea no encontrada');
        await this.verificarAccesoTarea(idUsuario, tarea);

        await avanceMensualRepo.upsertAvanceMensual(idTarea, anio, mes, porcentajeMes, comentario, idUsuario);

        await this.auditService.log({
            accion: 'TAREA_ACTUALIZADA',
            recurso: 'Tarea',
            recursoId: String(idTarea),
            idUsuario,
            detalles: { tipo: 'AvanceMensual', anio, mes, porcentajeMes },
        });

        return await avanceMensualRepo.obtenerHistorialMensual(idTarea);
    }

    async obtenerHistorialMensual(idTarea: number, idSolicitante: number) {
        const tarea = await planningRepo.obtenerTareaPorId(idTarea);
        if (!tarea) throw new NotFoundException('Tarea no encontrada');
        await this.verificarAccesoTarea(idSolicitante, tarea);

        return await avanceMensualRepo.obtenerHistorialMensual(idTarea);
    }

    // ==========================================
    // GRUPOS / FASES
    // ==========================================
    async crearGrupo(idTarea: number, idUsuario: number) {
        const tarea = await planningRepo.obtenerTareaPorId(idTarea);
        if (!tarea) throw new NotFoundException('Tarea no encontrada');
        await this.verificarAccesoTarea(idUsuario, tarea);

        await grupoRepo.crearGrupoInicial(idTarea);

        await this.auditService.log({
            accion: 'TAREA_ACTUALIZADA',
            recurso: 'Tarea',
            recursoId: String(idTarea),
            idUsuario,
            detalles: { tipo: 'CrearGrupo' },
        });

        return { idGrupo: idTarea, message: 'Grupo creado' };
    }

    async agregarFase(idGrupo: number, idTareaNueva: number, idUsuario: number) {
        // Validar visibilidad sobre ambas tareas
        const grupo = await planningRepo.obtenerTareaPorId(idGrupo);
        if (!grupo) throw new NotFoundException('Grupo no encontrado');
        await this.verificarAccesoTarea(idUsuario, grupo);

        const fase = await planningRepo.obtenerTareaPorId(idTareaNueva);
        if (!fase) throw new NotFoundException('Tarea fase no encontrada');
        await this.verificarAccesoTarea(idUsuario, fase);

        await grupoRepo.agregarFase(idGrupo, idTareaNueva);

        await this.auditService.log({
            accion: 'TAREA_ACTUALIZADA',
            recurso: 'Tarea',
            recursoId: String(idTareaNueva),
            idUsuario,
            detalles: { tipo: 'AgregarFase', idGrupo },
        });

        return await grupoRepo.obtenerTareasGrupo(idGrupo);
    }

    async obtenerGrupo(idGrupo: number, idSolicitante: number) {
        const grupo = await planningRepo.obtenerTareaPorId(idGrupo);
        if (!grupo) throw new NotFoundException('Grupo no encontrado');
        await this.verificarAccesoTarea(idSolicitante, grupo);

        return await grupoRepo.obtenerTareasGrupo(idGrupo);
    }

    // ==========================================
    // DASHBOARD ALERTS
    // ==========================================
    async getDashboardAlerts(idUsuario: number) {
        const carnet = await this.visibilidadService.obtenerCarnetPorId(idUsuario);
        if (!carnet) return { today: [], overdue: [] };

        // 1. Obtener mi equipo completo (jerarquía + delegaciones)
        const equipo = await this.visibilidadService.obtenerMiEquipo(carnet);
        const carnetsEquipo = equipo.map((u: any) => u.carnet).filter((c: any) => c);

        // FIX: Incluir siempre al propio usuario para ver también SUS tareas, 
        // ya que obtenerMiEquipo a veces retorna solo subordinados excluyendo al jefe.
        if (!carnetsEquipo.includes(carnet)) {
            carnetsEquipo.push(carnet);
        }

        if (carnetsEquipo.length === 0) return { today: [], overdue: [] };

        // 2. Obtener tareas críticas (Raw Data)
        const tareas = await planningRepo.obtenerTareasCriticas(carnetsEquipo);

        // 3. Clasificar en Servidor (consistente)
        const hoy = new Date().toISOString().split('T')[0]; // Fecha YYYY-MM-DD serv

        const overdue: any[] = [];
        const today: any[] = [];

        tareas.forEach((t: any) => {
            const fObj = t.fechaObjetivo ? new Date(t.fechaObjetivo).toISOString().split('T')[0] : null;
            const fComp = t.fechaCompletado ? new Date(t.fechaCompletado).toISOString().split('T')[0] : null;
            const fFin = t.fechaFinReal ? new Date(t.fechaFinReal).toISOString().split('T')[0] : null;

            if (t.estado === 'Hecha' || t.estado === 'Completada') {
                // Si fue completada HOY (por cualquiera de los dos campos), va a la columna de éxitos del día
                if (fComp === hoy || fFin === hoy) today.push(t);
            } else {
                // Si está pendiente y es del pasado -> Atrasada
                if (fObj && fObj < hoy) overdue.push(t);
                // Si está pendiente y es de hoy -> Para entregar hoy
                else if (fObj === hoy) today.push(t);
            }
        });

        return { overdue, today };
    }

    // ==========================================
    // MI ASIGNACIÓN - Vista Unificada
    // ==========================================
    async getMiAsignacion(carnet: string, filtros?: { estado?: string }) {
        return await planningRepo.obtenerMiAsignacion(carnet, filtros);
    }
}
