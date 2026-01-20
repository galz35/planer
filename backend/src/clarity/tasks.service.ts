import { Injectable, InternalServerErrorException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource, Not, Brackets, MoreThanOrEqual } from 'typeorm';
import { Usuario } from '../auth/entities/usuario.entity';
import { OrganizacionNodo } from '../auth/entities/organizacion-nodo.entity';
import { UsuarioOrganizacion } from '../auth/entities/usuario-organizacion.entity';
import { Tarea } from '../planning/entities/tarea.entity';
import { TareaAsignado } from '../planning/entities/tarea-asignado.entity';
import { Proyecto } from '../planning/entities/proyecto.entity';
import { TareaAvance } from '../planning/entities/tarea-avance.entity';
import { Checkin } from './entities/checkin.entity';
import { CheckinTarea } from './entities/checkin-tarea.entity';
import { Bloqueo } from './entities/bloqueo.entity';
import { AuditLog } from '../common/entities/audit-log.entity';
import { ResourceNotFoundException, InsufficientPermissionsException, BusinessRuleException } from '../common/exceptions';
import { CheckinUpsertDto, TareaCrearRapidaDto, TareaActualizarDto, TareaRevalidarDto, TareaRegistrarAvanceDto, BloqueoCrearDto, BloqueoResolverDto, ProyectoCrearDto, ProyectoFilterDto } from './dto/clarity.dtos';
import { AuditService } from '../common/audit.service';
import { PlanningService } from '../planning/planning.service';

import { VisibilidadService } from '../acceso/visibilidad.service';

import { SolicitudCambio } from '../planning/entities/solicitud-cambio.entity';

@Injectable()
export class TasksService {
    constructor(
        @InjectRepository(Usuario) private userRepo: Repository<Usuario>,
        @InjectRepository(Tarea) private tareaRepo: Repository<Tarea>,
        @InjectRepository(TareaAsignado) private tareaAsignadoRepo: Repository<TareaAsignado>,
        @InjectRepository(TareaAvance) private tareaAvanceRepo: Repository<TareaAvance>,
        @InjectRepository(Checkin) private checkinRepo: Repository<Checkin>,
        @InjectRepository(CheckinTarea) private checkinTareaRepo: Repository<CheckinTarea>,
        @InjectRepository(Bloqueo) private bloqueoRepo: Repository<Bloqueo>,
        @InjectRepository(OrganizacionNodo) private nodoRepo: Repository<OrganizacionNodo>,
        @InjectRepository(Proyecto) private proyectoRepo: Repository<Proyecto>,
        @InjectRepository(UsuarioOrganizacion) private userOrgRepo: Repository<UsuarioOrganizacion>,
        @InjectRepository(SolicitudCambio) private solicitudRepo: Repository<SolicitudCambio>,
        private dataSource: DataSource,
        private planningService: PlanningService,
        private auditService: AuditService,
        private visibilidadService: VisibilidadService,
    ) { }

    async crearSolicitudCambio(idUsuario: number, idTarea: number, campo: string, valorNuevo: string, motivo?: string) {
        const tarea = await this.tareaRepo.findOne({ where: { idTarea }, relations: ['proyecto'] });
        if (!tarea) throw new ResourceNotFoundException('Tarea', idTarea);

        let valorAnterior = '';
        if (campo === 'Titulo') valorAnterior = tarea.titulo;
        if (campo === 'Descripcion') valorAnterior = tarea.descripcion || '';
        if (campo === 'Inicio') valorAnterior = tarea.fechaInicioPlanificada ? tarea.fechaInicioPlanificada.toString() : '';
        if (campo === 'Fin') valorAnterior = tarea.fechaObjetivo ? tarea.fechaObjetivo.toString() : '';

        const solicitud = this.solicitudRepo.create({
            idUsuarioSolicitante: idUsuario,
            idTarea,
            campoAfectado: campo,
            valorAnterior,
            valorNuevo: valorNuevo,
            motivo,
            estado: 'Pendiente'
        });

        const saved = await this.solicitudRepo.save(solicitud);
        await this.saveAuditLog(idUsuario, 'SolicitudCambioCreada', 'SolicitudCambio', saved.idSolicitud.toString(), { campo, valorNuevo });
        return saved;
    }

    private async saveAuditLog(idUsuario: number, accion: string, recurso: string, recursoId: string, detalles?: any) {
        // Get user's country for audit trail
        const user = await this.userRepo.findOne({ where: { idUsuario } });
        const pais = user?.pais || 'NI';

        // Usar servicio centralizado de auditoría
        await this.auditService.log({
            idUsuario,
            accion,
            recurso,
            recursoId,
            detalles: { ...detalles, pais }
        });
    }

    private async getSubtreeNodeIds(idLider: number): Promise<number[]> {
        const relaciones = await this.userOrgRepo.find({
            where: { idUsuario: idLider, rol: In(['Lider', 'Gerente', 'Director']) }
        });
        if (relaciones.length === 0) return [];
        const rootNodeIds = relaciones.map(r => r.idNodo);

        const rawNodes = await this.dataSource.query(`
            WITH RECURSIVE Subtree AS (
                SELECT "idNodo" FROM "p_OrganizacionNodos" WHERE "idNodo" = ANY($1)
                UNION ALL
                SELECT n."idNodo" FROM "p_OrganizacionNodos" n
                INNER JOIN Subtree s ON n."idPadre" = s."idNodo"
            )
            SELECT "idNodo" FROM Subtree
        `, [rootNodeIds]);

        return rawNodes.map((r: any) => r.idNodo);
    }

    private async getSubtreeUserIds(idLider: number): Promise<number[]> {
        const nodeIds = await this.getSubtreeNodeIds(idLider);
        if (nodeIds.length === 0) return [idLider];

        const usersInNodes = await this.userOrgRepo.find({
            where: { idNodo: In(nodeIds) }
        });

        const ids = new Set<number>(usersInNodes.map(u => u.idUsuario));
        ids.add(idLider);
        return Array.from(ids);
    }

    async taskGetOne(id: number) {
        return this.tareaRepo.findOne({
            where: { idTarea: id },
            relations: ['asignados', 'asignados.usuario', 'proyecto']
        });
    }

