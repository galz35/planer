import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import * as planningRepo from './planning.repo';
import * as authRepo from '../auth/auth.repo';
import * as avanceMensualRepo from './avance-mensual.repo';
import * as grupoRepo from './grupo.repo';
import { AuditService } from '../common/audit.service';
import { VisibilidadService } from '../acceso/visibilidad.service';

@Injectable()
export class PlanningService {
    constructor(
        private auditService: AuditService,
        private visibilidadService: VisibilidadService,
    ) { }

    /**
     * Helper para obtener TODOS los IDs de nodos subordinados recursivamente
     * Mantiene la lógica iterativa original pero usa queries SQL directas
     */
    private async getRecursiveManagedNodeIds(managerId: number): Promise<number[]> {
        // 1. Obtener nodos donde soy Lider directo
        const myLedNodes = await planningRepo.obtenerNodosLiderados(managerId);

        if (myLedNodes.length === 0) return [];
        let nodeIds = myLedNodes.map(n => n.idNodo);

        // 2. Recursividad: Encontrar hijos de estos nodos
        let currentLevelIds = [...nodeIds];
        const allNodeIds = new Set(nodeIds);

        while (currentLevelIds.length > 0) {
            const children = await planningRepo.obtenerHijosDeNodos(currentLevelIds);

            if (children.length === 0) break;

            const childIds = children.map(c => c.idNodo);
            // Evitar ciclos infinitos
            const newIds = childIds.filter(id => !allNodeIds.has(id));

            if (newIds.length === 0) break;

            newIds.forEach(id => allNodeIds.add(id));
            currentLevelIds = newIds;
        }

        return Array.from(allNodeIds);
    }

    /**
     * Evalúa si un usuario puede editar una tarea directamente o requiere aprobación.
     */
    async checkEditPermission(idTarea: number, idUsuario: number): Promise<{
        puedeEditar: boolean,
        requiereAprobacion: boolean,
        tipoProyecto: string
    }> {
        // Obtener tarea con datos relacionados (proyecto, plan)
        const tarea = await planningRepo.obtenerTareaPorId(idTarea);

        if (!tarea) throw new NotFoundException('Tarea no encontrada');

        // Lógica de Bloqueo por Plan de Trabajo
        // NOTA: Deshabilitado temporalmente - tabla p_Tareas no tiene columna idPlan
        // TODO: Agregar idPlan a p_Tareas si se necesita esta funcionalidad
        /*
        if (tarea.idPlan) {
            if (tarea.planEstado === 'Confirmado' || tarea.planEstado === 'Cerrado') {
                const usuario = await authRepo.obtenerUsuarioPorId(idUsuario);
                if (['Admin', 'Administrador', 'SuperAdmin'].includes(usuario?.rolGlobal || '')) {
                    return { puedeEditar: true, requiereAprobacion: false, tipoProyecto: tarea.proyectoTipo || 'Plan' };
                }
                if (tarea.planIdUsuario === idUsuario) {
                    return { puedeEditar: true, requiereAprobacion: true, tipoProyecto: tarea.proyectoTipo || 'Plan' };
                }
                if (tarea.planIdCreador === idUsuario) {
                    return { puedeEditar: true, requiereAprobacion: false, tipoProyecto: tarea.proyectoTipo || 'Plan' };
                }
                const esSuperior = await this.visibilidadService.verificarAccesoPorId(idUsuario, tarea.planIdUsuario!);
                if (esSuperior) {
                    return { puedeEditar: true, requiereAprobacion: false, tipoProyecto: tarea.proyectoTipo || 'Plan' };
                }
            }
        }
        */

        // Si no tiene proyecto, es tarea personal -> Libre
        if (!tarea.idProyecto) {
            return { puedeEditar: true, requiereAprobacion: false, tipoProyecto: 'Personal' };
        }

        // Regla: Proyectos Estratégicos requieren aprobación
        if (tarea.proyectoTipo === 'Estrategico' || tarea.proyectoRequiereAprobacion) {
            const usuario = await authRepo.obtenerUsuarioPorId(idUsuario);
            if (['Admin', 'Administrador', 'SuperAdmin'].includes(usuario?.rolGlobal || '')) {
                return { puedeEditar: true, requiereAprobacion: false, tipoProyecto: tarea.proyectoTipo || 'Estrategico' };
            }

            return { puedeEditar: true, requiereAprobacion: true, tipoProyecto: tarea.proyectoTipo || 'Estrategico' };
        }

        // Operativo / Táctico -> Libre
        return { puedeEditar: true, requiereAprobacion: false, tipoProyecto: tarea.proyectoTipo || 'General' };
    }

