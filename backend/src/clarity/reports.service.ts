import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource, Not } from 'typeorm';
import { Usuario } from '../auth/entities/usuario.entity';
import { OrganizacionNodo } from '../auth/entities/organizacion-nodo.entity';
import { UsuarioOrganizacion } from '../auth/entities/usuario-organizacion.entity';
import { Tarea } from '../planning/entities/tarea.entity';
import { Proyecto } from '../planning/entities/proyecto.entity';
import { Bloqueo } from './entities/bloqueo.entity';
import { Checkin } from './entities/checkin.entity';
import { ReportFilterDto } from './dto/clarity.dtos';
import { VisibilidadService } from '../acceso/visibilidad.service';

@Injectable()
export class ReportsService {
    constructor(
        @InjectRepository(Usuario) private userRepo: Repository<Usuario>,
        @InjectRepository(Tarea) private tareaRepo: Repository<Tarea>,
        @InjectRepository(Bloqueo) private bloqueoRepo: Repository<Bloqueo>,
        @InjectRepository(OrganizacionNodo) private nodoRepo: Repository<OrganizacionNodo>,
        @InjectRepository(UsuarioOrganizacion) private userOrgRepo: Repository<UsuarioOrganizacion>,
        @InjectRepository(Checkin) private checkinRepo: Repository<Checkin>,
        @InjectRepository(Proyecto) private proyectoRepo: Repository<Proyecto>,
        private dataSource: DataSource,
        private visibilidadService: VisibilidadService,
    ) { }

    private getDateRange(month?: number, year?: number) {
        let startDate: Date;
        let endDate: Date;

        if (month && year) {
            startDate = new Date(year, month - 1, 1);
            endDate = new Date(year, month, 0, 23, 59, 59);
        } else if (year) {
            startDate = new Date(year, 0, 1);
            endDate = new Date(year, 11, 31, 23, 59, 59);
        } else {
            // Default to last 30 days if no filter provided
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);
            endDate = new Date();
        }
        return { startDate, endDate };
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
        const allNodeIds = await this.getSubtreeNodeIds(idLider);
        if (allNodeIds.length === 0) return [];

        const users = await this.userOrgRepo.find({
            where: { idNodo: In(allNodeIds) },
            select: ['idUsuario']
        });