    async tareaCrearRapida(dto: TareaCrearRapidaDto): Promise<Tarea> {
        console.log('[TasksService] Crear Tarea Rápida:', dto);
        const tarea = new Tarea();
        tarea.titulo = dto.titulo;
        tarea.descripcion = dto.descripcion as any;
        tarea.idCreador = dto.idUsuario;
        tarea.idProyecto = dto.idProyecto as any;
        tarea.estado = 'Pendiente';
        tarea.esfuerzo = dto.esfuerzo || 'M';
        tarea.prioridad = dto.prioridad || 'Media';
        tarea.tipo = dto.tipo || 'Administrativa';
        tarea.fechaInicioPlanificada = dto.fechaInicioPlanificada ? new Date(dto.fechaInicioPlanificada) as any : undefined;
        tarea.fechaObjetivo = dto.fechaObjetivo ? new Date(dto.fechaObjetivo) as any : undefined;
        tarea.progreso = 0;
        tarea.orden = 0;

        // Asignar contexto de auditoría para el Subscriber
        tarea._auditUsuario = dto.idUsuario;

        const saved = await this.tareaRepo.save(tarea);
        console.log('[TasksService] Tarea guardada:', saved.idTarea);

        const idResponsable = dto.idResponsable || dto.idUsuario;

        if (idResponsable) {
            await this.tareaAsignadoRepo.save({
                idTarea: saved.idTarea,
                idUsuario: idResponsable,
                tipo: 'Responsable'
            });
            console.log('[TasksService] Responsable asignado:', idResponsable);
        }

        return saved;
    }

    private async verificarAccesoSubordinado(idLider: number, idSubordinado: number): Promise<boolean> {
        return this.visibilidadService.verificarAccesoPorId(idLider, idSubordinado);
    }

    public async canManageUser(managerId: number, subordinateId: number): Promise<boolean> {
        return this.verificarAccesoSubordinado(managerId, subordinateId);
    }

    async verificarAccesoSubordinadoPublic(idLider: number, idSubordinado: number): Promise<boolean> {
        return this.visibilidadService.verificarAccesoPorId(idLider, idSubordinado);
    }

    async tareasUsuario(idUsuario: number) {
        return this.tareaRepo.find({
            where: { asignados: { idUsuario, tipo: 'Responsable' } },
            relations: ['proyecto', 'asignados', 'asignados.usuario'],
            order: { fechaObjetivo: 'ASC', prioridad: 'DESC' }
        });
    }

    async equipoMiembro(idLider: number, idMiembro: number) {
        const tieneAcceso = await this.verificarAccesoSubordinado(idLider, idMiembro);
        if (!tieneAcceso) throw new InsufficientPermissionsException('ver detalles de este miembro');

        const usuario = await this.userRepo.findOne({ where: { idUsuario: idMiembro }, relations: ['rol'] });

        // Calcular estadísticas básicas
        const tasks = await this.tareaRepo.find({
            where: { asignados: { idUsuario: idMiembro, tipo: 'Responsable' } }
        });

        const pendientes = tasks.filter(t => ['Pendiente', 'EnCurso'].includes(t.estado)).length;
        const completadas = tasks.filter(t => t.estado === 'Hecha').length;

        return {
            usuario,
            estadisticas: {
                pendientes,
                completadas,
                total: tasks.length
            }
        };
    }

    async tareasMisTareas(idUsuario: number, estado?: string, idProyecto?: number) {
        const where: any = {
            asignados: {
                idUsuario,
                tipo: 'Responsable'
            }
        };

        if (estado) where.estado = estado;
        if (idProyecto) where.idProyecto = idProyecto;

        const results = await this.tareaRepo.find({
            where,
            relations: ['proyecto', 'asignados', 'asignados.usuario'],
            order: { fechaObjetivo: 'ASC', prioridad: 'DESC' }
        });
        console.log(`[TasksService] tareasMisTareas for User ${idUsuario}: Found ${results.length} tasks`);
        return results;
    }

    async tareasHistorico(carnet: string, dias: number = 30) {
        console.log(`[TasksService] Fetching history for carnet: ${carnet}, days: ${dias}`);
        const user = await this.userRepo.findOne({ where: { carnet } });
        if (!user) throw new ResourceNotFoundException('Usuario con carnet', carnet as any);

        const today = new Date();
        // Si estamos en 2026 pero el sistema cree que es 2025 (como sucede ahora)
        // ampliaremos el rango para asegurar visibilidad
        const fechaCorte = new Date(today);
        fechaCorte.setDate(today.getDate() - dias);

        // Hack temporal: Si detectamos que los datos están en el futuro (2026) 
        // pero "hoy" es 2025 o similar, ignoramos el filtro de fecha de inicio para no ocultar nada.
        const qb = this.tareaRepo.createQueryBuilder('t')
            .innerJoin('t.asignados', 'ta')
            .leftJoinAndSelect('t.proyecto', 'p')
            .where('ta.idUsuario = :uid', { uid: user.idUsuario })
            .andWhere('ta.tipo = :tipo', { tipo: 'Responsable' });

        // Solo aplicamos filtro de fecha si no estamos en el limbo del cambio de año del mock data
        // pero por ahora devolvamos TODO lo asignado para garantizar visibilidad al usuario

        const tasks = await qb.orderBy('t.fechaObjetivo', 'DESC').getMany();
        console.log(`[TasksService] Found ${tasks.length} history tasks for carnet ${carnet}`);
        return tasks;
    }

    async checkinUpsert(dto: CheckinUpsertDto) {
        console.log('[TasksService] Upserting checkin for user', dto.idUsuario);
        return this.dataSource.transaction(async (manager) => {
            // 1. Find or Create Checkin
            let checkin = await manager.findOne(Checkin, {
                where: { idUsuario: dto.idUsuario, fecha: dto.fecha }
            });

            if (!checkin) {
                checkin = manager.create(Checkin, {
                    idUsuario: dto.idUsuario,
                    fecha: dto.fecha,
                    estadoAnimo: dto.estadoAnimo || 'Bien',
                    entregableTexto: dto.entregableTexto || '',
                    nota: dto.nota || '',
                    linkEvidencia: dto.linkEvidencia || '',
                    idNodo: dto.idNodo
                });
            } else {
                if (dto.estadoAnimo !== undefined) checkin.estadoAnimo = dto.estadoAnimo;
                if (dto.entregableTexto !== undefined) checkin.entregableTexto = dto.entregableTexto;
                if (dto.nota !== undefined) checkin.nota = dto.nota;
                if (dto.linkEvidencia !== undefined) checkin.linkEvidencia = dto.linkEvidencia;
            }

            const savedCheckin = await manager.save(Checkin, checkin);

            // 2. Clear old tasks
            await manager.delete(CheckinTarea, { idCheckin: savedCheckin.idCheckin });

            // 3. Prepare new tasks
            const tareasGuardar: any[] = [];

            const processIds = (ids: number[] | undefined, tipo: string) => {
                if (ids && ids.length > 0) {
                    ids.forEach(rawId => {
                        const id = Number(rawId);
                        if (id && !isNaN(id)) {
                            tareasGuardar.push({
                                idCheckin: savedCheckin.idCheckin,
                                idTarea: id,
                                tipo
                            });
                        }
                    });
                }
            };

            processIds(dto.entrego, 'Entrego');
            processIds(dto.avanzo, 'Avanzo');
            processIds(dto.extras, 'Extra');

            if (tareasGuardar.length > 0) {
                await manager.save(CheckinTarea, tareasGuardar);

                // AUTO-UPDATE: Set selected tasks to 'EnCurso'
                const taskIds = tareasGuardar.map(t => t.idTarea);
                if (taskIds.length > 0) {
                    await manager.update(Tarea,
                        { idTarea: In(taskIds), estado: 'Pendiente' },
                        { estado: 'EnCurso' }
                    );
                }
            }

            return savedCheckin;
        });
    }