    /**
     * Crea una solicitud de cambio para una tarea estratégica.
     */
    async solicitarCambio(
        idUsuario: number,
        idTarea: number,
        campo: string,
        valorNuevo: string,
        motivo: string
    ) {
        const tarea = await planningRepo.obtenerTareaPorId(idTarea);
        if (!tarea) throw new NotFoundException('Tarea no encontrada');

        // Obtener valor anterior de forma dinámica
        const valorAnterior = (tarea as any)[campo] ? String((tarea as any)[campo]) : '';

        const user = await authRepo.obtenerUsuarioPorId(idUsuario);

        return await planningRepo.crearSolicitudCambio({
            idTarea,
            idUsuarioSolicitante: idUsuario,
            carnetSolicitante: user?.carnet || null,
            campoAfectado: campo,
            valorAnterior,
            valorNuevo: String(valorNuevo), // Asegurar string
            motivo,
            estado: 'Pendiente',
            fechaSolicitud: new Date()
        });
    }

    /**
     * Obtiene solicitudes pendientes
     */
    async getSolicitudesPendientes(idUsuario: number) {
        const user = await authRepo.obtenerUsuarioPorId(idUsuario);
        if (!user) return [];

        if (['Admin', 'Administrador', 'SuperAdmin'].includes(user.rolGlobal || '')) {
            return await planningRepo.obtenerSolicitudesPendientes();
        }

        // Si es líder, ver solicitudes de su equipo
        if (user.carnet) {
            const team = await planningRepo.obtenerEquipoDirecto(user.carnet);
            // Filtrar usuarios que tienen carnet válido
            const teamCarnets = team.map(u => u.carnet).filter(c => c);
            if (teamCarnets.length > 0) {
                return await planningRepo.obtenerSolicitudesPorCarnets(teamCarnets);
            }
        }

        return [];
    }

    /**
     * Resuelve solicitud de cambio (Aprobar/Rechazar)
     */
    async resolverSolicitud(idUsuarioResolutor: number, idSolicitud: number, accion: 'Aprobar' | 'Rechazar', comentario?: string) {
        const user = await authRepo.obtenerUsuarioPorId(idUsuarioResolutor);
        // Validar permisos (simple check de admin por ahora)
        if (!['Admin', 'Administrador', 'SuperAdmin'].includes(user?.rolGlobal || '')) {
            // En realidad debería chequear si es Jefe del solicitante
            // throw new ForbiddenException('No tienes permisos para resolver solicitudes');
        }

        // Obtener la solicitud
        // TODO: Implementar obtenerSolicitudPorId en repo si hace falta.
        // Asumimos que existe y procedemos.

        if (accion === 'Rechazar') {
            await planningRepo.actualizarEstadoSolicitud(idSolicitud, 'Rechazado', comentario || 'Rechazado por superior', idUsuarioResolutor);
            return { mensaje: 'Solicitud rechazada' };
        }

        // Si es Aprobar, aplicar el cambio
        const solicitud = await planningRepo.obtenerSolicitudPorId(idSolicitud);
        if (!solicitud) throw new NotFoundException('Solicitud no encontrada');

        // Mapear campos si vienen con nombres del DTO
        let campoDb = solicitud.campoAfectado;
        if (campoDb === 'titulo') campoDb = 'nombre';
        if (campoDb === 'progreso') campoDb = 'porcentaje';
        if (campoDb === 'fechaObjetivo' || campoDb === 'fechaInicioPlanificada') {
            // Asegurar que sea una fecha válida para SQL
            if (solicitud.valorNuevo) {
                // ...
            }
        }

        // Aplicar el cambio a la tarea
        await planningRepo.actualizarTarea(solicitud.idTarea, { [campoDb]: solicitud.valorNuevo });

        // Marcar solicitud como aprobada
        await planningRepo.actualizarEstadoSolicitud(idSolicitud, 'Aprobado', comentario || 'Aprobado por superior', idUsuarioResolutor);

        // Registrar auditoría (opcional)
        await this.auditService.log({
            accion: 'CAMBIO_APROBADO',
            recurso: 'Tarea',
            recursoId: String(solicitud.idTarea),
            idUsuario: idUsuarioResolutor,
            detalles: { idSolicitud, campo: campoDb, valor: solicitud.valorNuevo }
        });

        return { mensaje: 'Solicitud aprobada y cambio aplicado correctamente' };
    }

    async updateTareaOperativa(idUsuario: number, idTarea: number, updates: any) {
        const permiso = await this.checkEditPermission(idTarea, idUsuario);

        if (!permiso.puedeEditar) {
            throw new ForbiddenException('No tienes permiso para editar esta tarea');
        }

        if (permiso.requiereAprobacion) {
            // Si requiere aprobación, NO se edita directo, se pide cambio (frontend debe manejar esto)
            throw new BadRequestException('Esta tarea requiere aprobación para cambios. Usa request-change.');
        }

        // Guardar logs de auditoría (opcional, omitido por brevedad en migración)

        await planningRepo.actualizarTarea(idTarea, updates);
        return { exito: true };
    }

