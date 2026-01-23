import { Injectable, InternalServerErrorException, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import * as clarityRepo from './clarity.repo';
import * as planningRepo from '../planning/planning.repo';
import * as authRepo from '../auth/auth.repo';
import { ResourceNotFoundException } from '../common/exceptions';
import { TareaCrearRapidaDto, CheckinUpsertDto, BloqueoCrearDto, TareaRevalidarDto } from './dto/clarity.dtos';
import { AuditService } from '../common/audit.service';
import { PlanningService } from '../planning/planning.service';
import { VisibilidadService } from '../acceso/visibilidad.service';
import { ProyectoFilterDto, ProyectoCrearDto } from './dto/clarity.dtos';


@Injectable()
export class TasksService {
    constructor(
        private planningService: PlanningService,
        private auditService: AuditService,
        private visibilidadService: VisibilidadService,
    ) { }

    // ===============================================
    // COMPATIBILIDAD CON CONTROLLER (Métodos mapeados)
    // ===============================================

    async canManageUser(managerId: number, subordinateId: number, requesterRole?: string): Promise<boolean> {
        // 1. Si es el mismo usuario, siempre puede
        if (managerId === subordinateId) return true;

        // 2. Si es Admin, siempre puede
        if (requesterRole === 'Admin' || requesterRole === 'Administrador') return true;

        // 3. Verificar visibilidad jerárquica
        const hasAccess = await this.visibilidadService.verificarAccesoPorId(managerId, subordinateId);

        if (!hasAccess) {
            console.warn(`[TasksService] Access Denied: Manager ${managerId} -> Subordinate ${subordinateId}`);
        }

        return hasAccess;
    }

    async crearSolicitudCambio(idUsuario: number, idTarea: number, campo: string, valorNuevo: string, motivo?: string) {
        return await this.planningService.solicitarCambio(idUsuario, idTarea, campo, valorNuevo, motivo || '');
    }

    async miDiaGet(idUsuario: number, fechaStr: string) {
        // Obtener Checkin
        // Obtener tareas para hoy (fechaObjetivo = hoy, o pendientes/encurso)
        // Obtener bloqueos activos

        const fecha = fechaStr ? new Date(fechaStr) : new Date();

        // Obtener check-in del día (si existe)
        const checkinHoy = await clarityRepo.obtenerCheckinPorFecha(idUsuario, fecha);

        // Obtener tareas reales del repo
        const tareas = await clarityRepo.obtenerMisTareas(idUsuario);

        // Mapear a la estructura que espera el frontend en clarity.service.ts
        return {
            checkinHoy,
            tareasSugeridas: tareas,
            backlog: [],
            bloqueosActivos: [],
            bloqueosMeCulpan: []
        };
    }

    async checkinUpsert(dto: CheckinUpsertDto) {
        return await clarityRepo.upsertCheckin({
            idUsuario: dto.idUsuario,
            fecha: dto.fecha ? new Date(dto.fecha) : new Date(),
            entregableTexto: dto.entregableTexto,
            nota: dto.nota || null,
            linkEvidencia: dto.linkEvidencia || null,
            estadoAnimo: dto.estadoAnimo || null,
            idNodo: dto.idNodo || null,
            entrego: dto.entrego,
            avanzo: dto.avanzo,
            extras: dto.extras
        });
    }

    async tareaCrearRapida(dto: TareaCrearRapidaDto) {
        // Implementación real mapeada arriba
        const idTarea = await clarityRepo.crearTarea({
            nombre: dto.titulo,
            descripcion: dto.descripcion,
            idCreador: dto.idUsuario,
            idProyecto: dto.idProyecto || null,
            estado: 'Pendiente',
            prioridad: dto.prioridad || 'Media',
            porcentaje: 0,
            orden: 0,
            ...({
                esfuerzo: dto.esfuerzo || 'M',
                tipo: dto.tipo || 'Administrativa',
                fechaInicioPlanificada: dto.fechaInicioPlanificada ? new Date(dto.fechaInicioPlanificada) : null,
                fechaObjetivo: dto.fechaObjetivo ? new Date(dto.fechaObjetivo) : null,
                comportamiento: dto.comportamiento
            } as any)
        });

        const idResponsable = dto.idResponsable || dto.idUsuario;
        if (idResponsable) {
            await clarityRepo.asignarUsuarioTarea(idTarea, idResponsable);
        }

        return await planningRepo.obtenerTareaPorId(idTarea);
    }

    async tareasMisTareas(idUsuario: number, estado?: string, idProyecto?: number) {
        let tareas = await clarityRepo.obtenerMisTareas(idUsuario);

        // Filtrado en memoria por ahora (idealmente en SQL pero para migración rápida OK)
        if (estado) tareas = tareas.filter(t => t.estado === estado);
        if (idProyecto) tareas = tareas.filter(t => t.idProyecto === Number(idProyecto));

        return tareas;
    }

    async tareasHistorico(carnet: string, dias: number) {
        return await clarityRepo.obtenerTareasHistorico(carnet, dias);
    }

    async tareaActualizar(idTarea: number, updates: any, idUsuario: number) {
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

        // Execute Update
        if (Object.keys(mappedUpdates).length > 0) {
            await planningRepo.actualizarTarea(idTarea, mappedUpdates);
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

    // Alias para compatibilidad interna
    async tareasUsuario(idUsuario: number) {
        return this.tareasMisTareas(idUsuario);
    }

    async equipoMiembro(idLider: number, idMiembro: number) {
        const tieneAcceso = await this.visibilidadService.verificarAccesoPorId(idLider, idMiembro);
        // if (!tieneAcceso) throw new InsufficientPermissionsException('ver detalles de este miembro'); 

        const tasks = await clarityRepo.obtenerMisTareas(idMiembro);
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

    async getWorkload(idUsuario: number) {
        // 1. Obtener información del usuario actual para saber su carnet
        const usuarioRoot = await authRepo.obtenerUsuarioPorId(idUsuario);
        if (!usuarioRoot || !usuarioRoot.carnet) return { users: [], tasks: [] };

        // 2. Obtener TODOS los empleados que este usuario tiene permiso de ver (Incluye Jerarquía + Permisos de Área)
        const allUsersList = await this.visibilidadService.obtenerEmpleadosVisibles(usuarioRoot.carnet);

        // 3. Consolidar lista de IDs de usuarios
        const allIds = allUsersList.map(u => u.idUsuario);

        // 4. Obtener tareas para todos esos usuarios en una sola query
        const allTasks = await clarityRepo.obtenerTareasMultiplesUsuarios(allIds);

        // 5. Formatear usuarios para la vista de Workload (Heatmap espera rol.nombre)
        const formattedUsers = allUsersList.map((u: any) => ({
            idUsuario: u.idUsuario,
            nombre: u.nombre || u.nombreCompleto || 'Sin Nombre',
            correo: u.correo,
            carnet: u.carnet,
            // Prioridad: Subgerencia -> Gerencia -> Cargo -> General
            rol: { nombre: u.subgerencia || u.gerencia || u.cargo || 'General' },
            tareasActivas: allTasks.filter(t =>
                t.asignados.some((a: any) => a.idUsuario === u.idUsuario) &&
                ['Pendiente', 'EnCurso', 'Bloqueada'].includes(t.estado)
            ).length,
            tareasCompletadas: allTasks.filter(t =>
                t.asignados.some((a: any) => a.idUsuario === u.idUsuario) &&
                t.estado === 'Hecha'
            ).length
        }));

        return {
            users: formattedUsers,
            tasks: allTasks
        };
    }

    async getAuditLogsByTask(idTarea: number) {
        return await this.auditService.getHistorialEntidad('Tarea', String(idTarea));
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

    async proyectoCrear(dto: ProyectoCrearDto, idUsuario: number) {
        const idProyecto = await planningRepo.crearProyecto({
            nombre: dto.nombre,
            descripcion: dto.descripcion,
            idNodoDuenio: dto.idNodoDuenio,
            area: dto.area,
            subgerencia: dto.subgerencia,
            gerencia: dto.gerencia,
            fechaInicio: dto.fechaInicio ? new Date(dto.fechaInicio) : undefined,
            fechaFin: dto.fechaFin ? new Date(dto.fechaFin) : undefined,
            idCreador: idUsuario
        });
        return await planningRepo.obtenerProyectoPorId(idProyecto);
    }

    async proyectoObtener(id: number) {
        return await planningRepo.obtenerProyectoPorId(id);
    }

    async proyectoActualizar(id: number, dto: Partial<ProyectoCrearDto>, idUsuario: number) {
        // TODO: Validar permisos (solo dueño o admin)
        const updates: any = { ...dto };
        if (dto.fechaInicio) updates.fechaInicio = new Date(dto.fechaInicio);
        if (dto.fechaFin) updates.fechaFin = new Date(dto.fechaFin);

        await planningRepo.actualizarDatosProyecto(id, updates);
        return await planningRepo.obtenerProyectoPorId(id);
    }

    async proyectoEnllavar(id: number, enllavado: boolean, idUsuario: number) {
        // TODO: Validar permisos
        await planningRepo.actualizarDatosProyecto(id, { requiereAprobacion: enllavado });
        return { success: true };
    }

    async proyectoEliminar(id: number, idUsuario: number) {
        // TODO: Validar permisos
        await planningRepo.eliminarProyecto(id);
        return { success: true };
    }

    async confirmarProyecto(id: number, idUsuario: number) {
        // Logic to confirm project plan (update status)
        await planningRepo.actualizarDatosProyecto(id, { estado: 'Confirmado' });
        return { success: true };
    }

    // Stub
    async getSolicitudesPendientes(idUsuario: number) { return []; }
    async resolverSolicitud(id: number, accion: string, idUsuario: number, comentario?: string) { return {}; }

    async tareasDeProyecto(idProyecto: number, idUsuario: number) {
        // Por ahora devolvemos todas las tareas del proyecto. 
        // En el futuro se puede filtrar por visibilidad segun idUsuario
        return await clarityRepo.obtenerTareasPorProyecto(idProyecto);
    }

    // KPI Dashboard
    async getDashboardKPIs(idUsuario: number) {
        try {
            return await clarityRepo.obtenerKpisDashboard(idUsuario);
        } catch (error) {
            console.error('Error fetching KPIs dashboard:', error);
            // Mock robusto para evitar que el front explote
            return {
                resumen: { total: 0, hechas: 0, pendientes: 0, bloqueadas: 0, promedioAvance: 0 },
                proyectos: []
            };
        }
    }

    // Equipo Hoy
    async getEquipoHoy(idUsuario: number, fecha: string) {
        try {
            // 1. Obtener carnet para visibilidad
            const user = await authRepo.obtenerUsuarioPorId(idUsuario);
            if (!user || !user.carnet) return { miembros: [], resumenAnimo: { feliz: 0, neutral: 0, triste: 0, promedio: 0 } };

            // 2. Obtener IDs de miembros visibles
            const visibleMembers = await this.visibilidadService.obtenerEmpleadosVisibles(user.carnet);
            const idsList = visibleMembers.map(u => u.idUsuario);

            // 3. Obtener reporte de hoy para esos miembros
            return await clarityRepo.obtenerEquipoHoy(idsList, fecha);
        } catch (error) {
            console.error('Error fetching team snapshot:', error);
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

            if (visibleUsers.length === 0) return [];

            const ids = visibleUsers.map(u => u.idUsuario);
            const idsStr = ids.join(',');

            // 3. Consultar bloqueos reportados por mi equipo
            if (ids.length === 0) return [];

            // Consulta directa a la DB (Idealmnete mover a repo)
            const rows = await clarityRepo.ejecutarQuery<any>(`
                SELECT 
                    b.*, 
                    u.nombre as usuarioNombre, u.carnet as usuarioCarnet,
                    t.nombre as tareaTitulo
                FROM p_Bloqueos b
                LEFT JOIN p_Usuarios u ON b.idUsuario = u.idUsuario
                LEFT JOIN p_Tareas t ON b.idTarea = t.idTarea
                WHERE b.idUsuario IN (${idsStr})
                  -- AND b.estado = 'Activo' -- Opcional: filtrar solo activos
                ORDER BY b.fechaCreacion DESC
            `);

            return rows.map(r => ({
                idBloqueo: r.idBloqueo,
                idTarea: r.idTarea,
                tarea: r.idTarea ? { idTarea: r.idTarea, titulo: r.tareaTitulo } : null,
                idOrigenUsuario: r.idUsuario,
                origenUsuario: r.idUsuario ? { idUsuario: r.idUsuario, nombre: r.usuarioNombre, carnet: r.usuarioCarnet } : null,
                motivo: r.motivo || r.descripcion, // Fallback if column name differs
                estado: r.estado,
                fechaCreacion: r.fechaCreacion,
                fechaResolucion: r.fechaResolucion,
                resolucion: r.resolucion
            }));
        } catch (error) {
            console.error("Error getEquipoBloqueos:", error);
            return [];
        }
    }

    // ===============================================
    // BLOQUEOS RE-IMPLEMENTACIÓN
    // ===============================================

    async bloqueoCrear(dto: BloqueoCrearDto) {
        return await clarityRepo.bloquearTarea(dto);
    }

    async bloqueoResolver(idBloqueo: number, body: any, idUsuarioResolver: number) {
        await clarityRepo.resolverBloqueo(idBloqueo, body.solucion || 'Resuelto manualmente');
        return { success: true };
    }
}