    async miDiaGet(idUsuario: number, fecha: string) {
        const user = await this.userRepo.findOne({ where: { idUsuario } });

        // Load Checkin with explicit join to ensure tasks are retrieved
        const checkin = await this.checkinRepo.findOne({
            where: { idUsuario, fecha },
            relations: ['tareas', 'tareas.tarea', 'tareas.tarea.proyecto']
        });

        const [y, m, d] = fecha.split('-').map(Number);

        // "Mi Agenda" Logic:
        const qb = this.tareaRepo.createQueryBuilder('t')
            .innerJoin('t.asignados', 'asignado')
            .leftJoinAndSelect('t.proyecto', 'proyecto')
            .leftJoinAndSelect('t.plan', 'plan')
            .where('asignado.idUsuario = :idUsuario', { idUsuario })
            .andWhere('asignado.tipo = :tipo', { tipo: 'Responsable' })
            .andWhere('t.estado IN (:...estados)', { estados: ['Pendiente', 'EnCurso'] });

        // Complex condition: (Start <= Today OR Due <= Today OR InProgress OR In Monthly Plan)
        qb.andWhere(new Brackets(qb => {
            qb.where('t.fechaInicioPlanificada <= :fecha', { fecha })
                .orWhere('t.fechaObjetivo <= :fecha', { fecha })
                .orWhere('t.estado = :enCurso', { enCurso: 'EnCurso' })
                .orWhere('(plan.mes = :m AND plan.anio = :y)', { m, y });
        }));

        // Limit and Order
        qb.orderBy('t.prioridad', 'ASC')
            .addOrderBy('t.orden', 'ASC')
            .take(100);

        const tareasParaHoy = await qb.getMany();

        // Merge tasks from Checkin (Active Plan)
        if (checkin && checkin.tareas) {
            const checkinTaskIds = checkin.tareas.map(ct => Number(ct.idTarea));
            if (checkinTaskIds.length > 0) {
                const activePlanTasks = await this.tareaRepo.find({
                    where: { idTarea: In(checkinTaskIds) },
                    relations: ['proyecto', 'asignados', 'asignados.usuario']
                });

                activePlanTasks.forEach(apt => {
                    const aptId = Number(apt.idTarea);
                    if (!tareasParaHoy.find(t => Number(t.idTarea) === aptId)) {
                        tareasParaHoy.push(apt);
                    }
                });
            }
        }

        const suggestedIds = new Set(tareasParaHoy.map(t => Number(t.idTarea)));

        // Fetch Backlog (Pending tasks NOT in the suggested list)
        const backlog = await this.tareaRepo.find({
            where: {
                asignados: { idUsuario, tipo: 'Responsable' },
                estado: 'Pendiente'
            },
            order: { prioridad: 'ASC' },
            take: 30
        });

        // Filter out already suggested tasks
        const uniqueBacklog = backlog.filter(t => !suggestedIds.has(Number(t.idTarea)));

        return {
            usuario: user,
            checkinHoy: checkin || null, // Renamed to match frontend 'checkinHoy'
            tareasSugeridas: tareasParaHoy,
            backlog: uniqueBacklog
        };
    }

    async tareaActualizar(id: number, dto: TareaActualizarDto, idUsuario: number) {
        const tarea = await this.tareaRepo.findOne({
            where: { idTarea: id },
            relations: ['proyecto', 'asignados']
        });
        if (!tarea) throw new ResourceNotFoundException('Tarea', id);

        // Campos que SIEMPRE se pueden editar sin aprobación
        // const camposLibres = ['progreso', 'estado', 'descripcion', 'prioridad', 'esfuerzo'];

        // Comparación segura de fechas
        const fechaObjetivoAnterior = tarea.fechaObjetivo ? new Date(tarea.fechaObjetivo).getTime() : null;
        let fechaObjetivoNueva: number | null = null;
        if (dto.fechaObjetivo) fechaObjetivoNueva = new Date(dto.fechaObjetivo).getTime();

        const cambioFechaObjetivo = dto.fechaObjetivo !== undefined && fechaObjetivoAnterior !== fechaObjetivoNueva;

        const fechaInicioAnterior = tarea.fechaInicioPlanificada ? new Date(tarea.fechaInicioPlanificada).getTime() : null;
        let fechaInicioNueva: number | null = null;
        if (dto.fechaInicioPlanificada) fechaInicioNueva = new Date(dto.fechaInicioPlanificada).getTime();

        const cambioFechaInicio = dto.fechaInicioPlanificada !== undefined && fechaInicioAnterior !== fechaInicioNueva;

        const cambiandoFechas = cambioFechaObjetivo || cambioFechaInicio;

        if (cambiandoFechas) {
            const requiereAprobacion = await this.verificarRequiereAprobacion(tarea);

            if (requiereAprobacion) {
                // Crear solicitud de cambio en lugar de aplicar directamente
                const solicitud = await this.crearSolicitudCambioAutomatica(
                    tarea, dto, idUsuario, cambioFechaObjetivo ? 'fechaObjetivo' : 'fechaInicioPlanificada'
                );
                return {
                    requiresApproval: true,
                    solicitudId: solicitud.idSolicitud,
                    message: 'El cambio de fecha ha sido enviado para aprobación.'
                };
            }
        }

        // Aplicar cambios directamente
        if (dto.titulo !== undefined) tarea.titulo = dto.titulo;
        if (dto.prioridad) tarea.prioridad = dto.prioridad;
        if (dto.esfuerzo) tarea.esfuerzo = dto.esfuerzo;
        if (dto.progreso !== undefined) tarea.progreso = dto.progreso;
        if (dto.fechaInicioPlanificada !== undefined) tarea.fechaInicioPlanificada = dto.fechaInicioPlanificada as any;
        if (dto.fechaObjetivo !== undefined) tarea.fechaObjetivo = dto.fechaObjetivo as any;
        if (dto.descripcion !== undefined) tarea.descripcion = dto.descripcion;

        if (dto.estado && dto.estado !== tarea.estado) {
            tarea.estado = dto.estado;
            if (dto.estado === 'EnCurso' && !tarea.fechaEnCurso) tarea.fechaEnCurso = new Date();
            if (dto.estado === 'Hecha') tarea.fechaHecha = new Date();
        }

        tarea._auditUsuario = idUsuario;
        const tareaGuardada = await this.tareaRepo.save(tarea);
        return tareaGuardada;
    }