    // ==========================================
    // PLANES DE TRABAJO
    // ==========================================

    async getPlans(idSolicitante: number, idObjetivo: number, mes: number, anio: number) {
        // Verificar visibilidad
        if (idSolicitante !== idObjetivo) {
            const acceso = await this.visibilidadService.verificarAccesoPorId(idSolicitante, idObjetivo);
            if (!acceso) {
                // Permitir si es Admin
                const solicitante = await authRepo.obtenerUsuarioPorId(idSolicitante);
                if (!['Admin', 'Administrador'].includes(solicitante?.rolGlobal || '')) {
                    throw new ForbiddenException('No tienes acceso a ver los planes de este usuario');
                }
            }
        }

        return await planningRepo.obtenerPlanes(idObjetivo, mes, anio);
    }

    async upsertPlan(idUsuario: number, body: any) {
        const { idUsuario: targetUserId, mes, anio, objetivos, estado } = body;

        // Si estoy editando el plan de otro, debo ser su jefe
        if (idUsuario !== targetUserId) {
            // Validar jerarquía...
        }

        return await planningRepo.upsertPlan({
            idUsuario: targetUserId,
            mes,
            anio,
            objetivos,
            estado: estado || 'Borrador',
            idCreador: idUsuario
        });
    }

    // ==========================================
    // DASHBOARD & TEAM
    // ==========================================

    async getMyTeam(idUsuario: number) {
        const user = await authRepo.obtenerUsuarioPorId(idUsuario);
        if (!user || !user.carnet) return [];
        // Usar visibilidadService para obtener TODOS los empleados visibles (Jerarquía + Área)
        // Esto iguala la lista de personas con la de Planning/Carga (Workload)
        return await this.visibilidadService.obtenerEmpleadosVisibles(user.carnet);
    }

    async getMyProjects(idUsuario: number) {
        return await planningRepo.obtenerProyectosPorUsuario(idUsuario);
    }

    // ==========================================
    // Métodos pendientes de implementación completa
    // ==========================================

    async cloneTask(idUsuario: number, idTarea: number) {
        return { message: "Not implemented in migration yet" };
    }

    async reassignTasks(idUsuario: number, from: number, to: number, tasks: number[]) {
        return { message: "Not implemented in migration yet" };
    }

    async getTaskHistory(idTarea: number) {
        return [];
    }

    async closePlan(idUsuario: number, idPlan: number) {
        // Logica de cerrar plan
        return { message: "Closed" };
    }

    // ==========================================
    // AVANCE MENSUAL (Solo Plan de Trabajo)
    // ==========================================

    async registrarAvanceMensual(
        idTarea: number,
        anio: number,
        mes: number,
        porcentajeMes: number,
        comentario: string | null,
        idUsuario: number
    ) {
        await avanceMensualRepo.upsertAvanceMensual(idTarea, anio, mes, porcentajeMes, comentario, idUsuario);

        // Log de auditoría
        await this.auditService.log({
            accion: 'TAREA_ACTUALIZADA',
            recurso: 'Tarea',
            recursoId: String(idTarea),
            idUsuario,
            detalles: { tipo: 'AvanceMensual', anio, mes, porcentajeMes }
        });

        return await avanceMensualRepo.obtenerHistorialMensual(idTarea);
    }

    async obtenerHistorialMensual(idTarea: number) {
        return await avanceMensualRepo.obtenerHistorialMensual(idTarea);
    }

    // ==========================================
    // GRUPOS / FASES (Solo Plan de Trabajo)
    // ==========================================

    async crearGrupo(idTarea: number, idUsuario: number) {
        await grupoRepo.crearGrupoInicial(idTarea);

        await this.auditService.log({
            accion: 'TAREA_ACTUALIZADA',
            recurso: 'Tarea',
            recursoId: String(idTarea),
            idUsuario,
            detalles: { tipo: 'CrearGrupo' }
        });

        return { idGrupo: idTarea, message: 'Grupo creado' };
    }

    async agregarFase(idGrupo: number, idTareaNueva: number, idUsuario: number) {
        await grupoRepo.agregarFase(idGrupo, idTareaNueva);

        await this.auditService.log({
            accion: 'TAREA_ACTUALIZADA',
            recurso: 'Tarea',
            recursoId: String(idTareaNueva),
            idUsuario,
            detalles: { tipo: 'AgregarFase', idGrupo }
        });

        return await grupoRepo.obtenerTareasGrupo(idGrupo);
    }

    async obtenerGrupo(idGrupo: number) {
        return await grupoRepo.obtenerTareasGrupo(idGrupo);
    }
}


