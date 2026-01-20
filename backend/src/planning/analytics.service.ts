import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { PlanTrabajo } from './entities/plan-trabajo.entity';
import { Tarea } from './entities/tarea.entity';
import { UsuarioOrganizacion } from '../auth/entities/usuario-organizacion.entity';
import { Usuario } from '../auth/entities/usuario.entity';
import { Proyecto } from './entities/proyecto.entity';
import { Bloqueo } from '../clarity/entities/bloqueo.entity';

@Injectable()
export class AnalyticsService {
    constructor(
        @InjectRepository(PlanTrabajo) private planRepo: Repository<PlanTrabajo>,
        @InjectRepository(Tarea) private tareaRepo: Repository<Tarea>,
        @InjectRepository(UsuarioOrganizacion) private userOrgRepo: Repository<UsuarioOrganizacion>,
        @InjectRepository(Usuario) private userRepo: Repository<Usuario>,
        @InjectRepository(Proyecto) private proyectoRepo: Repository<Proyecto>,
        @InjectRepository(Bloqueo) private bloqueoRepo: Repository<Bloqueo>,
    ) { }

    async getDashboardStats(managerId: number, month: number, year: number) {
        // En una implementación real, filtraríamos por la jerarquía del managerId.
        // Por ahora, asumimos Global (Admin).

        // 1. Plan Adoption (Coverage)
        const plans = await this.planRepo.find({
            where: { mes: month, anio: year },
            relations: ['usuario']
        });

        // Calculate Users without Plan
        const allUsersRaw = await this.userRepo.find({ where: { activo: true } });
        // Filter out Test users (Gustavo Test) to clean dashboard
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
        // Find tasks in Plan OR tasks with Target Date in range
        const lastDay = new Date(year, month, 0).getDate();
        const startStr = `${year}-${month.toString().padStart(2, '0')}-01`;
        const endStr = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;

        let tasks = await this.tareaRepo.find({
            where: [
                { plan: { mes: month, anio: year } },
                { fechaObjetivo: Between(startStr, endStr) }
            ],
            relations: ['plan', 'plan.usuario', 'proyecto']
        });

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

        // 4. Project List with Progress
        const activeProjects = await this.proyectoRepo.find({
            where: { estado: 'Activo' },
            relations: ['tareas']
        });

        const projectsStats = activeProjects.map(p => {
            const pTasks = p.tareas || [];
            const total = pTasks.length;
            const done = pTasks.filter(t => t.estado === 'Hecha').length;
            const inProgress = pTasks.filter(t => t.estado === 'EnCurso').length;
            const progress = total > 0 ? Math.round((done / total) * 100) : 0;
            const atrasadas = pTasks.filter(t => t.estado !== 'Hecha' && t.fechaObjetivo && new Date(t.fechaObjetivo) < today).length;
            const bloqueadas = pTasks.filter(t => t.estado === 'Bloqueada').length;

            return {
                id: p.idProyecto,
                nombre: p.nombre,
                gerencia: p.gerencia,
                subgerencia: p.subgerencia,
                area: p.area,
                progress,
                totalTasks: total,
                hechas: done,     // Nuevo campo
                enCurso: inProgress, // Nuevo campo
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
                })).slice(0, 50) // Limit to avoid massive payload
            };
        }).sort((a, b) => a.progress - b.progress);

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