    private async verificarRequiereAprobacion(tarea: Tarea): Promise<boolean> {
        const proyecto = tarea.proyecto;

        // Regla 1: Proyectos estratégicos confirmados
        if (proyecto?.tipo === 'Estrategico' &&
            ['Confirmado', 'EnEjecucion'].includes(proyecto.estado || '')) {
            return true;
        }

        // Regla 2: Tareas próximas a vencer (menos de 7 días)
        if (tarea.fechaObjetivo) {
            const hoy = new Date();
            // Reset time to avoid issues? No, raw comparison is fine or simple diff
            const fechaObj = new Date(tarea.fechaObjetivo);
            const diasRestantes = (fechaObj.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24);
            // Si ya venció (negativo) o vence en <= 7 días
            if (diasRestantes <= 7) {
                return true;
            }
        }

        return false;
    }

    private async crearSolicitudCambioAutomatica(
        tarea: Tarea,
        dto: TareaActualizarDto,
        idUsuario: number,
        campo: string
    ) {
        const valorAnterior = campo === 'fechaObjetivo' ? tarea.fechaObjetivo : tarea.fechaInicioPlanificada;
        const valorNuevo = campo === 'fechaObjetivo' ? dto.fechaObjetivo : dto.fechaInicioPlanificada;

        const solicitud = this.solicitudRepo.create({
            idUsuarioSolicitante: idUsuario,
            idTarea: tarea.idTarea,
            campoAfectado: campo,
            valorAnterior: valorAnterior?.toString() || null,
            valorNuevo: valorNuevo?.toString() || '',
            motivo: dto.motivo || 'Cambio solicitado por el usuario',
            estado: 'Pendiente'
        });

        return await this.solicitudRepo.save(solicitud);
    }

    async tareaRevalidar(id: number, dto: TareaRevalidarDto, idUsuario: number) {
        console.log(`Revalidar Tarea ${id} por Usuario ${idUsuario}`, dto);
        const tarea = await this.tareaRepo.findOne({ where: { idTarea: id }, relations: ['asignados'] });
        if (!tarea) throw new ResourceNotFoundException('Tarea', id);

        const esResponsable = tarea.asignados?.some(a => a.idUsuario === idUsuario && a.tipo === 'Responsable');

        // If not responsible, check if manager/admin
        if (!esResponsable) {
            // Check if Admin
            const user = await this.userRepo.findOne({ where: { idUsuario }, relations: ['rol'] });
            const isAdmin = ['Admin', 'Administrador', 'SuperAdmin'].includes(user?.rol?.nombre || '') ||
                ['Admin', 'Administrador', 'SuperAdmin'].includes((user as any).rolGlobal || '');

            if (!isAdmin) {
                // Check hierarchy
                const responsable = tarea.asignados?.find(a => a.tipo === 'Responsable');
                let esJefe = false;
                if (responsable) {
                    esJefe = await this.verificarAccesoSubordinado(idUsuario, responsable.idUsuario);
                }

                // Allow if Creator as fallback (optional, but good practice)
                const esCreador = tarea.idCreador === idUsuario;

                if (!esJefe && !esCreador) {
                    throw new InsufficientPermissionsException('revalidar/reasignar esta tarea (No eres el responsable ni su jefe)');
                }
            }
        }

        if (dto.accion === 'Sigue') {
            await this.tareaRepo.save(tarea);
        }
        else if (dto.accion === 'HechaPorOtro') {
            tarea.estado = 'Hecha';
            tarea.fechaHecha = new Date();
            await this.tareaRepo.save(tarea);
        }
        else if (dto.accion === 'NoAplica') {
            tarea.estado = 'Descartada';
            await this.tareaRepo.save(tarea);
        }
        else if (dto.accion === 'Reasignar' && dto.idUsuarioOtro) {
            await this.tareaAsignadoRepo.delete({ idTarea: id, tipo: 'Responsable' });
            await this.tareaAsignadoRepo.save({ idTarea: id, idUsuario: dto.idUsuarioOtro, tipo: 'Responsable' });
            await this.tareaRepo.save(tarea);
        }

        await this.saveAuditLog(idUsuario, 'RevalidarTarea', 'Tarea', id.toString(), {
            accionCorta: dto.accion,
            titulo: tarea.titulo,
            razon: (dto as any).razon,
            usuarioDestino: dto.idUsuarioOtro
        });

        return { ok: true };
    }

    async tareaAsignarResponsable(idTarea: number, idNuevoResponsable: number, idAsignador: number) {
        const tarea = await this.tareaRepo.findOneBy({ idTarea });
        if (!tarea) throw new ResourceNotFoundException('Tarea', idTarea);

        await this.tareaAsignadoRepo.delete({ idTarea, tipo: 'Responsable' });
        await this.tareaAsignadoRepo.save({
            idTarea,
            idUsuario: idNuevoResponsable,
            tipo: 'Responsable'
        });

        await this.saveAuditLog(idAsignador, 'AsignarResponsable', 'Tarea', idTarea.toString(), { idNuevoResponsable });
    }

    async tareaRegistrarAvance(idTarea: number, dto: TareaRegistrarAvanceDto, idUsuario: number) {
        const tarea = await this.tareaRepo.findOneBy({ idTarea });
        if (!tarea) throw new ResourceNotFoundException('Tarea', idTarea);

        const avance = this.tareaAvanceRepo.create({
            idTarea,
            idUsuario,
            progreso: dto.progreso,
            comentario: dto.comentario
        });

        await this.tareaAvanceRepo.save(avance);
        tarea.progreso = dto.progreso;
        await this.tareaRepo.save(tarea);

        await this.saveAuditLog(idUsuario, 'RegistrarAvance', 'Tarea', idTarea.toString(), { progreso: dto.progreso, comentario: dto.comentario });
    }

    async tareaActualizarOrden(id: number, orden: number, idUsuario: number) {
        const tarea = await this.tareaRepo.findOneBy({ idTarea: id });
        if (!tarea) throw new ResourceNotFoundException('Tarea', id);

        tarea.orden = orden;
        await this.tareaRepo.save(tarea);
        return { success: true };
    }

    async tareaReordenar(ids: number[]) {
        const promises = ids.map((id, index) => this.tareaRepo.update(id, { orden: index }));
        await Promise.all(promises);
        return { success: true };
    }

    // --- BLOQUEOS ---
    async bloqueoCrear(dto: BloqueoCrearDto) {
        const bloqueo = this.bloqueoRepo.create({
            idOrigenUsuario: dto.idOrigenUsuario,
            idTarea: dto.idTarea,
            idDestinoUsuario: dto.idDestinoUsuario,
            destinoTexto: dto.destinoTexto,
            motivo: dto.motivo,
            estado: 'Activo'
        });
        const saved = await this.bloqueoRepo.save(bloqueo);
        await this.saveAuditLog(dto.idOrigenUsuario, 'CrearBloqueo', 'Bloqueo', saved.idBloqueo.toString(), { motivo: dto.motivo });
        return saved;
    }