        return users.map(u => u.idUsuario);
    }

    async getReporteProductividad(idLider: number, filter?: ReportFilterDto) {
        let teamIds: number[] = [];
        const user = await this.userRepo.findOne({ where: { idUsuario: idLider } });
        if (user && user.carnet) {
            const visibles = await this.visibilidadService.obtenerEmpleadosVisibles(user.carnet);
            teamIds = visibles.map(v => v.idUsuario);
        } else {
            teamIds = [idLider];
        }

        const { startDate, endDate } = this.getDateRange(filter?.month, filter?.year);

        const query = this.tareaRepo.createQueryBuilder('t')
            .innerJoin('t.asignados', 'ta')
            .select("TO_CHAR(t.fechaHecha, 'YYYY-MM-DD')", "date")
            .addSelect("COUNT(*)::int", "count")
            .where('ta.idUsuario IN (:...ids)', { ids: teamIds })
            .andWhere('t.estado = :estado', { estado: 'Hecha' })
            .andWhere('t.fechaHecha BETWEEN :startDate AND :endDate', { startDate, endDate });

        if (filter?.idProyecto) {
            query.andWhere('t.idProyecto = :pid', { pid: filter.idProyecto });
        }

        const rawData = await query
            .groupBy("TO_CHAR(t.fechaHecha, 'YYYY-MM-DD')")
            .orderBy("TO_CHAR(t.fechaHecha, 'YYYY-MM-DD')", 'ASC')
            .getRawMany();

        return rawData;
    }

    async getReporteBloqueosTrend(idLider: number, filter?: ReportFilterDto) {
        let teamIds: number[] = [];
        const user = await this.userRepo.findOne({ where: { idUsuario: idLider } });
        if (user && user.carnet) {
            const visibles = await this.visibilidadService.obtenerEmpleadosVisibles(user.carnet);
            teamIds = visibles.map(v => v.idUsuario);
        } else {
            teamIds = [idLider];
        }

        const { startDate, endDate } = this.getDateRange(filter?.month, filter?.year);

        const query = this.bloqueoRepo.createQueryBuilder('b')
            .select("TO_CHAR(b.fechaCreacion, 'YYYY-MM-DD')", "date")
            .addSelect("COUNT(*)::int", "count")
            .where('b.idOrigenUsuario IN (:...ids)', { ids: teamIds })
            .andWhere('b.fechaCreacion BETWEEN :startDate AND :endDate', { startDate, endDate });

        if (filter?.idProyecto) {
            query.innerJoin('b.tarea', 'bt').andWhere('bt.idProyecto = :pid', { pid: filter.idProyecto });
        }

        const rawData = await query
            .groupBy("TO_CHAR(b.fechaCreacion, 'YYYY-MM-DD')")
            .orderBy("TO_CHAR(b.fechaCreacion, 'YYYY-MM-DD')", 'ASC')
            .getRawMany();

        return rawData;
    }

    async getReporteEquipoPerformance(idLider: number, filter?: ReportFilterDto) {
        let teamIds: number[] = [];
        const user = await this.userRepo.findOne({ where: { idUsuario: idLider } });
        if (user && user.carnet) {
            const visibles = await this.visibilidadService.obtenerEmpleadosVisibles(user.carnet);
            teamIds = visibles.map(v => v.idUsuario);
        } else {
            teamIds = [idLider];
        }

        const { startDate, endDate } = this.getDateRange(filter?.month, filter?.year);

        const users = await this.userRepo.find({
            where: { idUsuario: In(teamIds) },
            select: ['idUsuario', 'nombre']
        });

        const performance = await Promise.all(users.map(async (u) => {
            const baseQuery = this.tareaRepo.createQueryBuilder('t')
                .innerJoin('t.asignados', 'ta')
                .where('ta.idUsuario = :id', { id: u.idUsuario })
                .andWhere('t.estado != :estado', { estado: 'Descartada' })
                .andWhere('t.fechaCreacion <= :endDate', { endDate });

            if (filter?.idProyecto) {
                baseQuery.andWhere('t.idProyecto = :pid', { pid: filter.idProyecto });
            }

            const total = await baseQuery.getCount();

            const hechas = await baseQuery
                .andWhere('t.estado = :hecha', { hecha: 'Hecha' })
                .andWhere('t.fechaHecha BETWEEN :startDate AND :endDate', { startDate, endDate })
                .getCount();

            const atrasadas = await baseQuery
                .andWhere('t.estado NOT IN (:...finales)', { finales: ['Hecha', 'Descartada'] })
                .andWhere('t.fechaObjetivo < :now', { now: new Date() })
                .getCount();

            const enCurso = await baseQuery
                .andWhere('t.estado = :enCurso', { enCurso: 'EnCurso' })
                .getCount();

            return {
                nombre: u.nombre,
                total,
                hechas,
                atrasadas,
                enCurso,
                porcentaje: total > 0 ? Math.round((hechas / total) * 100) : 0
            };
        }));

        return performance;
    }

    async equipoBloqueos(idUsuario: number, fecha: string) {
        let teamIds: number[] = [];
        const user = await this.userRepo.findOne({ where: { idUsuario } });
        if (user && user.carnet) {
            const visibles = await this.visibilidadService.obtenerEmpleadosVisibles(user.carnet);
            teamIds = visibles.map(v => v.idUsuario);
        } else {
            teamIds = [idUsuario];
        }

        return this.bloqueoRepo.find({
            where: { idOrigenUsuario: In(teamIds) },
            relations: ['origenUsuario', 'tarea', 'destinoUsuario'],
            order: { fechaCreacion: 'DESC' },
            take: 50
        });
    }

    async getWorkload(idLider: number) {
        let teamIds: number[] = [];
        const user = await this.userRepo.findOne({ where: { idUsuario: idLider } });
        if (user && user.carnet) {
            const visibles = await this.visibilidadService.obtenerEmpleadosVisibles(user.carnet);
            teamIds = visibles.map(v => v.idUsuario);
        } else {
            teamIds = [idLider];
        }

        const users = await this.userRepo.find({
            where: { idUsuario: In(teamIds) },
            relations: ['rol'],
        });

        const tasks = await this.tareaRepo.find({
            where: {
                asignados: { idUsuario: In(teamIds) },
                estado: Not(In(['Hecha', 'Descartada'])),
            },
            relations: ['asignados', 'asignados.usuario', 'proyecto'],
        });

        return { users, tasks };
    }

    async gerenciaResumen(idUsuario: number, fecha: string) {
        const misNodos = await this.dataSource.getRepository(UsuarioOrganizacion).find({
            where: { idUsuario, rol: In(['Gerente', 'Director']) }
        });

        const resultados: any[] = [];

        for (const rel of misNodos) {
            const children = await this.nodoRepo.find({ where: { idPadre: rel.idNodo } });
            const myself = await this.nodoRepo.findOneBy({ idNodo: rel.idNodo });
            if (myself) children.push(myself);

            for (const child of children) {
                if (!child) continue;

                const usersInNode = await this.dataSource.getRepository(UsuarioOrganizacion).count({ where: { idNodo: child.idNodo } });
                const checkinsCount = await this.checkinRepo.count({ where: { idNodo: child.idNodo, fecha } });

                resultados.push({
                    nodo: child.nombre,
                    totalUsuarios: usersInNode,
                    checkins: checkinsCount,
                    porcentaje: usersInNode > 0 ? Math.round((checkinsCount / usersInNode) * 100) : 0
                });
            }
        }
        return resultados;
    }

    async exportToExcel(data: any[], sheetName: string): Promise<Buffer> {
        const XLSX = require('xlsx');
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    }
}
