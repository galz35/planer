import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Tarea } from './entities/tarea.entity';
import { Proyecto } from './entities/proyecto.entity';
import { SolicitudCambio } from './entities/solicitud-cambio.entity';
import { AuditLog } from '../common/entities/audit-log.entity';
import { Usuario } from '../auth/entities/usuario.entity';
import { OrganizacionNodo } from '../auth/entities/organizacion-nodo.entity';
import { AuditService } from '../common/audit.service';
import { PlanTrabajo } from './entities/plan-trabajo.entity';
import { UsuarioOrganizacion } from '../auth/entities/usuario-organizacion.entity';

import { VisibilidadService } from '../acceso/visibilidad.service';
import { TareaAsignado } from './entities/tarea-asignado.entity';

@Injectable()
export class PlanningService {
    constructor(
        @InjectRepository(Tarea) private tareaRepo: Repository<Tarea>,
        @InjectRepository(Proyecto) private proyectoRepo: Repository<Proyecto>,
        @InjectRepository(SolicitudCambio) private solicitudRepo: Repository<SolicitudCambio>,
        @InjectRepository(Usuario) private usuarioRepo: Repository<Usuario>,
        @InjectRepository(PlanTrabajo) private planRepo: Repository<PlanTrabajo>,
        @InjectRepository(UsuarioOrganizacion) private userOrgRepo: Repository<UsuarioOrganizacion>,
        @InjectRepository(TareaAsignado) private asignadoRepo: Repository<TareaAsignado>,
        @InjectRepository(OrganizacionNodo) private nodoRepo: Repository<OrganizacionNodo>,
        private auditService: AuditService,
        private visibilidadService: VisibilidadService,
    ) { }