    async bloqueoResolver(id: number, dto: BloqueoResolverDto, idUsuario: number) {
        const bloqueo = await this.bloqueoRepo.findOneBy({ idBloqueo: id });
        if (!bloqueo) throw new ResourceNotFoundException('Bloqueo', id);

        // Check permissions: Creator, Responsible (Destino), or Admin
        if (bloqueo.idOrigenUsuario !== idUsuario && bloqueo.idDestinoUsuario !== idUsuario) {
            const user = await this.userRepo.findOne({ where: { idUsuario }, relations: ['rol'] });
            const isAdmin = ['Admin', 'Administrador', 'SuperAdmin'].includes(user?.rol?.nombre || '') ||
                ['Admin', 'Administrador', 'SuperAdmin'].includes((user as any)?.rolGlobal || '');

            if (!isAdmin) {
                throw new InsufficientPermissionsException('resolver este bloqueo (Solo Creador, Responsable o Admin)');
            }
        }

        bloqueo.estado = 'Resuelto';
        bloqueo.fechaResolucion = new Date();
        const saved = await this.bloqueoRepo.save(bloqueo);
        await this.saveAuditLog(idUsuario, 'ResolverBloqueo', 'Bloqueo', id.toString());
        return saved;
    }

    // --- EQUIPO PLANNING ---
    async equipoHoy(idUsuario: number, fecha: string) {
        const userRequesting = await this.userRepo.findOne({ where: { idUsuario }, relations: ['rol'] });
        const isAdmin = ['Admin', 'Administrador', 'SuperAdmin'].includes(userRequesting?.rol?.nombre || '') ||
            ['Admin', 'Administrador', 'SuperAdmin'].includes((userRequesting as any)?.rolGlobal || '');

        let teamIds: number[] = [];

        if (isAdmin) {
            const allUsers = await this.userRepo.find({ select: ['idUsuario'] });
            teamIds = allUsers.map(u => u.idUsuario);
        } else {
            const user = await this.userRepo.findOne({ where: { idUsuario } });
            if (user && user.carnet) {
                const visibles = await this.visibilidadService.obtenerEmpleadosVisibles(user.carnet);
                teamIds = visibles.map(v => v.idUsuario);
            } else {
                teamIds = [idUsuario];
            }
        }

        if (teamIds.length === 0) return { miembros: [], resumenAnimo: { feliz: 0, neutral: 0, triste: 0, promedio: 0 } };

        const checkins = await this.checkinRepo.find({
            where: {
                idUsuario: In(teamIds),
                fecha: fecha
            },
            relations: ['usuario']
        });

        // Obtener usuarios con relación de rol
        const usuarios = await this.userRepo.find({
            where: { idUsuario: In(teamIds) },
            relations: ['rol']
        });

        // Obtener datos de organización para cada usuario
        const orgData = await this.userOrgRepo.find({
            where: { idUsuario: In(teamIds) },
            relations: ['nodo']
        });

        // Crear mapa de organización por usuario (el más relevante: Gerencia > Subgerencia > Equipo)
        const orgMap: { [key: number]: { nodo: string, tipo: string, rol: string } } = {};
        for (const o of orgData) {
            const current = orgMap[o.idUsuario];
            const tipoPrioridad: any = { 'Dirección': 1, 'Gerencia': 2, 'Subgerencia': 3, 'Equipo': 4 };
            if (!current || (tipoPrioridad[o.nodo?.tipo] || 99) < (tipoPrioridad[current.tipo] || 99)) {
                orgMap[o.idUsuario] = {
                    nodo: o.nodo?.nombre || '',
                    tipo: o.nodo?.tipo || '',
                    rol: o.rol || 'Miembro'
                };
            }
        }

        const bloqueosRaw = await this.bloqueoRepo
            .createQueryBuilder('b')
            .select('b.idOrigenUsuario', 'id')
            .addSelect('COUNT(*)', 'count')
            .where('b.idOrigenUsuario IN (:...ids)', { ids: teamIds })
            .andWhere('b.estado = :estado', { estado: 'Activo' })
            .groupBy('b.idOrigenUsuario')
            .getRawMany();

        const bloqueosMap: any = {};
        bloqueosRaw.forEach(r => bloqueosMap[r.id] = parseInt(r.count, 10));

        const vencidasRaw = await this.tareaRepo.createQueryBuilder('t')
            .innerJoin('t.asignados', 'ta')
            .select('ta.idUsuario', 'id')
            .addSelect('COUNT(*)', 'count')
            .where('ta.idUsuario IN (:...ids)', { ids: teamIds })
            .andWhere('ta.tipo = :tipo', { tipo: 'Responsable' })
            .andWhere('t.estado IN (:...estados)', { estados: ['Pendiente', 'EnCurso'] })
            .andWhere('t.fechaObjetivo < :hoy', { hoy: fecha })
            .groupBy('ta.idUsuario')
            .getRawMany();

        const vencidasMap: any = {};
        vencidasRaw.forEach(r => vencidasMap[r.id] = parseInt(r.count, 10));

        const result: any[] = [];
        for (const u of usuarios) {
            const chk = checkins.find(c => c.idUsuario === u.idUsuario);
            const b = bloqueosMap[u.idUsuario] || 0;
            const v = vencidasMap[u.idUsuario] || 0;
            const org = orgMap[u.idUsuario] || { nodo: '', tipo: '', rol: 'Miembro' };

            result.push({
                usuario: {
                    ...u,
                    // Agregar datos de organización al usuario
                    area: org.nodo,
                    tipoArea: org.tipo,
                    cargo: org.rol
                },
                checkin: chk || null,
                bloqueosActivos: b,
                tareasVencidas: v,
                estado: chk ? (b > 0 ? 'ConBloqueos' : 'AlDia') : 'Pendiente'
            });
        }

        const resumenAnimo = {
            feliz: checkins.filter(c => c.estadoAnimo === 'Tope').length,
            neutral: checkins.filter(c => c.estadoAnimo === 'Bien').length,
            triste: checkins.filter(c => c.estadoAnimo === 'Bajo').length,
            promedio: 0
        };
        const totalMoods = checkins.filter(c => c.estadoAnimo).length;
        if (totalMoods > 0) {
            const sum = (resumenAnimo.feliz * 3) + (resumenAnimo.neutral * 2) + (resumenAnimo.triste * 1);
            resumenAnimo.promedio = parseFloat((sum / totalMoods).toFixed(1));
        }

        return {
            miembros: result,
            resumenAnimo
        };
    }


