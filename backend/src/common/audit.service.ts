import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, Between, Brackets } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { LogSistema } from './entities/log-sistema.entity';

/**
 * Tipos de acciones que se pueden auditar
 */
export enum AccionAudit {
    // Tareas
    TAREA_CREADA = 'TAREA_CREADA',
    TAREA_ACTUALIZADA = 'TAREA_ACTUALIZADA',
    TAREA_ELIMINADA = 'TAREA_ELIMINADA',
    TAREA_COMPLETADA = 'TAREA_COMPLETADA',
    TAREA_ASIGNADA = 'TAREA_ASIGNADA',
    TAREA_REASIGNADA = 'TAREA_REASIGNADA',

    // Proyectos
    PROYECTO_CREADO = 'PROYECTO_CREADO',
    PROYECTO_ACTUALIZADO = 'PROYECTO_ACTUALIZADO',
    PROYECTO_ARCHIVADO = 'PROYECTO_ARCHIVADO',

    // Bloqueos
    BLOQUEO_CREADO = 'BLOQUEO_CREADO',
    BLOQUEO_RESUELTO = 'BLOQUEO_RESUELTO',

    // Check-ins
    CHECKIN_CREADO = 'CHECKIN_CREADO',
    CHECKIN_ACTUALIZADO = 'CHECKIN_ACTUALIZADO',

    // Usuarios
    USUARIO_LOGIN = 'USUARIO_LOGIN',
    USUARIO_LOGOUT = 'USUARIO_LOGOUT',
    USUARIO_CREADO = 'USUARIO_CREADO',
    USUARIO_ACTUALIZADO = 'USUARIO_ACTUALIZADO',
    USUARIO_DESACTIVADO = 'USUARIO_DESACTIVADO',

    // Permisos
    PERMISO_OTORGADO = 'PERMISO_OTORGADO',
    PERMISO_REVOCADO = 'PERMISO_REVOCADO',
    DELEGACION_CREADA = 'DELEGACION_CREADA',
    DELEGACION_REVOCADA = 'DELEGACION_REVOCADA',

    // Sistema
    ERROR_SISTEMA = 'ERROR_SISTEMA',
    IMPORTACION_DATOS = 'IMPORTACION_DATOS',
}

/**
 * Tipos de recursos
 */
export enum RecursoAudit {
    TAREA = 'Tarea',
    PROYECTO = 'Proyecto',
    USUARIO = 'Usuario',
    BLOQUEO = 'Bloqueo',
    CHECKIN = 'Checkin',
    PERMISO = 'Permiso',
    SISTEMA = 'Sistema',
}

export interface AuditLogDto {
    idUsuario: number;
    accion: AccionAudit | string;
    recurso: RecursoAudit | string;
    recursoId?: string;
    detalles?: Record<string, any>;
    ip?: string;
}