    /**
     * Helper param obtener TODOS los IDs de nodos subordinados recursivamente dado un usuario manager.
     */
    private async getRecursiveManagedNodeIds(managerId: number): Promise<number[]> {
        // 1. Obtener nodos donde soy Lider directo
        const myLedNodes = await this.userOrgRepo.find({
            where: { idUsuario: managerId, rol: In(['Lider', 'Gerente', 'Director']) },
            select: ['idNodo']
        });

        if (myLedNodes.length === 0) return [];
        let nodeIds = myLedNodes.map(n => n.idNodo);

        // 2. Recursividad: Encontrar hijos de estos nodos
        // Implementación iterativa para evitar límites de recursión
        let currentLevelIds = [...nodeIds];
        const allNodeIds = new Set(nodeIds);

        while (currentLevelIds.length > 0) {
            const children = await this.nodoRepo.find({
                where: { idPadre: In(currentLevelIds) },
                select: ['idNodo']
            });

            if (children.length === 0) break;

            const childIds = children.map(c => c.idNodo);
            // Evitar ciclos infinitos si la DB está mal formada
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
        const tarea = await this.tareaRepo.findOne({
            where: { idTarea },
            relations: ['proyecto', 'plan']
        });

        if (!tarea) throw new NotFoundException('Tarea no encontrada');

        // Lógica de Bloqueo por Plan de Trabajo
        if (tarea.plan) {
            // Si el plan está Confirmado o Cerrado, se aplican reglas estrictas
            if (tarea.plan.estado === 'Confirmado' || tarea.plan.estado === 'Cerrado') {
                const usuario = await this.usuarioRepo.findOne({ where: { idUsuario } });

                // Si es Admin, acceso total
                if (['Admin', 'Administrador', 'SuperAdmin'].includes(usuario?.rolGlobal || '')) {
                    return { puedeEditar: true, requiereAprobacion: false, tipoProyecto: tarea.proyecto?.tipo || 'Plan' };
                }

                // El Dueño del Plan (Subordinado) REQUIERE APROBACIÓN para editar si está Confirmado
                if (tarea.plan.idUsuario === idUsuario) {
                    return { puedeEditar: true, requiereAprobacion: true, tipoProyecto: tarea.proyecto?.tipo || 'Plan' };
                }

                // El Creador del Plan (Jefe si lo asignó) o un superior puede editar
                // Verificamos si es el creador (si es el jefe) o usamos verifyAccess para jerarquía
                if (tarea.plan.idCreador === idUsuario) {
                    return { puedeEditar: true, requiereAprobacion: false, tipoProyecto: tarea.proyecto?.tipo || 'Plan' };
                }

                // Verificación extra de jerarquía si no es el creador directo pero sí un superior
                const esSuperior = await this.verifyAccess(idUsuario, tarea.plan.idUsuario);
                if (esSuperior) {
                    return { puedeEditar: true, requiereAprobacion: false, tipoProyecto: tarea.proyecto?.tipo || 'Plan' };
                }
            }
        }

        // Si no tiene proyecto, es tarea personal -> Libre
        if (!tarea.proyecto) {
            return { puedeEditar: true, requiereAprobacion: false, tipoProyecto: 'Personal' };
        }

        const proyecto = tarea.proyecto;

        // Regla: Proyectos Estratégicos requieren aprobación para cambios sensibles
        // (Aquí asumimos que el frontend preguntará por campos específicos, pero por ahora generalizamos)
        if (proyecto.tipo === 'Estrategico' || proyecto.requiereAprobacion) {
            // Verificar si el usuario es Admin o el Dueño del nodo
            const usuario = await this.usuarioRepo.findOne({ where: { idUsuario }, relations: ['rol'] });
            if (['Admin', 'Administrador', 'SuperAdmin'].includes(usuario?.rolGlobal || '')) {
                return { puedeEditar: true, requiereAprobacion: false, tipoProyecto: proyecto.tipo };
            }

            return { puedeEditar: true, requiereAprobacion: true, tipoProyecto: proyecto.tipo };
        }

        // Operativo / Táctico -> Libre pero auditado
        return { puedeEditar: true, requiereAprobacion: false, tipoProyecto: proyecto.tipo };
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
        const tarea = await this.tareaRepo.findOne({ where: { idTarea } });
        if (!tarea) throw new NotFoundException('Tarea no encontrada');

        // Obtener valor anterior (simple string conversion por ahora)
        const valorAnterior = (tarea as any)[campo] ? String((tarea as any)[campo]) : '';

        const solicitud = this.solicitudRepo.create({
            idTarea,
            idUsuarioSolicitante: idUsuario,
            campoAfectado: campo,
            valorAnterior,
            valorNuevo,
            motivo,
            estado: 'Pendiente',
            fechaSolicitud: new Date()
        });

        return await this.solicitudRepo.save(solicitud);
    }

    /**
     * Obtiene solicitudes pendientes para un aprobador (Jefe).
     * Nota: En una implementacion real, esto filtraría por jerarquía.
     * Por ahora, devuelve todas las pendientes si es Admin, o las de sus proyectos.
     */
    async getSolicitudesPendientes(idUsuario: number) {
        // 1. Obtener nodos que lidero (RECURSIVO)
        const managedNodeIds = await this.getRecursiveManagedNodeIds(idUsuario);

        // Si no lidero nada, verificar si soy Admin
        if (managedNodeIds.length === 0) {
            const user = await this.usuarioRepo.findOne({ where: { idUsuario } });
            if (['Admin', 'Administrador', 'SuperAdmin'].includes(user?.rolGlobal || '')) {
                return await this.solicitudRepo.find({
                    where: { estado: 'Pendiente' },
                    relations: ['tarea', 'tarea.proyecto', 'usuarioSolicitante'],
                    order: { fechaSolicitud: 'DESC' }
                });
            }
            return [];
        }

        // 2. Encontrar usuarios en mis nodos (profundidad total)
        const mySubordinates = await this.userOrgRepo.find({
            where: { idNodo: In(managedNodeIds) },
            select: ['idUsuario']
        });

        const subIds = mySubordinates.map(s => s.idUsuario).filter(id => id !== idUsuario); // Excluirme a mí mismo

        if (subIds.length === 0) return [];

        // 3. Buscar solicitudes de estos usuarios
        return await this.solicitudRepo.find({
            where: {
                estado: 'Pendiente',
                idUsuarioSolicitante: In(subIds)
            },
            relations: ['tarea', 'tarea.proyecto', 'usuarioSolicitante'],
            order: { fechaSolicitud: 'DESC' }
        });
    }

    /**
     * Aprueba o rechaza una solicitud.
     */
    async resolverSolicitud(idAprobador: number, idSolicitud: number, accion: 'Aprobar' | 'Rechazar') {
        const solicitud = await this.solicitudRepo.findOne({
            where: { idSolicitud },
            relations: ['tarea']
        });

        if (!solicitud) throw new NotFoundException('Solicitud no encontrada');
        if (solicitud.estado !== 'Pendiente') throw new BadRequestException('La solicitud ya fue procesada');

        solicitud.idAprobador = idAprobador;
        solicitud.fechaRespuesta = new Date();
        solicitud.estado = accion === 'Aprobar' ? 'Aprobado' : 'Rechazado';

        if (accion === 'Aprobar') {
            // Aplicar el cambio a la tarea
            const updateData: any = {};

            // Convertir tipo de dato según el campo
            if (solicitud.campoAfectado.includes('fecha')) {
                updateData[solicitud.campoAfectado] = solicitud.valorNuevo; // String date is fine for database usually
            } else {
                updateData[solicitud.campoAfectado] = solicitud.valorNuevo;
            }

            await this.tareaRepo.update(solicitud.idTarea, updateData);

            // Audit Log del sistema
            await this.logAudit(idAprobador, 'AprobacionCambio', 'Tarea', solicitud.idTarea.toString(), {
                solicitudId: solicitud.idSolicitud,
                cambio: `Aprobado cambio de ${solicitud.campoAfectado} a ${solicitud.valorNuevo}`
            });
        }

        return await this.solicitudRepo.save(solicitud);
    }

    /**
     * Actualización directa para tareas Operativas (con auditoría).
     */
    async updateTareaOperativa(idUsuario: number, idTarea: number, updates: any) {
        const { puedeEditar, requiereAprobacion } = await this.checkEditPermission(idTarea, idUsuario);

        // Excepción: Si requiere aprobación pero solo se está actualizando el estado de ejecución (Progreso), permitirlo.
        if (requiereAprobacion) {
            const allowedFields = ['estado', 'progreso', 'fechaHecha', 'fechaEnCurso', 'avances'];
            const updateKeys = Object.keys(updates);
            const isExecutionUpdate = updateKeys.every(k => allowedFields.includes(k));

            if (!isExecutionUpdate) {
                throw new ForbiddenException('Esta tarea está en un plan confirmado. Solo el estado y progreso pueden modificarse. Para otros cambios, solicite autorización.');
            }
            // Si es ejecución update, continuamos...
        }

        // Obtener estado anterior para log
        const tareaAntes = await this.tareaRepo.findOne({ where: { idTarea } });

        await this.tareaRepo.update(idTarea, updates);

        // Audit Log
        await this.logAudit(idUsuario, 'EdicionDirecta', 'Tarea', idTarea.toString(), {
            antes: tareaAntes,
            cambios: updates
        });

        return await this.tareaRepo.findOne({ where: { idTarea } });
    }

    /**
     * Clona una tarea existente.
     * Copia: Propiedades básicas.
     * Resetea: Estado, Progreso, Avances.
     * Asigna: Al usuario que solicita la clonación (SELF-ASSIGN) por defecto.
     */
    async cloneTask(idUsuario: number, idTarea: number) {
        const original = await this.tareaRepo.findOne({
            where: { idTarea },
            relations: ['asignados', 'asignados.usuario']
        });

        if (!original) throw new NotFoundException('Tarea original no encontrada');

        // Create copy
        const nuevaTarea = this.tareaRepo.create({
            // Copy fields
            idProyecto: original.idProyecto,
            idPlan: original.idPlan, // Mantiene el mismo plan? Quizás debería ser null si se clona a otro contexto, pero asumamos mismo contexto.
            titulo: `${original.titulo} (Copia)`,
            descripcion: original.descripcion,
            prioridad: original.prioridad,
            esfuerzo: original.esfuerzo,
            tipo: original.tipo,
            fechaInicioPlanificada: original.fechaInicioPlanificada,
            fechaObjetivo: original.fechaObjetivo,
            // Reset workflow
            estado: 'Pendiente',
            progreso: 0,
            fechaCreacion: new Date(),
            fechaUltActualizacion: new Date(),
            idCreador: idUsuario,
            idAsignadoPor: idUsuario,
            asignadoPor: undefined // Clear relation object
        });

        const savedTarea = await this.tareaRepo.save(nuevaTarea);

        // Assign to CLONER (Self) or Copy assignments? 
        // User request implied "clonar tarea" often means "copy this for me" or "copy this task structure".
        // Let's copy the original assignments IF the user is a manager, OR assign to self if operative.
        // For simplicity and safety: Add the requester as 'Responsable'.

        const nuevaAsignacion = this.asignadoRepo.create({
            idTarea: Number(savedTarea.idTarea),
            idUsuario: idUsuario,
            tipo: 'Responsable'
        });
        await this.asignadoRepo.save(nuevaAsignacion);

        await this.logAudit(idUsuario, 'ClonarTarea', 'Tarea', savedTarea.idTarea.toString(), {
            originalId: idTarea
        });

        return savedTarea;
    }

    /**
     * Reasigna tareas de un usuario a otro (Gestión de Bajas/Cambios).
     * Solo para Jefes/Admins.
     */
    async reassignTasks(requesterId: number, fromUserId: number, toUserId: number, taskIds?: number[]) {
        // 1. Permission Check
        const canManageFrom = await this.verifyAccess(requesterId, fromUserId);
        const canManageTo = await this.verifyAccess(requesterId, toUserId);

        if (!canManageFrom || !canManageTo) {
            throw new ForbiddenException('No tienes permisos sobre ambos usuarios.');
        }

        // 2. Find Assignments
        const query = this.asignadoRepo.createQueryBuilder('asign')
            .where('asign.idUsuario = :fromUserId', { fromUserId });

        if (taskIds && taskIds.length > 0) {
            query.andWhere('asign.idTarea IN (:...taskIds)', { taskIds });
        }

        // Only reassign pending/in-progress tasks? Usually yes.
        // Let's filter by the task status through join
        query.innerJoinAndSelect('asign.tarea', 'tarea')
            .andWhere('tarea.estado IN (:...estados)', { estados: ['Pendiente', 'En Progreso', 'Bloqueado', 'Borrador'] });

        const assignments = await query.getMany();

        if (assignments.length === 0) return { count: 0, message: 'No se encontraron tareas pendientes para reasignar.' };

        // 3. Update Assignments
        // We update the 'idUsuario' field directly. 
        // WARNING: If target user is ALREADY assigned to the same task, this might cause duplicate key error (unique index idUsuario+idTarea).
        // Check for duplicates first.

        let successCount = 0;
        const errors: string[] = [];

        for (const assign of assignments) {
            // Check if target has assignment
            const exists = await this.asignadoRepo.findOne({
                where: { idTarea: assign.idTarea, idUsuario: toUserId }
            });

            if (exists) {
                // If exists, maybe we just delete the old one (fromUser) effectively "merging" responsibilities or leaving target as is.
                // Let's delete the old assignment so 'fromUser' is no longer responsible.
                await this.asignadoRepo.delete(assign.idAsignacion);
                errors.push(`Tarea ${assign.idTarea}: El destino ya estaba asignado. Se eliminó la asignación del origen.`);
            } else {
                // Move assignment
                assign.idUsuario = toUserId;
                await this.asignadoRepo.save(assign);
                successCount++;
            }
        }

        // Audit
        await this.logAudit(requesterId, 'ReasignacionMasiva', 'Usuario', fromUserId.toString(), {
            toUser: toUserId,
            count: successCount,
            taskIds
        });

        return { success: true, count: successCount, errors };
    }


    /**
     * Helper para Auditoría
     */
    private async logAudit(idUsuario: number, accion: string, recurso: string, recursoId: string, detalles: any) {
        await this.auditService.log({
            idUsuario,
            accion,
            recurso,
            recursoId,
            detalles
        });
    }

    // --- PLANES DE TRABAJO (Monthly Plans) ---

    async getPlans(requesterId: number, targetUserId: number, month: number, year: number) {
        const canAccess = await this.verifyAccess(requesterId, targetUserId);
        if (!canAccess) throw new ForbiddenException('No tienes permiso para ver los planes de este usuario.');

        // Find ALL plans for this month
        return await this.planRepo.find({
            where: { idUsuario: targetUserId, mes: month, anio: year },
            relations: ['tareas', 'tareas.proyecto']
        });
    }

    async upsertPlan(requesterId: number, body: {
        idPlan?: number,
        idUsuario: number, mes: number, anio: number,
        nombre?: string,
        objetivoGeneral?: string,
        tareasIds?: number[],
        estado?: string,
        idProyecto?: number,
        area?: string,
        subgerencia?: string,
        gerencia?: string
    }) {
        const { idPlan, idUsuario, mes, anio, nombre, objetivoGeneral, tareasIds, estado, idProyecto, area, subgerencia, gerencia } = body;

        const canAccess = await this.verifyAccess(requesterId, idUsuario);
        if (!canAccess) throw new ForbiddenException('No tienes permiso para gestionar planes.');

        let plan: PlanTrabajo;

        if (idPlan) {
            const found = await this.planRepo.findOne({ where: { idPlan } });
            if (!found) throw new NotFoundException('Plan no encontrado');
            plan = found;
        } else {
            // Create new
            plan = this.planRepo.create({
                idUsuario, mes, anio, idCreador: requesterId, estado: 'Borrador'
            });
        }

        if (nombre !== undefined) plan.nombre = nombre;
        if (objetivoGeneral !== undefined) plan.objetivoGeneral = objetivoGeneral;
        if (estado !== undefined) plan.estado = estado;
        if (idProyecto !== undefined) plan.idProyecto = idProyecto;

        // Auto-rellenar campos organizacionales
        // Si el usuario NO es admin y NO especificó área manualmente, usar la del usuario
        const requester = await this.usuarioRepo.findOne({ where: { idUsuario: requesterId } });
        const targetUser = await this.usuarioRepo.findOne({ where: { idUsuario } });
        const isAdmin = ['Admin', 'Administrador', 'SuperAdmin'].includes(requester?.rolGlobal || '');

        if (!area && targetUser) {
            // Auto-rellenar desde el usuario objetivo
            plan.area = (targetUser.primerNivel || null) as any;
            plan.subgerencia = (targetUser.segundoNivel || null) as any;
            plan.gerencia = (targetUser.tercerNivel || null) as any;
        } else {
            // Si el admin especificó manualmente, usar esos valores
            if (area !== undefined) plan.area = area;
            if (subgerencia !== undefined) plan.subgerencia = subgerencia;
            if (gerencia !== undefined) plan.gerencia = gerencia;
        }

        const savedPlan = await this.planRepo.save(plan);

        if (tareasIds && tareasIds.length > 0) {
            await this.tareaRepo.update(
                { idTarea: In(tareasIds) },
                { idPlan: savedPlan.idPlan }
            );
        }

        return await this.planRepo.findOne({
            where: { idPlan: savedPlan.idPlan },
            relations: ['tareas', 'tareas.proyecto']
        });
    }

    async getMyTeam(requesterId: number) {
        // Obtenemos el usuario solicitante con sus roles
        const solicitante = await this.usuarioRepo.findOne({ where: { idUsuario: requesterId } });
        if (!solicitante) return [];

        const isAdmin = ['Admin', 'Administrador', 'SuperAdmin'].includes(solicitante.rolGlobal || '');

        let empleadosVisibles: any[] = [];

        if (isAdmin) {
            // Un administrador ve a TODOS los usuarios activos
            empleadosVisibles = await this.usuarioRepo.find({
                where: { activo: true },
                order: { nombreCompleto: 'ASC' }
            });
        } else {
            // El resto ve según jerarquía y permisos
            if (!solicitante.carnet) return [];
            empleadosVisibles = await this.visibilidadService.obtenerEmpleadosVisibles(solicitante.carnet);
        }

        // Mapear al formato esperado por el frontend
        // Para admin, usualmente mostramos a todos menos a sí mismo para evitar confusión en "equipo"
        // pero el usuario pidió "ver todo".
        return empleadosVisibles
            .filter(emp => emp.idUsuario !== requesterId)
            .map(emp => ({
                idUsuario: emp.idUsuario,
                carnet: emp.carnet,
                nombre: emp.nombreCompleto || emp.nombre || 'Sin Nombre',
                nombreCompleto: emp.nombreCompleto || emp.nombre || 'Sin Nombre',
                cargo: emp.cargo || 'Miembro de Equipo',
                departamento: emp.departamento || emp.orgDepartamento,
                correo: emp.correo,
                idOrg: emp.idOrg,
                activo: emp.activo,
                area: emp.primerNivel, // Mapped to primerNivel as requested
                gerencia: emp.gerencia
            }));
    }


    // --- Helper Access ---
    private async verifyAccess(requesterId: number, targetUserId: number): Promise<boolean> {
        if (requesterId === targetUserId) return true;

        // Verify if requester is ADMIN
        const requester = await this.usuarioRepo.findOne({ where: { idUsuario: requesterId } });
        // Use TypeORM relation or direct check based on entity definition. Assuming rolGlobal is enum or string.
        if (['Admin', 'Administrador', 'SuperAdmin'].includes((requester as any)?.rolGlobal || '')) return true;

        // Verify Hierarchy (RECURSIVO)
        const managedNodeIds = await this.getRecursiveManagedNodeIds(requesterId);
        if (managedNodeIds.length === 0) return false;

        // Check if target is in any of these nodes
        const targetInMyNodes = await this.userOrgRepo.findOne({
            where: { idUsuario: targetUserId, idNodo: In(managedNodeIds) }
        });

        return !!targetInMyNodes;
    }

    async getTaskHistory(taskId: number) {
        return await this.auditService.getHistorialEntidad('Tarea', taskId.toString());
    }

    async closePlan(requesterId: number, idPlan: number, resumen?: string) {
        const plan = await this.planRepo.findOne({
            where: { idPlan },
            relations: ['tareas']
        });

        if (!plan) throw new NotFoundException('Plan no encontrado');

        // Solo el jefe (o admin) debería poder cerrar el plan oficialmente
        // Usamos verifyAccess para ver si rewuester es superior del plan.idUsuario
        const canManage = await this.verifyAccess(requesterId, plan.idUsuario);
        if (!canManage || requesterId === plan.idUsuario) { // Exclude self-closing? Usually managers close. But let's allow self-close if logic permits. Let's strict to Manager.
            // Actually, verifyAccess returns true for self. So we need to check if it IS self.
            // Business Rule: "Cierre de Mes" is usually an evaluation step. Manager does it.
            const isSelf = requesterId === plan.idUsuario;
            const requesterUser = await this.usuarioRepo.findOne({ where: { idUsuario: requesterId } });

            if (isSelf && !['Admin', 'Administrador', 'SuperAdmin'].includes(requesterUser?.rolGlobal || '')) {
                // Self cannot close? Let's say yes for simplicity for now, or check requirement.
                // "Cerrar mes" often implies locking history.
            }
        }

        // Simplest rule: Must have access.
        if (!canManage) throw new ForbiddenException('No tienes permiso para cerrar este plan.');

        // Calcular estadísticas
        const total = plan.tareas.length;
        const hechas = plan.tareas.filter(t => t.estado === 'Hecha').length;
        const score = total > 0 ? Math.round((hechas / total) * 100) : 0;

        plan.estado = 'Cerrado';
        plan.resumenCierre = resumen || `Plan cerrado con ${score}% de cumplimiento. (${hechas}/${total} tareas).`;

        const saved = await this.planRepo.save(plan);

        await this.logAudit(requesterId, 'CerrarPlan', 'PlanTrabajo', idPlan.toString(), {
            score,
            total,
            hechas
        });

        return saved;
    }

    /**
     * Obtiene los proyectos visibles para el usuario basándose en:
     * 1. Proyectos con tareas asignadas a usuarios en su jerarquía
     * 2. Fallback: Proyectos de la misma gerencia si no hay tareas asignadas
     */
    async getMyProjects(requesterId: number) {
        const solicitante = await this.usuarioRepo.findOne({ where: { idUsuario: requesterId } });
        if (!solicitante) return [];

        const isAdmin = ['Admin', 'Administrador', 'SuperAdmin'].includes(solicitante.rolGlobal || '');

        // 1. Obtener IDs de usuarios visibles
        let visibleUserIds: number[] = [];
        if (isAdmin) {
            const allUsers = await this.usuarioRepo.find({ where: { activo: true }, select: ['idUsuario'] });
            visibleUserIds = allUsers.map(u => u.idUsuario);
        } else if (solicitante.carnet) {
            const visibles = await this.visibilidadService.obtenerEmpleadosVisibles(solicitante.carnet);
            visibleUserIds = visibles.map((v: any) => v.idUsuario);
        } else {
            visibleUserIds = [requesterId];
        }

        console.log(`[PlanningService.getMyProjects] Usuario ${requesterId}, visibles: ${visibleUserIds.length}`);

        // 2. Buscar proyectos con tareas asignadas a esos usuarios
        const activeProjects = await this.proyectoRepo.find({
            where: { estado: 'Activo' },
            relations: ['tareas', 'tareas.asignados']
        });

        const today = new Date();

        // Filtrar proyectos por tareas asignadas a usuarios visibles
        let filteredProjects = activeProjects.filter(p => {
            if (!p.tareas || p.tareas.length === 0) return false;
            return p.tareas.some(t =>
                t.asignados?.some(a => visibleUserIds.includes(a.idUsuario))
            );
        });

        console.log(`[PlanningService.getMyProjects] Proyectos por asignación: ${filteredProjects.length}`);

        // 3. FALLBACK: Si no hay proyectos por asignación, buscar por gerencia
        if (filteredProjects.length === 0 && !isAdmin) {
            console.log(`[PlanningService.getMyProjects] Aplicando fallback por gerencia...`);

            // Obtener gerencia del solicitante o de sus subordinados
            const gerenciasVisibles = new Set<string>();

            // Agregar gerencia del solicitante
            if (solicitante.departamento) {
                gerenciasVisibles.add(solicitante.departamento.toUpperCase());
            }

            // Obtener departamentos de subordinados
            const subordinados = await this.usuarioRepo.find({
                where: { idUsuario: In(visibleUserIds) },
                select: ['departamento', 'cargo']
            });
            subordinados.forEach(s => {
                if (s.departamento) gerenciasVisibles.add(s.departamento.toUpperCase());
                // También agregar por cargo que contenga palabras clave
                if (s.cargo?.toUpperCase().includes('RECURSOS HUMANOS')) {
                    gerenciasVisibles.add('RECURSOS HUMANOS');
                }
            });

            console.log(`[PlanningService.getMyProjects] Gerencias para fallback:`, Array.from(gerenciasVisibles));

            // Filtrar proyectos que coincidan con alguna gerencia
            filteredProjects = activeProjects.filter(p => {
                const proyGerencia = (p.gerencia || '').toUpperCase();
                const proySubgerencia = (p.subgerencia || '').toUpperCase();

                return Array.from(gerenciasVisibles).some(g =>
                    proyGerencia.includes(g) || proySubgerencia.includes(g) ||
                    g.includes('RECURSOS HUMANOS') && proyGerencia.includes('RECURSOS HUMANOS')
                );
            });

            console.log(`[PlanningService.getMyProjects] Proyectos por fallback gerencia: ${filteredProjects.length}`);
        }

        // 4. Mapear a formato de respuesta
        return filteredProjects.map(p => {
            // Filtrar tareas solo de usuarios visibles (si aplica)
            const relevantTasks = isAdmin
                ? (p.tareas || [])
                : (p.tareas || []).filter(t =>
                    t.asignados?.some(a => visibleUserIds.includes(a.idUsuario))
                );

            const total = relevantTasks.length;
            const done = relevantTasks.filter(t => t.estado === 'Hecha').length;
            const inProgress = relevantTasks.filter(t => t.estado === 'EnCurso').length;
            const atrasadas = relevantTasks.filter(t =>
                t.estado !== 'Hecha' && t.fechaObjetivo && new Date(t.fechaObjetivo) < today
            ).length;
            const bloqueadas = relevantTasks.filter(t => t.estado === 'Bloqueada').length;
            const progress = total > 0 ? Math.round((done / total) * 100) : 0;

            // Calcular progreso esperado basado en cronograma del proyecto
            let expectedProgress = 0;
            let deviation = 0;

            if (p.fechaInicio && p.fechaFin) {
                const startDate = new Date(p.fechaInicio);
                const endDate = new Date(p.fechaFin);
                const totalMs = endDate.getTime() - startDate.getTime();
                const elapsedMs = today.getTime() - startDate.getTime();

                if (totalMs > 0) {
                    // Si aún no ha iniciado, expectedProgress = 0
                    if (today < startDate) {
                        expectedProgress = 0;
                    }
                    // Si ya pasó la fecha fin, expectedProgress = 100
                    else if (today > endDate) {
                        expectedProgress = 100;
                    }
                    // Si está en medio, calcular proporcionalmente
                    else {
                        expectedProgress = Math.round((elapsedMs / totalMs) * 100);
                    }
                }
            } else if (relevantTasks.length > 0) {
                // Fallback: Si no hay fechas de proyecto, calcular por tareas
                const tasksWithDates = relevantTasks.filter(t => t.fechaInicioPlanificada && t.fechaObjetivo);
                if (tasksWithDates.length > 0) {
                    // Usar la fecha más temprana y más tardía de las tareas
                    const taskStarts = tasksWithDates.map(t => new Date(t.fechaInicioPlanificada!).getTime());
                    const taskEnds = tasksWithDates.map(t => new Date(t.fechaObjetivo!).getTime());
                    const earliestStart = Math.min(...taskStarts);
                    const latestEnd = Math.max(...taskEnds);
                    const totalMs = latestEnd - earliestStart;
                    const elapsedMs = today.getTime() - earliestStart;

                    if (totalMs > 0 && elapsedMs >= 0) {
                        expectedProgress = Math.min(Math.round((elapsedMs / totalMs) * 100), 100);
                    }
                }
            }

            // Calcular desviación (positivo = adelantado, negativo = atrasado)
            deviation = progress - expectedProgress;

            return {
                id: p.idProyecto,
                nombre: p.nombre,
                tipo: p.tipo,
                gerencia: p.gerencia,
                subgerencia: p.subgerencia,
                area: p.area,
                estado: p.estado,
                fechaInicio: p.fechaInicio,
                fechaFin: p.fechaFin,
                progress,
                expectedProgress,  // NUEVO: Progreso esperado según cronograma
                deviation,         // NUEVO: Desviación (progress - expectedProgress)
                totalTasks: total,
                hechas: done,
                enCurso: inProgress,
                atrasadas,
                bloqueadas,
                tareas: relevantTasks.slice(0, 50).map(t => ({
                    id: t.idTarea,
                    titulo: t.titulo,
                    estado: t.estado,
                    prioridad: t.prioridad,
                    progreso: t.progreso || 0,
                    fechaInicio: t.fechaInicioPlanificada,
                    fechaObjetivo: t.fechaObjetivo,
                    atrasada: t.estado !== 'Hecha' && t.fechaObjetivo && new Date(t.fechaObjetivo) < today
                }))
            };
        }).sort((a, b) => a.deviation - b.deviation); // Ordenar por mayor atraso primero (deviation más negativa)
    }
}