    async equipoBacklog(idUsuario: number, fecha: string) {
        let teamIds: number[] = [];
        const user = await this.userRepo.findOne({ where: { idUsuario } });
        if (user && user.carnet) {
            const visibles = await this.visibilidadService.obtenerEmpleadosVisibles(user.carnet);
            teamIds = visibles.map(v => v.idUsuario);
        } else {
            teamIds = [idUsuario];
        }

        if (teamIds.length === 0) return [];

        const tasks = await this.tareaRepo.find({
            where: {
                asignados: { idUsuario: In(teamIds), tipo: 'Responsable' },
                estado: In(['Pendiente', 'EnCurso', 'Bloqueada'])
            },
            relations: ['asignados', 'asignados.usuario', 'proyecto']
        });

        return tasks;
    }

    async getBloqueosUsuario(idUsuario: number) {
        return this.bloqueoRepo.find({
            where: { idOrigenUsuario: idUsuario, estado: 'Activo' },
            relations: ['tarea', 'tarea.proyecto'],
            order: { fechaCreacion: 'DESC' }
        });
    }

    // --- PROYECTOS ---
    async proyectoCrear(dto: ProyectoCrearDto, idEjecutor: number) {
        let idNodo = dto.idNodoDuenio;

        // Si no se especifica nodo, buscar el nodo principal del usuario ejecutor
        if (!idNodo) {
            const userOrg = await this.userOrgRepo.findOne({
                where: { idUsuario: idEjecutor },
                order: { idRelacion: 'ASC' }
            });
            if (userOrg) idNodo = userOrg.idNodo;
        }

        // Auto-fill org fields if missing
        let { area, subgerencia, gerencia, fechaInicio, fechaFin } = dto;
        if (!area && !subgerencia && !gerencia) {
            const user = await this.userRepo.findOne({ where: { idUsuario: idEjecutor } });
            if (user) {
                // Map user hierarchy levels to project org fields
                // Assuming standard map: Nivel 1 -> Gerencia, Nivel 2 -> Subgerencia, Nivel 3 -> Area
                gerencia = user.primerNivel || undefined;
                subgerencia = user.segundoNivel || undefined;
                area = user.tercerNivel || undefined;
            }
        }

        const proyecto = this.proyectoRepo.create({
            nombre: dto.nombre,
            descripcion: dto.descripcion,
            idNodoDuenio: idNodo,
            estado: 'Activo',
            area,
            subgerencia,
            gerencia,
            fechaInicio: fechaInicio ? new Date(fechaInicio) : undefined,
            fechaFin: fechaFin ? new Date(fechaFin) : undefined
        });
        const saved = await this.proyectoRepo.save(proyecto);
        await this.saveAuditLog(idEjecutor, 'CrearProyecto', 'Proyecto', saved.idProyecto.toString(), { nombre: dto.nombre });
        return saved;
    }

    async proyectoListar(idUsuario: number, filter: ProyectoFilterDto = { page: 1, limit: 50 }) {
        try {
            const user = await this.userRepo.findOne({ where: { idUsuario }, relations: ['rol'] });
            const isAdmin = ['Admin', 'Administrador', 'SuperAdmin'].includes(user?.rol?.nombre || '') ||
                ['Admin', 'Administrador', 'SuperAdmin'].includes((user as any)?.rolGlobal || '');

            const queryB = this.proyectoRepo.createQueryBuilder('p')
                .leftJoinAndSelect('p.nodoDuenio', 'nodoDuenio')
                .where('p.estado != :archived', { archived: 'Archivado' });

            if (!isAdmin) {
                // 1. Visibilidad por jerarquía
                const myNodesRel = await this.userOrgRepo.find({ where: { idUsuario }, select: ['idNodo'] });
                const myNodeIds = myNodesRel.map(r => r.idNodo);
                const subNodeIds = await this.getSubtreeNodeIds(idUsuario);
                const allVisibleNodeIds = [...myNodeIds, ...subNodeIds];

                // 2. Visibilidad por asignación
                const assignedTasks = await this.tareaAsignadoRepo.find({
                    where: { idUsuario },
                    relations: ['tarea'],
                    select: ['idTarea', 'tarea']
                });
                const assignedProjectIds = assignedTasks
                    .filter(at => at.tarea && at.tarea.idProyecto)
                    .map(at => at.tarea.idProyecto);

                queryB.andWhere(new Brackets(qb => {
                    if (allVisibleNodeIds.length > 0) {
                        qb.where('p.idNodoDuenio IN (:...nodeIds)', { nodeIds: allVisibleNodeIds });
                    }
                    if (assignedProjectIds.length > 0) {
                        if (allVisibleNodeIds.length > 0) {
                            qb.orWhere('p.idProyecto IN (:...projectIds)', { projectIds: assignedProjectIds });
                        } else {
                            qb.where('p.idProyecto IN (:...projectIds)', { projectIds: assignedProjectIds });
                        }
                    }
                    if (allVisibleNodeIds.length === 0 && assignedProjectIds.length === 0) {
                        qb.where('1=0'); // No tiene visibilidad sobre nada
                    }
                }));
            }

            // Aplicar filtros adicionales
            if (filter.nombre) {
                queryB.andWhere('p.nombre ILIKE :nombre', { nombre: `%${filter.nombre}%` });
            }
            if (filter.estado) {
                queryB.andWhere('p.estado = :estado', { estado: filter.estado });
            }
            if (filter.gerencia) {
                queryB.andWhere('p.gerencia = :gerencia', { gerencia: filter.gerencia });
            }
            if (filter.subgerencia) {
                queryB.andWhere('p.subgerencia = :subgerencia', { subgerencia: filter.subgerencia });
            }
            if (filter.area) {
                queryB.andWhere('p.area = :area', { area: filter.area });
            }

            // Paginación
            const page = Number(filter.page) || 1;
            const limit = Number(filter.limit) || 50;
            queryB.skip((page - 1) * limit).take(limit).orderBy('p.idProyecto', 'DESC');

            const [items, total] = await queryB.getManyAndCount();

            // Calcular Progreso para los proyectos resultantes
            const projectIds = items.map(p => p.idProyecto);
            if (projectIds.length > 0) {
                const stats = await this.tareaRepo.createQueryBuilder('t')
                    .select('t.idProyecto', 'idProyecto')
                    .addSelect('COUNT(*)', 'total')
                    .addSelect("SUM(case when t.estado = 'Hecha' then 1 else 0 end)", 'hechas')
                    .where('t.idProyecto IN (:...ids)', { ids: projectIds })
                    .groupBy('t.idProyecto')
                    .getRawMany();

                const statsMap = new Map();
                stats.forEach(s => statsMap.set(s.idProyecto, s));

                items.forEach(p => {
                    const s = statsMap.get(p.idProyecto);
                    if (s && parseInt(s.total) > 0) {
                        (p as any).progreso = Math.round((parseInt(s.hechas) / parseInt(s.total)) * 100);
                    } else {
                        (p as any).progreso = 0;
                    }
                });
            }

            return {
                items,
                total,
                page,
                lastPage: Math.ceil(total / limit)
            };

        } catch (e) {
            console.error('Error in proyectoListar:', e);
            throw new InternalServerErrorException(e.message);
        }
    }