@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);

    constructor(
        @InjectRepository(AuditLog)
        private auditRepo: Repository<AuditLog>,
        @InjectRepository(LogSistema)
        private logRepo: Repository<LogSistema>,
    ) { }

    /**
     * Registra una acción de auditoría
     */
    async log(dto: AuditLogDto): Promise<AuditLog | null> {
        try {
            const log = this.auditRepo.create({
                idUsuario: dto.idUsuario,
                accion: dto.accion,
                recurso: dto.recurso,
                recursoId: dto.recursoId || undefined,
                detalles: dto.detalles ? JSON.stringify(dto.detalles) : undefined,
                ip: dto.ip || undefined,
            });

            const saved = await this.auditRepo.save(log);
            this.logger.debug(`Audit: ${dto.accion} - ${dto.recurso}:${dto.recursoId} by user ${dto.idUsuario}`);
            return saved;
        } catch (error) {
            this.logger.error('Error guardando audit log', error);
            // No fallar si hay error en auditoría
            return null;
        }
    }

    /**
     * Registra un log del sistema (errores, warnings, info)
     */
    async logSistema(
        nivel: 'Error' | 'Warn' | 'Info',
        origen: string,
        mensaje: string,
        stack?: string,
        idUsuario?: number,
    ): Promise<LogSistema | null> {
        try {
            const log = this.logRepo.create({
                nivel,
                origen,
                mensaje,
                stack: stack || undefined,
                idUsuario: idUsuario || undefined,
            });
            return await this.logRepo.save(log);
        } catch (error) {
            this.logger.error('Error guardando log sistema', error);
            return null;
        }
    }

    /**
     * Registra un error del sistema
     */
    async error(origen: string, mensaje: string, error?: Error, idUsuario?: number): Promise<void> {
        await this.logSistema(
            'Error',
            origen,
            mensaje,
            error?.stack,
            idUsuario,
        );
    }

    /**
     * Registra una advertencia
     */
    async warn(origen: string, mensaje: string, idUsuario?: number): Promise<void> {
        await this.logSistema('Warn', origen, mensaje, undefined, idUsuario);
    }

    /**
     * Registra info
     */
    async info(origen: string, mensaje: string, idUsuario?: number): Promise<void> {
        await this.logSistema('Info', origen, mensaje, undefined, idUsuario);
    }

    // ============ CONSULTAS ============

    /**
     * Lista logs de auditoría con paginación
     */
    async listarAudit(page: number = 1, limit: number = 50, filtros?: {
        idUsuario?: number;
        accion?: string;
        recurso?: string;
        fechaDesde?: Date;
        fechaHasta?: Date;
        query?: string;
    }): Promise<{
        items: AuditLog[];
        total: number;
        page: number;
        totalPages: number;
    }> {
        const qb = this.auditRepo.createQueryBuilder('log')
            .leftJoinAndSelect('log.usuario', 'usuario')
            .orderBy('log.fecha', 'DESC');

        if (filtros?.idUsuario) {
            qb.andWhere('log.idUsuario = :idUsuario', { idUsuario: filtros.idUsuario });
        }
        if (filtros?.accion) {
            qb.andWhere('log.accion = :accion', { accion: filtros.accion });
        }
        if (filtros?.recurso) {
            qb.andWhere('log.recurso = :recurso', { recurso: filtros.recurso });
        }
        if (filtros?.fechaDesde) {
            qb.andWhere('log.fecha >= :fechaDesde', { fechaDesde: filtros.fechaDesde });
        }
        if (filtros?.fechaHasta) {
            qb.andWhere('log.fecha <= :fechaHasta', { fechaHasta: filtros.fechaHasta });
        }

        if (filtros?.query) {
            const q = `%${filtros.query}%`;
            qb.andWhere(new Brackets(inner => {
                inner.where('log.accion LIKE :q', { q })
                    .orWhere('log.recurso LIKE :q', { q })
                    .orWhere('log.recursoId LIKE :q', { q })
                    .orWhere('usuario.nombre LIKE :q', { q })
                    .orWhere('usuario.correo LIKE :q', { q })
                    .orWhere('usuario.carnet LIKE :q', { q });
            }));
        }

        const [items, total] = await qb
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();

        return {
            items,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Lista logs del sistema con paginación
     */
    async listarLogs(page: number = 1, limit: number = 100, filtros?: {
        nivel?: string;
        origen?: string;
        fechaDesde?: Date;
        fechaHasta?: Date;
    }): Promise<{
        items: LogSistema[];
        total: number;
        page: number;
        totalPages: number;
        estadisticas: {
            errors: number;
            warns: number;
            infos: number;
        };
    }> {
        const qb = this.logRepo.createQueryBuilder('log')
            .orderBy('log.fecha', 'DESC');

        if (filtros?.nivel) {
            qb.andWhere('log.nivel = :nivel', { nivel: filtros.nivel });
        }
        if (filtros?.origen) {
            qb.andWhere('log.origen LIKE :origen', { origen: `%${filtros.origen}%` });
        }
        if (filtros?.fechaDesde) {
            qb.andWhere('log.fecha >= :fechaDesde', { fechaDesde: filtros.fechaDesde });
        }
        if (filtros?.fechaHasta) {
            qb.andWhere('log.fecha <= :fechaHasta', { fechaHasta: filtros.fechaHasta });
        }

        const [items, total] = await qb
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();

        // Estadísticas de las últimas 24 horas
        const ayer = new Date();
        ayer.setDate(ayer.getDate() - 1);

        const [errors, warns, infos] = await Promise.all([
            this.logRepo.count({ where: { nivel: 'Error', fecha: MoreThan(ayer) } }),
            this.logRepo.count({ where: { nivel: 'Warn', fecha: MoreThan(ayer) } }),
            this.logRepo.count({ where: { nivel: 'Info', fecha: MoreThan(ayer) } }),
        ]);

        return {
            items,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            estadisticas: { errors, warns, infos },
        };
    }

    /**
     * Historial de una entidad específica
     */
    async getHistorialEntidad(recurso: string, recursoId: string): Promise<AuditLog[]> {
        return this.auditRepo.find({
            where: { recurso, recursoId },
            order: { fecha: 'DESC' },
            relations: ['usuario'],
        });
    }

    /**
     * Actividad reciente de un usuario
     */
    async getActividadUsuario(idUsuario: number, dias: number = 7): Promise<AuditLog[]> {
        const desde = new Date();
        desde.setDate(desde.getDate() - dias);

        return this.auditRepo.find({
            where: {
                idUsuario,
                fecha: MoreThan(desde),
            },
            order: { fecha: 'DESC' },
            take: 100,
        });
    }

    /**
     * Resumen de actividad para dashboard
     */
    async getResumenActividad(dias: number = 7): Promise<{
        totalAcciones: number;
        accionesPorTipo: { accion: string; count: number }[];
        accionesPorUsuario: { idUsuario: number; nombre: string; count: number }[];
        erroresTotales: number;
    }> {
        const desde = new Date();
        desde.setDate(desde.getDate() - dias);

        // Total de acciones
        const totalAcciones = await this.auditRepo.count({
            where: { fecha: MoreThan(desde) },
        });

        // Acciones por tipo
        const accionesPorTipo = await this.auditRepo
            .createQueryBuilder('log')
            .select('log.accion', 'accion')
            .addSelect('COUNT(*)', 'count')
            .where('log.fecha > :desde', { desde })
            .groupBy('log.accion')
            .orderBy('count', 'DESC')
            .limit(10)
            .getRawMany();

        // Acciones por usuario
        const accionesPorUsuario = await this.auditRepo
            .createQueryBuilder('log')
            .leftJoin('log.usuario', 'usuario')
            .select('log.idUsuario', 'idUsuario')
            .addSelect('usuario.correo', 'nombre')
            .addSelect('COUNT(*)', 'count')
            .where('log.fecha > :desde', { desde })
            .groupBy('log.idUsuario')
            .addGroupBy('usuario.correo')
            .orderBy('count', 'DESC')
            .limit(10)
            .getRawMany();

        // Errores totales
        const erroresTotales = await this.logRepo.count({
            where: { nivel: 'Error', fecha: MoreThan(desde) },
        });

        return {
            totalAcciones,
            accionesPorTipo,
            accionesPorUsuario: accionesPorUsuario.map(u => ({
                idUsuario: u.idUsuario,
                nombre: u.nombre?.split('@')[0] || `Usuario ${u.idUsuario}`,
                count: parseInt(u.count),
            })),
            erroresTotales,
        };
    }
}
