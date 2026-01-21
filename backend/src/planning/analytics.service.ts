import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { PlanTrabajo } from './entities/plan-trabajo.entity';
import { Tarea } from './entities/tarea.entity';
import { UsuarioOrganizacion } from '../auth/entities/usuario-organizacion.entity';
import { Usuario } from '../auth/entities/usuario.entity';
import { Proyecto } from './entities/proyecto.entity';
import { Bloqueo } from '../clarity/entities/bloqueo.entity';
import { VisibilidadService } from '../acceso/visibilidad.service';

@Injectable()
export class AnalyticsService {
    constructor(
        @InjectRepository(PlanTrabajo) private planRepo: Repository<PlanTrabajo>,
        @InjectRepository(Tarea) private tareaRepo: Repository<Tarea>,
        @InjectRepository(UsuarioOrganizacion) private userOrgRepo: Repository<UsuarioOrganizacion>,
        @InjectRepository(Usuario) private userRepo: Repository<Usuario>,
        @InjectRepository(Proyecto) private proyectoRepo: Repository<Proyecto>,
        @InjectRepository(Bloqueo) private bloqueoRepo: Repository<Bloqueo>,
        private visibilidadService: VisibilidadService,
    ) { }

    async getDashboardStats(managerId: number, month: number, year: number) {
        // Obtener el usuario que solicita
        const requestingUser = await this.userRepo.findOne({ where: { idUsuario: managerId } });
        const isAdmin = ['Admin', 'Administrador', 'SuperAdmin'].includes(requestingUser?.rolGlobal || '');

        // Obtener IDs de usuarios visibles (subordinados + él mismo)
        let visibleUserIds: number[] = [];
        if (isAdmin) {
            // Admin ve todo
            const allUsers = await this.userRepo.find({ where: { activo: true }, select: ['idUsuario'] });
            visibleUserIds = allUsers.map(u => u.idUsuario);
        } else if (requestingUser?.carnet) {
            // Líder ve a sus subordinados
            const visibles = await this.visibilidadService.obtenerEmpleadosVisibles(requestingUser.carnet);
            visibleUserIds = visibles.map(v => v.idUsuario);
        } else {
            // Usuario normal solo se ve a sí mismo
            visibleUserIds = [managerId];
        }

        // 1. Plan Adoption (Coverage) - Solo planes de usuarios visibles
        const plans = await this.planRepo.find({
            where: { mes: month, anio: year, idUsuario: In(visibleUserIds) },
            relations: ['usuario']
        });

        // Calculate Users without Plan (solo de usuarios visibles)
        const allUsersRaw = await this.userRepo.find({ where: { activo: true, idUsuario: In(visibleUserIds) } });
        const allUsers = allUsersRaw.filter(u => !u.nombre.toLowerCase().includes('gustavo test'));

        const usersWithPlanIds = new Set(plans.map(p => p.idUsuario));
        const usersWithoutPlan = allUsers
            .filter(u => !usersWithPlanIds.has(u.idUsuario) && u.rolGlobal !== 'Admin' && u.rolGlobal !== 'SuperAdmin')
            .map(u => ({
                id: u.idUsuario,
                nombre: u.nombre,
                correo: u.correo,
                rol: u.rolGlobal
            }));

        const statusDist = { Borrador: 0, Confirmado: 0, Cerrado: 0 };
        plans.forEach(p => {
            if (statusDist[p.estado] !== undefined) statusDist[p.estado]++;
        });

        // 2. Task Completion & Hierarchy Analysis
        // Find tasks in Plan OR tasks with Target Date in range - SOLO DE USUARIOS VISIBLES
        const lastDay = new Date(year, month, 0).getDate();
        const startStr = `${year}-${month.toString().padStart(2, '0')}-01`;
        const endStr = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;

        // Primera consulta: tareas del mes seleccionado
        let tasks = await this.tareaRepo.find({
            where: [
                { plan: { mes: month, anio: year, idUsuario: In(visibleUserIds) } },
                { fechaObjetivo: Between(startStr, endStr) }
            ],
            relations: ['plan', 'plan.usuario', 'proyecto', 'asignados', 'asignados.usuario']
        });

        // Filtrar tareas: solo las de planes de usuarios visibles O asignadas a usuarios visibles
        tasks = tasks.filter(t => {
            const planUserId = t.plan?.idUsuario;
            const assignedUserIds = t.asignados?.map(a => a.idUsuario) || [];
            return visibleUserIds.includes(planUserId) || assignedUserIds.some(id => visibleUserIds.includes(id));
        });

        // FALLBACK: Si no hay tareas en el mes, buscar TODAS las tareas activas de usuarios visibles
        if (tasks.length === 0) {
            console.log('[AnalyticsService] No hay tareas en el mes, buscando todas las tareas activas...');
            tasks = await this.tareaRepo.find({
                where: {
                    estado: In(['Pendiente', 'EnCurso', 'Bloqueada']),
                    asignados: { idUsuario: In(visibleUserIds) }
                },
                relations: ['plan', 'plan.usuario', 'proyecto', 'asignados', 'asignados.usuario']
            });

            // Agregar también tareas completadas recientemente (últimos 30 días)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const completedTasks = await this.tareaRepo.find({
                where: {
                    estado: 'Hecha',
                    asignados: { idUsuario: In(visibleUserIds) }
                },
                relations: ['plan', 'plan.usuario', 'proyecto', 'asignados', 'asignados.usuario']
            });