    async proyectoObtener(id: number) {
        const proyecto = await this.proyectoRepo.findOne({
            where: { idProyecto: id },
            relations: ['nodoDuenio']
        });
        if (!proyecto) throw new ResourceNotFoundException('Proyecto', id);
        return proyecto;
    }

    async tareasDeProyecto(idProyecto: number, idUsuario: number) {
        // Simplificado: ver todas por ahora si tienes acceso al folder o eres admin
        return this.tareaRepo.find({
            where: { idProyecto },
            relations: ['asignados', 'asignados.usuario', 'proyecto', 'avances', 'avances.usuario']
        });
    }

    async proyectoActualizar(id: number, dto: Partial<ProyectoCrearDto>, idEjecutor: number) {
        const proyecto = await this.proyectoRepo.findOneBy({ idProyecto: id });
        if (!proyecto) throw new ResourceNotFoundException('Proyecto', id);

        if (dto.nombre) proyecto.nombre = dto.nombre;
        if (dto.descripcion !== undefined) proyecto.descripcion = dto.descripcion;
        if (dto.idNodoDuenio) proyecto.idNodoDuenio = dto.idNodoDuenio;

        // Nuevos campos organizacionales y fechas
        if (dto.area !== undefined) proyecto.area = dto.area;
        if (dto.subgerencia !== undefined) proyecto.subgerencia = dto.subgerencia;
        if (dto.gerencia !== undefined) proyecto.gerencia = dto.gerencia;
        if (dto.fechaInicio) proyecto.fechaInicio = new Date(dto.fechaInicio);
        if (dto.fechaFin) proyecto.fechaFin = new Date(dto.fechaFin);

        const saved = await this.proyectoRepo.save(proyecto);
        await this.saveAuditLog(idEjecutor, 'ActualizarProyecto', 'Proyecto', id.toString(), { dto });
        return saved;
    }

    async proyectoEnllavar(id: number, enllavado: boolean, idEjecutor: number) {
        const proyecto = await this.proyectoRepo.findOneBy({ idProyecto: id });
        if (!proyecto) throw new ResourceNotFoundException('Proyecto', id);

        proyecto.enllavado = enllavado;
        await this.proyectoRepo.save(proyecto);

        await this.saveAuditLog(idEjecutor, 'EnllavarProyecto', 'Proyecto', id.toString(), { enllavado });
        return proyecto;
    }

    async proyectoEliminar(id: number, idEjecutor: number) {
        const proyecto = await this.proyectoRepo.findOneBy({ idProyecto: id });
        if (!proyecto) throw new ResourceNotFoundException('Proyecto', id);

        proyecto.estado = 'Archivado';
        await this.proyectoRepo.save(proyecto);

        await this.saveAuditLog(idEjecutor, 'EliminarProyecto', 'Proyecto', id.toString());
        return { success: true };
    }

