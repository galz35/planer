import { Injectable, InternalServerErrorException, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import * as clarityRepo from './clarity.repo';
import * as planningRepo from '../planning/planning.repo';
import * as tasksRepo from './tasks.repo';
import * as authRepo from '../auth/auth.repo';
import * as accesoRepo from '../acceso/acceso.repo';
import { ResourceNotFoundException } from '../common/exceptions';
import { TareaCrearRapidaDto, CheckinUpsertDto, BloqueoCrearDto, TareaRevalidarDto, TareaMasivaDto } from './dto/clarity.dtos';
import { AuditService } from '../common/audit.service';
import { PlanningService } from '../planning/planning.service';
import { VisibilidadService } from '../acceso/visibilidad.service';
import { RecurrenciaService } from './recurrencia.service';
import { ProyectoFilterDto, ProyectoCrearDto } from './dto/clarity.dtos';
import { NotificationService } from '../common/notification.service';


import { Int, NVarChar } from '../db/base.repo';

@Injectable()
export class TasksService {
    constructor(
        private planningService: PlanningService,
        private auditService: AuditService,
        private visibilidadService: VisibilidadService,
        private recurrenciaService: RecurrenciaService,
        private notificationService: NotificationService,
    ) { }


    // ===============================================
    // COMPATIBILIDAD CON CONTROLLER (Métodos mapeados)
    // ===============================================

    async resolveCarnet(idUsuario: number): Promise<string> {
        return (await this.visibilidadService.obtenerCarnetPorId(idUsuario)) || '';
    }

    async canManageUserByCarnet(managerCarnet: string, subordinateCarnet: string): Promise<boolean> {
        if (managerCarnet === subordinateCarnet) return true;
        return await this.visibilidadService.puedeVer(managerCarnet, subordinateCarnet);
    }

    async canManageUser(managerId: number, subordinateId: number, requesterRole?: string): Promise<boolean> {
        // 1. Si es el mismo usuario, siempre puede
        if (managerId === subordinateId) return true;

        // 2. Si es Admin, siempre puede
        if (requesterRole === 'Admin' || requesterRole === 'Administrador') return true;

        // 3. Verificar visibilidad jerárquica
        const hasAccess = await this.visibilidadService.verificarAccesoPorId(managerId, subordinateId);

        if (!hasAccess) {
            const mCarnet = await this.visibilidadService.obtenerCarnetPorId(managerId);
            const sCarnet = await this.visibilidadService.obtenerCarnetPorId(subordinateId);
            console.warn(`[TasksService] Access Denied: Manager #${managerId} (${mCarnet || 'N/A'}) -> Subordinate #${subordinateId} (${sCarnet || 'N/A'})`);
        }

        return hasAccess;
    }

    async crearSolicitudCambio(idUsuario: number, idTarea: number, campo: string, valorNuevo: string, motivo?: string) {
        return await this.planningService.solicitarCambio(idUsuario, idTarea, campo, valorNuevo, motivo || '');
    }

    async miDiaGet(carnet: string, fechaStr: string, startDate?: string, endDate?: string) {
        const fecha = fechaStr ? new Date(fechaStr) : new Date();

        // Obtener check-in del día (si existe)
        const checkinHoy = await clarityRepo.obtenerCheckinPorFecha(carnet, fecha);

        const start = startDate ? new Date(startDate) : undefined;
        const end = endDate ? new Date(endDate) : undefined;

        let tareas = await clarityRepo.getTareasUsuario(carnet, undefined, undefined, start, end);

        // 2026-02-13: Sanitizar estados para evitar bugs de espacios (ej: 'Hecha ' vs 'Hecha')
        if (tareas) {
            tareas.forEach(t => {
                if (typeof t.estado === 'string') t.estado = t.estado.trim();
            });
        }

        // 2026-02-04: Filtro para evitar que tareas viejas completadas aparezcan en la bandeja de selección
        // Solo mostramos pendientes, en curso, bloqueadas o las terminadas HOY.
        tareas = (tareas || []).filter(t => {
            const estado = t.estado; // ya está trimado
            if (estado === 'Hecha' || estado === 'Completada') {
                const fComp = t.fechaCompletado || (t as any).fechaHecha;
                if (!fComp) return false;
                const dComp = new Date(fComp);
                return dComp.toDateString() === fecha.toDateString();
            }
            return !['Descartada', 'Eliminada', 'Archivada'].includes(estado);
        });

        // Obtener agenda recurrente
        const agendaRecurrente = await this.recurrenciaService.obtenerAgendaRecurrente(fecha, carnet);

        // Obtener Backlog (Tareas Vencidas)
        let backlog = await clarityRepo.obtenerBacklog(carnet);

        // Excluir tareas que YA están en el checkin de hoy para no duplicar visualmente
        if (checkinHoy && checkinHoy.tareas && checkinHoy.tareas.length > 0) {
            const tareasEnCheckin = new Set(checkinHoy.tareas.map(t => t.idTarea));
            backlog = backlog.filter(t => !tareasEnCheckin.has(t.idTarea));
        }

        return {
            checkinHoy,
            tareasSugeridas: tareas,
            agendaRecurrente,
            backlog: backlog || [],
            bloqueosActivos: [],
            bloqueosMeCulpan: []
        };
    }

    async checkinUpsert(dto: CheckinUpsertDto, carnet: string) {
        return await clarityRepo.checkinUpsert({
            carnet: dto.usuarioCarnet || carnet,
            fecha: dto.fecha ? new Date(dto.fecha) : new Date(),
            entregableTexto: dto.entregableTexto,
            nota: dto.nota || null,
            linkEvidencia: dto.linkEvidencia || null,
            estadoAnimo: dto.estadoAnimo || null,
            idNodo: dto.idNodo || null,
            entrego: dto.entrego,
            avanzo: dto.avanzo,
            extras: dto.extras,
            prioridad1: dto.prioridad1,
            prioridad2: dto.prioridad2,
            prioridad3: dto.prioridad3
        });
    }

    async tareaCrearRapida(dto: TareaCrearRapidaDto) {
        // Resolve carnet before creating
        const carnet = dto.idUsuario ? await this.visibilidadService.obtenerCarnetPorId(dto.idUsuario) : null;

        const idTarea = await tasksRepo.crearTarea({
            titulo: dto.titulo,
            descripcion: dto.descripcion,
            idCreador: dto.idUsuario,
            creadorCarnet: carnet || undefined, // PASS CARNET HERE
            idProyecto: dto.idProyecto || undefined,
            prioridad: dto.prioridad,
            esfuerzo: dto.esfuerzo,
            tipo: dto.tipo,
            fechaInicioPlanificada: dto.fechaInicioPlanificada ? new Date(dto.fechaInicioPlanificada) : undefined,
            fechaObjetivo: dto.fechaObjetivo ? new Date(dto.fechaObjetivo) : undefined,
            comportamiento: dto.comportamiento,
            idResponsable: dto.idResponsable,
            idTareaPadre: dto.idTareaPadre
        });




        // NOTIFICACIÓN: Si se asignó a otra persona
        if (dto.idResponsable && dto.idResponsable !== dto.idUsuario) {
            this.enviarNotificacionAsignacion(idTarea, dto.idUsuario, dto.idResponsable, dto.titulo, dto.descripcion);
        }

        return await planningRepo.obtenerTareaPorId(idTarea);

    }

    async crearTareaMasiva(dto: TareaMasivaDto, idCreador: number) {
        const createdIds: number[] = [];

        for (const idTarget of dto.idUsuarios) {
            const canManage = await this.canManageUser(idCreador, idTarget);
            if (!canManage) continue;

            const idTarea = await tasksRepo.crearTarea({
                titulo: dto.tareaBase.titulo,
                descripcion: dto.tareaBase.descripcion,
                idCreador: idCreador,
                idProyecto: dto.tareaBase.idProyecto,
                prioridad: dto.tareaBase.prioridad,
                esfuerzo: dto.tareaBase.esfuerzo,
                tipo: dto.tareaBase.tipo,
                fechaInicioPlanificada: dto.tareaBase.fechaInicioPlanificada ? new Date(dto.tareaBase.fechaInicioPlanificada) : undefined,
                fechaObjetivo: dto.tareaBase.fechaObjetivo ? new Date(dto.tareaBase.fechaObjetivo) : undefined,
                comportamiento: dto.tareaBase.comportamiento,
                idResponsable: idTarget
            });
            createdIds.push(idTarea);

            // NOTIFICACIÓN (Individual por cada miembro)
            if (idTarget !== idCreador) {
                this.enviarNotificacionAsignacion(idTarea, idCreador, idTarget, dto.tareaBase.titulo, dto.tareaBase.descripcion);
            }
        }
        return { created: createdIds.length, ids: createdIds };
    }


    async getAgendaCompliance(userId: number, roles: string[], fechaStr?: string) {
        const carnet = await this.resolveCarnet(userId);
        const date = fechaStr ? fechaStr : new Date().toISOString();

        // 1. Obtener a quién puede ver este usuario
        let visibleCarnets: string[] = [];

        // Si es Admin, ve a todos (menos a inactivos)
        const isAdmin = roles.some(r => ['Admin', 'Administrador', 'SuperAdmin'].includes(r));

        if (isAdmin) {
            visibleCarnets = (await accesoRepo.listarEmpleadosActivos())
                .map(u => u.carnet)
                .filter(Boolean) as string[];
        } else {
            visibleCarnets = await this.visibilidadService.obtenerCarnetsVisibles(carnet);
        }

        // 2. Obtener reporte de hoy para esos usuarios
        return await clarityRepo.obtenerEquipoHoy(visibleCarnets, date);
    }

    async tareasMisTareas(carnet: string, estado?: string, idProyecto?: number, startDate?: string, endDate?: string, query?: string) {
        const start = startDate ? new Date(startDate) : undefined;
        const end = endDate ? new Date(endDate) : undefined;

        return await clarityRepo.getTareasUsuario(carnet, estado, idProyecto, start, end, query);
    }

    async tareasHistorico(carnet: string, dias: number) {
        return await clarityRepo.obtenerTareasHistorico(carnet, dias);
    }

    async tareaActualizar(idTarea: number, updates: any, idUsuario: number) {
        // 0. Obtener estado actual para auditoría y validación
        const tareaActual = await planningRepo.obtenerTareaPorId(idTarea);
        if (!tareaActual) throw new NotFoundException('Tarea no encontrada');

        // Verificar permisos
        const permiso = await this.planningService.checkEditPermission(idTarea, idUsuario);
        if (!permiso.puedeEditar) throw new ForbiddenException('No tienes permiso');

        // Extract special fields
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { alcance, comentario, motivoBloqueo, ...dbUpdates } = updates;

        // Map DTO fields to DB columns
        const mappedUpdates: any = {};

        // Mapeo explicito DTO -> DB
        if (dbUpdates.titulo) mappedUpdates.nombre = dbUpdates.titulo;
        if (dbUpdates.descripcion !== undefined) mappedUpdates.descripcion = dbUpdates.descripcion;
        if (dbUpdates.estado) mappedUpdates.estado = dbUpdates.estado;
        if (dbUpdates.prioridad) mappedUpdates.prioridad = dbUpdates.prioridad;
        if (dbUpdates.progreso !== undefined) mappedUpdates.porcentaje = dbUpdates.progreso;
        if (dbUpdates.linkEvidencia !== undefined) mappedUpdates.linkEvidencia = dbUpdates.linkEvidencia;

        // Campos opcionales que asumimos existen en p_Tareas o fallaran si no (pero son enviados por el front)
        if (dbUpdates.esfuerzo) mappedUpdates.esfuerzo = dbUpdates.esfuerzo;
        if (dbUpdates.tipo) mappedUpdates.tipo = dbUpdates.tipo;

        // Fechas
        if (dbUpdates.fechaObjetivo) {
            mappedUpdates.fechaObjetivo = typeof dbUpdates.fechaObjetivo === 'string'
                ? new Date(dbUpdates.fechaObjetivo)
                : dbUpdates.fechaObjetivo;
        }
        if (dbUpdates.fechaInicioPlanificada) {
            mappedUpdates.fechaInicioPlanificada = typeof dbUpdates.fechaInicioPlanificada === 'string'
                ? new Date(dbUpdates.fechaInicioPlanificada)
                : dbUpdates.fechaInicioPlanificada;
        }

        // Calculate human-readable diff for auditing
        const diff: any = {};
        for (const [key, newVal] of Object.entries(updates)) {
            const oldVal = (tareaActual as any)[key];
            if (newVal !== undefined && newVal !== oldVal) {
                // Formatting dates for better readability in logs
                if (newVal instanceof Date || (typeof newVal === 'string' && /^\d{4}-\d{2}-\d{2}/.test(newVal))) {
                    const oldStr = oldVal ? new Date(oldVal).toISOString().split('T')[0] : 'N/A';
                    const newStr = new Date(newVal).toISOString().split('T')[0];
                    if (oldStr !== newStr) diff[key] = { from: oldStr, to: newStr };
                } else {
                    diff[key] = { from: oldVal ?? 'N/A', to: newVal };
                }
            }
        }

        // V2: Actualizar usando Repo Unificado
        const updateParams: any = {
            titulo: mappedUpdates.nombre,
            descripcion: mappedUpdates.descripcion,
            estado: mappedUpdates.estado,
            prioridad: mappedUpdates.prioridad,
            progreso: mappedUpdates.porcentaje,
            fechaObjetivo: mappedUpdates.fechaObjetivo,
            fechaInicioPlanificada: mappedUpdates.fechaInicioPlanificada,
            linkEvidencia: mappedUpdates.linkEvidencia,
            requiereEvidencia: updates.requiereEvidencia, // nuevo campo
            idTareaPadre: updates.idTareaPadre,
            idResponsable: updates.idResponsable
        };

        // Execute Update
        if (Object.keys(updateParams).length > 0) {
            await tasksRepo.actualizarTarea(idTarea, updateParams);
        }

        // V3: Propagar cambios a la jerarquía (Roll-up)
        const padreCambio = updates.idTareaPadre !== undefined && updates.idTareaPadre !== tareaActual.idTareaPadre;
        const metricsCambio = updates.porcentaje !== undefined || updates.estado !== undefined;

        if (padreCambio) {
            // 1. Recalcular Viejo Padre (directamente, porque ya perdimos el link)
            if (tareaActual.idTareaPadre) {
                await tasksRepo.recalcularJerarquia(undefined, tareaActual.idTareaPadre);
            }
            // 2. Recalcular Nuevo Padre (via hijo, ahora ya está linkeado)
            if (updates.idTareaPadre) {
                await tasksRepo.recalcularJerarquia(idTarea);
            }
        } else if (metricsCambio && tareaActual.idTareaPadre) {
            // Solo métricas, mismo padre -> Rollup standard
            await tasksRepo.recalcularJerarquia(idTarea);
        }

        // Registrar en auditoría si hubo cambios
        if (Object.keys(diff).length > 0) {
            await this.auditService.log({
                accion: 'TAREA_ACTUALIZADA',
                recurso: 'Tarea',
                recursoId: String(idTarea),
                idUsuario,
                datosAnteriores: tareaActual,
                datosNuevos: { ...tareaActual, ...updateParams },
                detalles: { diff, source: 'Bitácora/Modal' }
            });
        }

        // Handle Bloqueo logic
        if (updates.estado === 'Bloqueada' && motivoBloqueo) {
            await clarityRepo.bloquearTarea({
                idTarea,
                idOrigenUsuario: idUsuario,
                motivo: motivoBloqueo,
                destinoTexto: 'Bloqueo registrado desde Bitácora'
            });
        }

        return await planningRepo.obtenerTareaPorId(idTarea);
    }

    async tareaEliminar(idTarea: number, carnet: string, motivo?: string, rolGlobal?: string) {
        if (rolGlobal === 'Admin' || rolGlobal === 'Administrador') {
            await clarityRepo.eliminarTareaAdmin(idTarea, motivo || 'Eliminación Admin');
        } else {
            await clarityRepo.eliminarTarea(idTarea, carnet, motivo);
        }
        return { success: true };
    }

    async tareaObtener(idTarea: number, idSolicitante?: number) {
        const tarea = await planningRepo.obtenerTareaPorId(idTarea);
        if (!tarea) throw new NotFoundException('Tarea no encontrada');

        // Validar acceso si se proporciona idSolicitante
        if (idSolicitante) {
            await this.planningService.verificarAccesoTarea(idSolicitante, tarea);
        }

        return tarea;
    }

    // Alias para compatibilidad interna
    async tareasUsuario(carnet: string) {
        return this.tareasMisTareas(carnet);
    }

    async equipoMiembro(idLider: number, idMiembro: number) {
        const tieneAcceso = await this.visibilidadService.verificarAccesoPorId(idLider, idMiembro);
        // if (!tieneAcceso) throw new InsufficientPermissionsException('ver detalles de este miembro'); 

        const carnetMiembro = await this.visibilidadService.obtenerCarnetPorId(idMiembro);
        if (!carnetMiembro) throw new NotFoundException('Miembro no encontrado');

        const tasks = await clarityRepo.getTareasUsuario(carnetMiembro);
        const pendientes = tasks.filter(t => ['Pendiente', 'EnCurso'].includes(t.estado)).length;
        const completadas = tasks.filter(t => t.estado === 'Hecha').length;
        const usuario = await authRepo.obtenerUsuarioPorId(idMiembro);

        return {
            usuario, // Ahora sí devolvemos el usuario real
            estadisticas: {
                pendientes,
                completadas,
                total: tasks.length
            },
            tareas: tasks
        };
    }

    // ===============================================
    // NUEVOS ENDPOINTS: Avance, Workload, AuditLogs
    // ===============================================

    async registrarAvance(idTarea: number, progreso: number, comentario: string | undefined, idUsuario: number) {
        // Obtener tarea actual para verificar estado anterior
        const tareaActual = await planningRepo.obtenerTareaPorId(idTarea);
        if (!tareaActual) throw new NotFoundException('Tarea no encontrada');

        const updates: any = { porcentaje: progreso };

        // Si es el primer avance (progreso anterior era 0 y ahora > 0), establecer fechaInicioReal
        if ((tareaActual.porcentaje === 0 || tareaActual.porcentaje === null) && progreso > 0) {
            updates.fechaInicioReal = new Date();
            updates.estado = 'EnCurso';
        }

        // Si llega a 100%, establecer fechaFinReal y estado Hecha
        if (progreso >= 100) {
            updates.fechaFinReal = new Date();
            updates.estado = 'Hecha';
            updates.porcentaje = 100;
        }

        await planningRepo.actualizarTarea(idTarea, updates);

        // Propagar al padre
        if (tareaActual.idTareaPadre) {
            await tasksRepo.recalcularJerarquia(idTarea);
        }

        // [2026-01-28] Persistir comentario como Avance real
        if (comentario) {
            await tasksRepo.crearAvance({
                idTarea,
                idUsuario,
                progreso: updates.porcentaje || progreso,
                comentario
            });
        }

        // Registrar en auditoría
        await this.auditService.log({
            accion: 'TAREA_ACTUALIZADA',
            recurso: 'Tarea',
            recursoId: String(idTarea),
            idUsuario,
            detalles: { progreso, comentario, tipo: 'Avance' }
        });

        return await planningRepo.obtenerTareaPorId(idTarea);
    }

    async eliminarAvance(idLog: number, idUsuario: number) {
        // TODO: Validate ownership if critical
        await tasksRepo.eliminarAvance(idLog);
        return { success: true };
    }

    /**
     * Motor de Inteligencia de Jerarquía (Roll-up)
     * Recalcula progreso y estado del padre basado en sus hijos de forma recursiva.
     */
    // Método privado recalcularJerarquia eliminado en favor de lógica en BD (tasksRepo.recalcularJerarquia)
    async getWorkload(carnet: string) {
        try {
            // 2. Obtener TODOS los empleados que este usuario tiene permiso de ver
            const allUsersList = await this.visibilidadService.obtenerEmpleadosVisibles(carnet);
            const allCarnets = allUsersList.map(u => u.carnet).filter(Boolean);
            if (allCarnets.length === 0) return { users: [], tasks: [] };

            // 4. Obtener tareas usando CARNETS
            const allTasks = await clarityRepo.obtenerTareasMultiplesUsuarios(allCarnets);

            // 5. Formatear usuarios para la vista de Workload
            const formattedUsers = allUsersList.map((u: any) => ({
                idUsuario: u.idUsuario,
                nombre: u.nombre || u.nombreCompleto || 'Sin Nombre',
                correo: u.correo,
                carnet: u.carnet,
                rol: { nombre: u.subgerencia || u.gerencia || u.cargo || 'General' },
                tareasActivas: allTasks.filter((t: any) =>
                    t.usuarioCarnet === u.carnet &&
                    ['Pendiente', 'EnCurso', 'Bloqueada'].includes(t.estado)
                ).length,
                tareasCompletadas: allTasks.filter((t: any) =>
                    t.usuarioCarnet === u.carnet &&
                    t.estado === 'Hecha'
                ).length
            }));

            return {
                users: formattedUsers,
                tasks: allTasks
            };
        } catch (error) {
            console.error('[TasksService] Error getting workload:', error);
            return { users: [], tasks: [] };
        }
    }

    async getAuditLogsByTask(idTarea: number) {
        return await this.auditService.getHistorialEntidad('Tarea', String(idTarea));
    }

    async getEquipoActividad(carnet: string, page: number = 1, limit: number = 50, query?: string) {
        return await this.auditService.listarAuditPorCarnet(carnet, page, limit, query);
    }

    async getAuditLogById(id: number) {
        return await this.auditService.getAuditLogDetalle(id);
    }

    async tareaRevalidar(idTarea: number, body: TareaRevalidarDto, idUsuario: number) {
        const { accion, idUsuarioOtro, razon } = body;

        const tarea = await planningRepo.obtenerTareaPorId(idTarea);
        if (!tarea) throw new NotFoundException('Tarea no encontrada');

        switch (accion) {
            case 'Sigue':
                // Actualizar fecha objetivo a hoy para tareas arrastradas
                await planningRepo.actualizarTarea(idTarea, { fechaObjetivo: new Date() });
                break;

            case 'HechaPorOtro':
                await planningRepo.actualizarTarea(idTarea, {
                    estado: 'Hecha',
                    fechaCompletado: new Date(),
                    porcentaje: 100
                });
                if (idUsuarioOtro) {
                    await clarityRepo.asignarUsuarioTarea(idTarea, idUsuarioOtro, 'Ejecutor');
                }
                break;

            case 'NoAplica':
                await planningRepo.actualizarTarea(idTarea, { estado: 'Descartada' });
                break;

            case 'Reasignar':
                if (!idUsuarioOtro) throw new BadRequestException('Se requiere idUsuarioOtro para reasignar');
                await clarityRepo.reasignarResponsable(idTarea, idUsuarioOtro);
                break;
        }

        // Auditoría
        await this.auditService.log({
            accion: 'TAREA_REVALIDADA',
            recurso: 'Tarea',
            recursoId: String(idTarea),
            idUsuario,
            detalles: { accion, idUsuarioOtro, razon }
        });

        return { success: true };
    }

    // ===============================================
    // PROYECTOS (Restaurado)
    // ===============================================

    async proyectoListar(idUsuario: number, filter?: ProyectoFilterDto) {
        // 1. Obtener info del usuario
        const usuario = await authRepo.obtenerUsuarioPorId(idUsuario);
        if (!usuario) return { items: [], total: 0, page: 1, lastPage: 1 };

        // 2. Si es Admin, ve todos los proyectos (con filtros)
        if (['Admin', 'Administrador', 'SuperAdmin'].includes(usuario.rolGlobal || '')) {
            const projects = await planningRepo.obtenerTodosProyectos(filter);
            return { items: projects, total: projects.length, page: 1, lastPage: 1 };
        }

        // 3. Para usuarios normales, filtrar por visibilidad y parámetros extra
        const projects = await planningRepo.obtenerProyectosVisibles(idUsuario, usuario, filter);
        return {
            items: projects,
            total: projects.length,
            page: 1,
            lastPage: 1
        };
    }

    private async assertCanManageProject(idProyecto: number, idUsuario: number) {
        const proyecto = await planningRepo.obtenerProyectoPorId(idProyecto);
        if (!proyecto) throw new NotFoundException('Proyecto no encontrado');

        // Admin puede todo
        const user = await authRepo.obtenerUsuarioPorId(idUsuario);
        if (user?.rolGlobal === 'Admin' || user?.rolGlobal === 'Administrador' || user?.idRol === 1) return;

        // Creador puede
        if (proyecto.idCreador === idUsuario) return;

        throw new ForbiddenException('No tienes permiso para gestionar este proyecto');
    }

    async proyectoCrear(dto: ProyectoCrearDto, idUsuario: number) {
        const carnet = await this.resolveCarnet(idUsuario);
        const idProyecto = await planningRepo.crearProyecto({
            nombre: dto.nombre,
            descripcion: dto.descripcion,
            idNodoDuenio: dto.idNodoDuenio,
            area: dto.area,
            subgerencia: dto.subgerencia,
            gerencia: dto.gerencia,
            fechaInicio: dto.fechaInicio ? new Date(dto.fechaInicio) : undefined,
            fechaFin: dto.fechaFin ? new Date(dto.fechaFin) : undefined,
            idCreador: idUsuario,
            creadorCarnet: carnet,
            responsableCarnet: dto.responsableCarnet,
            tipo: dto.tipo
        });
        return await planningRepo.obtenerProyectoPorId(idProyecto);
    }

    async proyectoClonar(idOriginal: number, nuevoNombre: string, idUsuario: number) {
        // 1. Get original project
        const original = await planningRepo.obtenerProyectoPorId(idOriginal);
        if (!original) throw new NotFoundException('Proyecto original no encontrado');

        // 2. Create new project (Clone metadata)
        const carnet = await this.resolveCarnet(idUsuario);
        const idNuevo = await planningRepo.crearProyecto({
            nombre: nuevoNombre,
            descripcion: original.descripcion || undefined,
            idNodoDuenio: original.idNodoDuenio || undefined,
            area: original.area || undefined,
            subgerencia: original.subgerencia || undefined,
            gerencia: original.gerencia || undefined,
            fechaInicio: undefined,
            fechaFin: undefined,
            idCreador: idUsuario,
            tipo: original.tipo || undefined
        });

        if (carnet) {
            await planningRepo.actualizarDatosProyecto(idNuevo, { creadorCarnet: carnet } as any);
        }

        // 3. Get tasks
        const tareas = await clarityRepo.obtenerTareasPorProyecto(idOriginal);

        // 4. Clone tasks (Resetting status and assignees)
        for (const t of tareas) {
            await tasksRepo.crearTarea({
                titulo: t.titulo,
                descripcion: t.descripcion,
                idCreador: idUsuario,
                idProyecto: idNuevo,
                prioridad: t.prioridad,
                esfuerzo: t.esfuerzo,
                tipo: t.tipo || 'Administrativa',
                // Reset dates
                fechaInicioPlanificada: undefined,
                fechaObjetivo: undefined,
                // Reset status
                estado: 'Pendiente',
                // NO ASSIGNEE
                idResponsable: undefined,
                comportamiento: t.comportamiento
            });
        }

        return await planningRepo.obtenerProyectoPorId(idNuevo);
    }

    async proyectoObtener(id: number) {
        return await planningRepo.obtenerProyectoPorId(id);
    }

    async proyectoActualizar(id: number, dto: Partial<ProyectoCrearDto>, idUsuario: number) {
        await this.assertCanManageProject(id, idUsuario);
        const proyectoActual = await planningRepo.obtenerProyectoPorId(id);
        if (!proyectoActual) throw new NotFoundException('Proyecto no encontrado');

        const updates: any = { ...dto };
        if (dto.fechaInicio) updates.fechaInicio = new Date(dto.fechaInicio);
        if (dto.fechaFin) updates.fechaFin = new Date(dto.fechaFin);

        await planningRepo.actualizarDatosProyecto(id, updates);

        // Auditoría
        await this.auditService.log({
            accion: 'PROYECTO_ACTUALIZADO',
            recurso: 'Proyecto',
            recursoId: String(id),
            idUsuario,
            datosAnteriores: proyectoActual,
            datosNuevos: { ...proyectoActual, ...updates }
        });

        return await planningRepo.obtenerProyectoPorId(id);
    }

    async proyectoEnllavar(id: number, enllavado: boolean, idUsuario: number) {
        await this.assertCanManageProject(id, idUsuario);
        await planningRepo.actualizarDatosProyecto(id, { requiereAprobacion: enllavado });
        return { success: true };
    }

    async proyectoEliminar(id: number, idUsuario: number) {
        await this.assertCanManageProject(id, idUsuario);
        await planningRepo.eliminarProyecto(id);
        return { success: true };
    }

    async confirmarProyecto(id: number, idUsuario: number) {
        await this.assertCanManageProject(id, idUsuario);
        // Logic to confirm project plan (update status)
        await planningRepo.actualizarDatosProyecto(id, { estado: 'Confirmado' });
        return { success: true };
    }

    async getSolicitudesPendientes(idUsuario: number) {
        return await this.planningService.getSolicitudesPendientes(idUsuario);
    }
    async resolverSolicitud(id: number, accion: string, idUsuario: number, comentario?: string) {
        return await this.planningService.resolverSolicitud(idUsuario, id, accion as 'Aprobar' | 'Rechazar', comentario);
    }

    async tareasDeProyecto(idProyecto: number, idUsuario: number) {
        const tareas = await clarityRepo.obtenerTareasPorProyecto(idProyecto);

        // Merge with Pending Requests counts
        try {
            const requests = await planningRepo.obtenerSolicitudesPendientesPorProyecto(idProyecto);
            const reqMap = new Map<number, number>();
            requests.forEach((r: any) => reqMap.set(r.idTarea, r.total));

            return tareas.map((t: any) => ({
                ...t,
                pendingRequests: reqMap.get(t.idTarea) || 0
            }));
        } catch (e) {
            console.warn('Error fetching pending requests for project tasks', e);
            return tareas;
        }
    }

    async getEquipoBacklog(idUsuarioLider: number) {
        try {
            const carnet = await this.visibilidadService.obtenerCarnetPorId(idUsuarioLider);
            if (!carnet) return [];

            const equipo = await this.visibilidadService.obtenerCarnetsVisibles(carnet);
            const str = equipo.join(',');

            // Backlog: Tareas activas, pendientes/encurso, cuya fechaObjetivo < Hoy O es NULL
            return await clarityRepo.ejecutarQuery(`
                SELECT t.idTarea, t.nombre, t.fechaObjetivo, t.prioridad, t.estado,
                       u.nombre as responsable, u.carnet
                FROM p_Tareas t
                INNER JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea
                INNER JOIN p_Usuarios u ON ta.idUsuario = u.idUsuario
                WHERE u.carnet IN (SELECT value FROM STRING_SPLIT(@list, ','))
                  AND t.activo = 1
                  AND t.estado IN ('Pendiente', 'EnCurso')
                  AND (t.fechaObjetivo IS NULL OR t.fechaObjetivo < CAST(GETDATE() AS DATE))
                ORDER BY t.fechaObjetivo ASC
            `, { list: { valor: str, tipo: NVarChar } });
        } catch (e) { return []; }
    }

    async getBloqueosUsuario(idUsuarioTarget: number) {
        return await clarityRepo.ejecutarQuery(`
             SELECT b.*, 
                   u1.nombre as origenNombre, 
                   u2.nombre as destinoNombre,
                   t.nombre as tareaNombre
            FROM p_Bloqueos b
            LEFT JOIN p_Usuarios u1 ON b.idOrigenUsuario = u1.idUsuario
            LEFT JOIN p_Usuarios u2 ON b.idDestinoUsuario = u2.idUsuario
            LEFT JOIN p_Tareas t ON b.idTarea = t.idTarea
            WHERE (b.idOrigenUsuario = @id OR b.idDestinoUsuario = @id)
              AND b.estado = 'Activo'
        `, { id: { valor: idUsuarioTarget, tipo: Int } });
    }

    // KPI Dashboard (Carnet-First)
    async getDashboardKPIs(carnet: string) {
        try {
            return await clarityRepo.obtenerKpisDashboard(carnet);
        } catch (error) {
            console.error(`[TasksService] Error fetching KPIs for carnet ${carnet}:`, error);
            return {
                resumen: { total: 0, hechas: 0, pendientes: 0, bloqueadas: 0, promedioAvance: 0 },
                proyectos: []
            };
        }
    }

    // Equipo Hoy (Optimizado)
    async getEquipoHoy(carnetLider: string, fecha: string) {
        try {
            // 1. Obtener carnets de miembros visibles via VisibilidadService (Ya optimizado para Carnet)
            const visibleMembers = await this.visibilidadService.obtenerCarnetsVisibles(carnetLider);

            // 2. Obtener reporte de hoy para esos carnets directamente
            return await clarityRepo.obtenerEquipoHoy(visibleMembers, fecha);
        } catch (error) {
            console.error(`[TasksService] Error fetching team snapshot for ${carnetLider} at ${fecha}:`, error);
            return { miembros: [], resumenAnimo: { feliz: 0, neutral: 0, triste: 0, promedio: 0 } };
        }
    }

    // Equipo Informe (NUEVO API Separado)
    async getEquipoInform(carnetLider: string, fecha: string) {
        try {
            const visibleMembers = await this.visibilidadService.obtenerCarnetsVisibles(carnetLider);
            return await clarityRepo.obtenerEquipoInforme(visibleMembers, fecha);
        } catch (error) {
            console.error(`[TasksService] Error fetching team inform for ${carnetLider} at ${fecha}:`, error);
            return { miembros: [], resumenAnimo: { feliz: 0, neutral: 0, triste: 0, promedio: 0 } };
        }
    }
    async getEquipoBloqueos(idUsuarioLider: number, fecha: string) {
        try {
            // 1. Obtener carnet para visibilidad
            const user = await authRepo.obtenerUsuarioPorId(idUsuarioLider);
            if (!user || !user.activo) return [];

            // 2. Obtener lista de usuarios visibles
            let visibleUsers: any[] = [];

            if (user.carnet) {
                visibleUsers = await this.visibilidadService.obtenerEmpleadosVisibles(user.carnet);
            } else {
                // Fallback para usuarios sin carnet (aunque debería tener) - solo ve sus propios bloqueos
                visibleUsers = [user];
            }

            // 3. IDs de usuarios visibles
            const ids = visibleUsers.map(u => u.idUsuario).join(',');

            // 4. Query bloqueos
            return await clarityRepo.ejecutarQuery(`
                SELECT b.*, 
                       u1.nombre as origenNombre, 
                       u2.nombre as destinoNombre,
                       t.nombre as tareaNombre,
                       t.idProyecto,
                       p.nombre as proyectoNombre
                FROM p_Bloqueos b
                LEFT JOIN p_Usuarios u1 ON b.idOrigenUsuario = u1.idUsuario
                LEFT JOIN p_Usuarios u2 ON b.idDestinoUsuario = u2.idUsuario
                LEFT JOIN p_Tareas t ON b.idTarea = t.idTarea
                LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
                WHERE b.estado = 'Activo'
                  AND (b.idOrigenUsuario IN (${ids}) OR b.idDestinoUsuario IN (${ids}))
                ORDER BY b.creadoEn DESC
            `);
        } catch (e) { return []; }
    }



    // ===============================================
    // BLOQUEOS RE-IMPLEMENTACIÓN
    // ===============================================

    async bloqueoCrear(dto: BloqueoCrearDto) {
        return await clarityRepo.bloquearTarea(dto);
    }

    async bloqueoResolver(idBloqueo: number, body: any, carnetResolver: string) {
        await clarityRepo.resolverBloqueo(idBloqueo, body.solucion || 'Resuelto manualmente');
        return { success: true };
    }

    // ==========================================
    // NOTAS
    // ==========================================

    async notasListar(carnet: string) {
        const notas = await clarityRepo.obtenerNotasUsuario(carnet);
        // Map to frontend format
        return notas.map((n: any) => ({
            id: n.idNota.toString(),
            title: n.titulo,
            content: n.contenido,
            date: n.fechaModificacion || n.fechaCreacion,
            status: 'saved',
            projectId: n.idProyecto // If managed in future
        }));
    }

    async notaCrear(carnet: string, title: string, content: string) {
        await clarityRepo.crearNota({
            carnet,
            titulo: title,
            content
        });
        return { success: true };
    }

    async notaActualizar(idNota: number, title: string, content: string) {
        await clarityRepo.actualizarNota(idNota, { titulo: title, content });
        return { success: true };
    }

    async notaEliminar(idNota: number) {
        await clarityRepo.eliminarNota(idNota);
        return { success: true };
    }

    private async enviarNotificacionAsignacion(idTarea: number, idCreador: number, idDestino: number, titulo: string, descripcion?: string) {
        try {
            // Obtener nombre del creador
            const creador = await authRepo.obtenerUsuarioPorId(idCreador);
            const nombreCreador = creador?.nombre || 'Alguien';

            // Obtener tokens del destino
            const tokens = await this.notificationService.getTokensForUser(idDestino);
            if (!tokens || tokens.length === 0) return;

            // Enviar Push
            const body = descripcion ? `${descripcion.substring(0, 50)}${descripcion.length > 50 ? '...' : ''}` : 'Nueva tarea asignada';

            await this.notificationService.sendPushToUser(
                tokens,
                `📝 ${nombreCreador} te asignó: ${titulo}`,
                body,
                {
                    type: 'ASSIGNMENT',
                    taskId: idTarea,
                    creatorId: idCreador
                }
            );
        } catch (error) {
            console.error('[TasksService] Error enviando notificacion:', error);
        }
    }
}