            // Concatenar y eliminar duplicados
            const allTaskIds = new Set(tasks.map(t => t.idTarea));
            completedTasks.forEach(t => {
                if (!allTaskIds.has(t.idTarea)) {
                    tasks.push(t);
                }
            });
        }

        // Filter tasks from test user
        tasks = tasks.filter(t => !t.plan?.usuario?.nombre.toLowerCase().includes('gustavo test'));

        const totalTasks = tasks.length;
        const doneTasks = tasks.filter(t => t.estado === 'Hecha').length;
        const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

        // Group by Hierarchy (Subgerencia - Area)
        const today = new Date();
        const areaStats: Record<string, { total: number, atrasadas: number, pendientes: number, enCurso: number, hechas: number, bloqueadas: number }> = {};
        const tasksDetails: any[] = []; // Lightweight list for frontend drilldown

        tasks.forEach(t => {
            let area = 'General';
            const p = t.proyecto;
            if (p) {
                if (p.subgerencia) {
                    area = p.subgerencia;
                    if (p.area) area += ` / ${p.area}`;
                } else if (p.area) {
                    area = p.area;
                } else if (p.gerencia) {
                    area = p.gerencia;
                }
            }

            // Normalizar fechas para comparar solo días (evitar falsos atrasos por hora)
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            let targetDate = t.fechaObjetivo ? new Date(t.fechaObjetivo) : null;
            // Ajustar al inicio del día si existe fecha, compensando posible shift UTC si es string puro
            if (targetDate) {
                // Si la fecha viene como string YYYY-MM-DD, a veces JS la toma UTC 00:00
                // Queremos asegurar que la comparacion sea justa.
                // Si targetDate (00:00) < todayStart (00:00) -> Atrasada (Vencio ayer o antes)
                // Si targetDate (00:00) == todayStart (00:00) -> Vence hoy (NO Atrasada aun)
                targetDate.setHours(0, 0, 0, 0);
                // Añadir pequeño margen para timezone offset si es necesario, pero start of day comparison suele bastar
            }

            const isDelayed = t.estado !== 'Hecha' && targetDate && targetDate.getTime() < todayStart.getTime();

            if (!areaStats[area]) areaStats[area] = { total: 0, atrasadas: 0, pendientes: 0, enCurso: 0, hechas: 0, bloqueadas: 0 };

            areaStats[area].total++;

            // Status counts
            if (t.estado === 'Pendiente') areaStats[area].pendientes++;
            else if (t.estado === 'EnCurso') areaStats[area].enCurso++;
            else if (t.estado === 'Hecha') areaStats[area].hechas++;
            else if (t.estado === 'Bloqueada') areaStats[area].bloqueadas++;

            if (isDelayed) {
                areaStats[area].atrasadas++;
            }

            // Populate drilldown data
            tasksDetails.push({
                id: t.idTarea,
                titulo: t.titulo,
                responsable: t.asignados?.[0]?.usuario?.nombre || 'Sin asignar',
                estado: t.estado,
                isDelayed,
                area,
                fechaObjetivo: t.fechaObjetivo
            });
        });

        const hierarchyBreakdown = Object.entries(areaStats).map(([name, stats]) => ({
            name,
            ...stats,
            cumplimiento: stats.total > 0 ? Math.round(((stats.total - stats.atrasadas) / stats.total) * 100) : 100
        })).sort((a, b) => a.cumplimiento - b.cumplimiento); // Sort by lowest compliance (worst first)

        // 3. Detailed Top Delays
        const overdueTasks = tasks.filter(t => t.estado !== 'Hecha' && t.fechaObjetivo && new Date(t.fechaObjetivo) < today);
        const topDelays = overdueTasks
            .map(t => ({
                id: t.idTarea,
                titulo: t.titulo,
                usuario: t.plan?.usuario?.nombre || 'Desconocido',
                area: t.proyecto?.area || 'General',
                fechaObjetivo: t.fechaObjetivo,
                diasAtraso: Math.floor((today.getTime() - new Date(t.fechaObjetivo).getTime()) / (1000 * 3600 * 24))
            }))
            .sort((a, b) => b.diasAtraso - a.diasAtraso)
            .slice(0, 15);

        // 4. Project List with Progress - FILTRADO POR USUARIOS VISIBLES
        const activeProjects = await this.proyectoRepo.find({
            where: { estado: 'Activo' },
            relations: ['tareas', 'tareas.asignados']
        });

        // Filtrar proyectos: solo los que tienen tareas asignadas a usuarios visibles
        let filteredProjectsSorted = activeProjects.filter(p => {
            if (!p.tareas || p.tareas.length === 0) return false;
            // El proyecto es visible si al menos una tarea tiene un asignado en visibleUserIds
            return p.tareas.some(t =>
                t.asignados?.some(a => visibleUserIds.includes(a.idUsuario))
            );
        });

        // FALLBACK: Si no hay proyectos por asignación directa, buscar por gerencia/departamento
        if (filteredProjectsSorted.length === 0 && !isAdmin) {
            const gerenciasVisibles = new Set<string>();
            if (requestingUser?.departamento) {
                gerenciasVisibles.add(requestingUser.departamento.toUpperCase());
            }

            const subordinados = await this.userRepo.find({
                where: { idUsuario: In(visibleUserIds) },
                select: ['departamento', 'cargo']
            });
            subordinados.forEach(s => {
                if (s.departamento) gerenciasVisibles.add(s.departamento.toUpperCase());
                if (s.cargo?.toUpperCase().includes('RECURSOS HUMANOS')) {
                    gerenciasVisibles.add('RECURSOS HUMANOS');
                }
            });

            if (gerenciasVisibles.size > 0) {
                filteredProjectsSorted = activeProjects.filter(p => {
                    const proyGerencia = (p.gerencia || '').toUpperCase();
                    const proySubgerencia = (p.subgerencia || '').toUpperCase();
                    return Array.from(gerenciasVisibles).some(g =>
                        proyGerencia.includes(g) || proySubgerencia.includes(g) ||
                        (g.includes('RECURSOS HUMANOS') && proyGerencia.includes('RECURSOS HUMANOS'))
                    );
                });
            }
        }

        const projectsStats = filteredProjectsSorted.map(p => {
            // Filtrar solo las tareas de usuarios visibles dentro del proyecto
            const pTasks = (p.tareas || []).filter(t =>
                t.asignados?.some(a => visibleUserIds.includes(a.idUsuario))
            );
            const total = pTasks.length;
            const done = pTasks.filter(t => t.estado === 'Hecha').length;
            const inProgress = pTasks.filter(t => t.estado === 'EnCurso').length;
            const progress = total > 0 ? Math.round((done / total) * 100) : 0;
            const atrasadas = pTasks.filter(t => t.estado !== 'Hecha' && t.fechaObjetivo && new Date(t.fechaObjetivo) < today).length;
            const bloqueadas = pTasks.filter(t => t.estado === 'Bloqueada').length;

            // Calcular progreso esperado basado en cronograma
            let expectedProgress = 0;
            if (p.fechaInicio && p.fechaFin) {
                const startDate = new Date(p.fechaInicio);
                const endDate = new Date(p.fechaFin);
                const totalMs = endDate.getTime() - startDate.getTime();
                const elapsedMs = today.getTime() - startDate.getTime();

                if (totalMs > 0) {
                    if (today < startDate) expectedProgress = 0;
                    else if (today > endDate) expectedProgress = 100;
                    else expectedProgress = Math.round((elapsedMs / totalMs) * 100);
                }
            } else if (pTasks.length > 0) {
                // Fallback por fechas de tareas
                const tasksWithDates = pTasks.filter(t => t.fechaInicioPlanificada && t.fechaObjetivo);
                if (tasksWithDates.length > 0) {
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

            const deviation = progress - expectedProgress;

            return {
                id: p.idProyecto,
                nombre: p.nombre,
                gerencia: p.gerencia,
                subgerencia: p.subgerencia,
                area: p.area,
                fechaInicio: p.fechaInicio,
                fechaFin: p.fechaFin,
                progress,
                expectedProgress,  // NUEVO
                deviation,         // NUEVO
                totalTasks: total,
                hechas: done,
                enCurso: inProgress,
                atrasadas,
                bloqueadas,
                tareas: pTasks.map(t => ({
                    id: t.idTarea,
                    titulo: t.titulo,
                    estado: t.estado,
                    prioridad: t.prioridad,
                    progreso: t.progreso || 0,
                    fechaInicio: t.fechaInicioPlanificada,
                    fechaObjetivo: t.fechaObjetivo,
                    atrasada: t.estado !== 'Hecha' && t.fechaObjetivo && new Date(t.fechaObjetivo) < today
                })).slice(0, 50)
            };
        }).sort((a, b) => a.deviation - b.deviation); // Ordenar por mayor atraso primero

        // 5. Blockers Detail
        const activeBlockers = await this.bloqueoRepo.find({
            where: { estado: 'Activo' },
            relations: ['tarea', 'tarea.proyecto', 'origenUsuario']
        });

        const blockersDetail = activeBlockers.map(b => ({
            id: b.idBloqueo,
            motivo: b.motivo,
            fecha: b.fechaCreacion,
            usuario: b.origenUsuario?.nombre,
            tarea: b.tarea?.titulo,
            proyecto: b.tarea?.proyecto?.nombre,
            dias: Math.floor((today.getTime() - new Date(b.fechaCreacion).getTime()) / (1000 * 3600 * 24))
        })).sort((a, b) => b.dias - a.dias);

        return {
            statusDistribution: [
                { name: 'Borrador', value: statusDist.Borrador, fill: '#94a3b8' },
                { name: 'Confirmado', value: statusDist.Confirmado, fill: '#f59e0b' },
                { name: 'Cerrado', value: statusDist.Cerrado, fill: '#10b981' },
            ],
            globalCompletion: completionRate,
            totalActivePlans: plans.length,
            usersWithoutPlanCount: usersWithoutPlan.length,
            usersWithoutPlan,
            hierarchyBreakdown,
            topDelays,
            projectsStats,
            blockersDetail,
            bottlenecks: hierarchyBreakdown.map(h => ({ name: h.name, count: h.atrasadas })).slice(0, 5),
            tasksDetails
        };
    }
}