    async getOrganizacionDesdeUsuarios(idUsuario: number) {
        const user = await this.userRepo.findOne({ where: { idUsuario } });
        if (!user) throw new ResourceNotFoundException('Usuario', idUsuario);

        const isAdmin = ['Admin', 'Administrador', 'SuperAdmin'].includes(user.rolGlobal || '');

        if (isAdmin) {
            // Usar nombres de COLUMNAS reales para fragmentos SQL raw
            const rawData = await this.userRepo.createQueryBuilder('u')
                .select('COALESCE(u.ogerencia, u.gerencia, u.orgGerencia)', 'gerencia')
                .addSelect('u.subgerencia', 'subgerencia')
                .addSelect('u.primer_nivel', 'area')
                .where('u.activo = true')
                .andWhere('(u.ogerencia IS NOT NULL OR u.gerencia IS NOT NULL OR u.orgGerencia IS NOT NULL)')
                .groupBy('1, 2, 3')
                .orderBy('1', 'ASC')
                .addOrderBy('u.subgerencia', 'ASC')
                .addOrderBy('u.primer_nivel', 'ASC')
                .getRawMany();
            return rawData;
        } else {
            if (!user.carnet) return [];
            const visibles = await this.visibilidadService.obtenerEmpleadosVisibles(user.carnet);

            const result: any[] = [];
            const seen = new Set<string>();

            for (const emp of visibles) {
                const gerencia = (emp as any).ogerencia || (emp as any).gerencia || (emp as any).orgGerencia;
                if (!gerencia) continue;

                const subg = (emp as any).subgerencia || null;
                const area = (emp as any).primerNivel || null;

                const key = `${gerencia}|${subg || ''}|${area || ''}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    result.push({
                        gerencia: gerencia,
                        subgerencia: subg,
                        area: area
                    });
                }
            }
            return result.sort((a, b) => (a.gerencia || '').localeCompare(b.gerencia || ''));
        }
    }

    async getDashboardKPIs(idUsuario: number) {
        const user = await this.userRepo.findOne({ where: { idUsuario }, relations: ['rol'] });
        const isAdmin = ['Admin', 'Administrador', 'SuperAdmin'].includes(user?.rol?.nombre || '') ||
            ['Admin', 'Administrador', 'SuperAdmin'].includes((user as any).rolGlobal || '');

        let scopeUserIds: number[] = [];
        if (isAdmin) {
            const allUsers = await this.userRepo.find({ select: ['idUsuario'] });
            scopeUserIds = allUsers.map(u => u.idUsuario);
        } else {
            const user = await this.userRepo.findOne({ where: { idUsuario } });
            if (user && user.carnet) {
                const visibles = await this.visibilidadService.obtenerEmpleadosVisibles(user.carnet);
                scopeUserIds = visibles.map(v => v.idUsuario);
            } else {
                scopeUserIds = [idUsuario];
            }
        }

        const totalUsuarios = scopeUserIds.length;
        const activeUsersCount = await this.checkinRepo.createQueryBuilder('c')
            .select('DISTINCT "idUsuario"')
            .where('"idUsuario" IN (:...ids)', { ids: scopeUserIds })
            .andWhere('fecha = :today', { today: new Date().toISOString().split('T')[0] })
            .getCount();

        const tasks = await this.tareaRepo.find({
            where: { asignados: { idUsuario: In(scopeUserIds), tipo: 'Responsable' } },
            relations: ['asignados', 'proyecto']
        });

        const todayStr = new Date().toISOString().split('T')[0];
        const completadasHoy = tasks.filter(t => t.estado === 'Hecha' && t.fechaHecha && new Date(t.fechaHecha).toISOString().startsWith(todayStr)).length;
        const bloqueadas = tasks.filter(t => t.estado === 'Bloqueada').length;
        const atrasadas = tasks.filter(t => {
            if (['Hecha', 'Cancelada', 'Descartada'].includes(t.estado)) return false;
            if (!t.fechaObjetivo) return false;
            return t.fechaObjetivo < todayStr;
        }).length;

        // 5. Projects with most overdue/blocked tasks
        const proyectoRiesgo: Record<string, { atrasadas: number, bloqueadas: number }> = {};
        tasks.forEach(t => {
            const pName = t.proyecto?.nombre || 'Sin Proyecto';
            if (!proyectoRiesgo[pName]) proyectoRiesgo[pName] = { atrasadas: 0, bloqueadas: 0 };

            const isDone = ['Hecha', 'Cancelada', 'Descartada'].includes(t.estado);
            const tDate = t.fechaObjetivo || null;
            const isOverdue = !isDone && tDate && tDate < todayStr;

            if (isOverdue) proyectoRiesgo[pName].atrasadas++;
            if (t.estado === 'Bloqueada') proyectoRiesgo[pName].bloqueadas++;
        });

        const proyectosEnRiesgoList = Object.entries(proyectoRiesgo)
            .filter(([, v]) => v.atrasadas > 0 || v.bloqueadas > 0)
            .map(([nombre, v]) => ({ nombre, ...v }))
            .sort((a, b) => (b.atrasadas + b.bloqueadas) - (a.atrasadas + a.bloqueadas))
            .slice(0, 5);

        // 6. Overloaded People (> 5 pending tasks)
        // Count tasks per user in scope
        const cargaPorUsuario: Record<number, { count: number }> = {};
        const userMap = new Map();
        const usersInfo = await this.userRepo.find({ where: { idUsuario: In(scopeUserIds) } });
        usersInfo.forEach(u => userMap.set(u.idUsuario, u));

        tasks.forEach(t => {
            if (['Pendiente', 'EnCurso', 'Pausa'].includes(t.estado)) {
                t.asignados.forEach(asig => {
                    if (scopeUserIds.includes(asig.idUsuario)) {
                        if (!cargaPorUsuario[asig.idUsuario]) {
                            cargaPorUsuario[asig.idUsuario] = { count: 0 };
                        }
                        cargaPorUsuario[asig.idUsuario].count++;
                    }
                });
            }
        });

        const personasSobrecargadas = Object.entries(cargaPorUsuario)
            .map(([uidStr, val]) => {
                const uid = Number(uidStr);
                const info = userMap.get(uid);
                return {
                    nombre: info?.nombre || 'Unknown',
                    pendientes: val.count,
                    area: info?.area || 'Sin Área'
                };
            })
            .filter(u => u.pendientes >= 5)
            .sort((a, b) => b.pendientes - a.pendientes)
            .slice(0, 5);

        // 7. Critical Blockers (> 48h)
        const activeBloqueos = await this.bloqueoRepo.find({
            where: {
                estado: 'Activo',
                tarea: { asignados: { idUsuario: In(scopeUserIds) } }
            },
            relations: ['tarea']
        });

        const nowTime = new Date().getTime();
        const bloqueosCriticos = activeBloqueos.map(b => {
            const createdTime = new Date(b.fechaCreacion).getTime();
            const dias = Math.floor((nowTime - createdTime) / (1000 * 60 * 60 * 24));
            return {
                motivo: b.motivo,
                dias,
                tarea: b.tarea?.titulo || 'Desconocida'
            };
        })
            .filter(b => b.dias >= 2)
            .sort((a, b) => b.dias - a.dias)
            .slice(0, 5);

        // 8. Participation Logic
        const participatingUserIds = new Set<number>();
        tasks.forEach(t => {
            if (t.estado === 'Hecha' && t.fechaHecha && new Date(t.fechaHecha).toISOString().startsWith(todayStr)) {
                t.asignados.forEach(a => {
                    if (scopeUserIds.includes(a.idUsuario)) participatingUserIds.add(a.idUsuario);
                });
            }
        });
        const participacionHoy = Math.round((participatingUserIds.size / (activeUsersCount || 1)) * 100);

        // 9. Tendencia Semanal (linear comparison)
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);
        const last7DaysTasks = tasks.filter(t => {
            if (t.estado !== 'Hecha' || !t.fechaHecha) return false;
            const fHecha = new Date(t.fechaHecha);
            return fHecha >= last7Days && !fHecha.toISOString().startsWith(todayStr);
        });

        const avgLast7Days = last7DaysTasks.length / 7;
        let tendenciaSemanal = 0;
        if (avgLast7Days > 0) {
            tendenciaSemanal = Math.round(((completadasHoy - avgLast7Days) / avgLast7Days) * 100);
        } else if (completadasHoy > 0) {
            tendenciaSemanal = 100;
        }

        return {
            totalUsuarios,
            usuariosActivos: activeUsersCount,
            participacionHoy,
            totalTareas: tasks.length,
            tareasCompletadasHoy: completadasHoy,
            tareasBloqueadas: bloqueadas,
            tareasAtrasadas: atrasadas,
            proyectosEnRiesgo: proyectosEnRiesgoList,
            personasSobrecargadas,
            bloqueosCriticos,
            tendenciaSemanal
        };
    }
    async getCatalogJerarquia() {
        // Direct query instead of ViewEntity - more robust for multi-country/org scenarios
        const rawData = await this.userRepo.createQueryBuilder('u')
            .select('COALESCE(u.ogerencia, u.gerencia)', 'ogerencia')
            .addSelect('u.subgerencia', 'subgerencia')
            .addSelect('u.primer_nivel', 'area')
            .where('u.activo = true')
            .andWhere('(u.ogerencia IS NOT NULL OR u.gerencia IS NOT NULL)')
            .groupBy('COALESCE(u.ogerencia, u.gerencia), u.subgerencia, u.primer_nivel')
            .orderBy('1', 'ASC')
            .addOrderBy('u.subgerencia', 'ASC')
            .addOrderBy('u.primer_nivel', 'ASC')
            .getRawMany();

        return rawData.map((row, idx) => ({
            id: idx + 1,
            ogerencia: row.ogerencia,
            subgerencia: row.subgerencia,
            area: row.area
        }));
    }
    async confirmarProyecto(idProyecto: number, idUsuario: number) {
        const proyecto = await this.proyectoRepo.findOne({ where: { idProyecto } });
        if (!proyecto) throw new ResourceNotFoundException('Proyecto', idProyecto);

        const usuario = await this.userRepo.findOne({ where: { idUsuario } });
        const esAdmin = usuario?.rolGlobal === 'Admin' || usuario?.rolGlobal === 'SuperAdmin';

        if (!esAdmin) throw new ForbiddenException('Solo administradores pueden confirmar proyectos');

        proyecto.estado = 'Confirmado';
        return await this.proyectoRepo.save(proyecto);
    }
}
