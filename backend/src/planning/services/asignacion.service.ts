import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, In } from 'typeorm';
import { TareaAsignacionLog } from '../entities/tarea-asignacion-log.entity';
import { TareaAsignado } from '../entities/tarea-asignado.entity';
import { Tarea } from '../entities/tarea.entity';
import { Usuario } from '../../auth/entities/usuario.entity';
import {
    AsignarTareaDto,
    ReasignarTareaDto,
    ReasignarMasivoDto,
    HistorialAsignacionDto,
} from '../dto/asignacion.dto';

// =========================================
// SERVICE
// =========================================

@Injectable()
export class AsignacionService {
    constructor(
        @InjectRepository(TareaAsignacionLog)
        private readonly logRepo: Repository<TareaAsignacionLog>,

        @InjectRepository(TareaAsignado)
        private readonly tareaAsignadoRepo: Repository<TareaAsignado>,

        @InjectRepository(Tarea)
        private readonly tareaRepo: Repository<Tarea>,

        @InjectRepository(Usuario)
        private readonly usuarioRepo: Repository<Usuario>,
    ) { }

    /**
     * Asigna una tarea a un usuario (o la deja sin asignar)
     * Cierra la asignación anterior si existe
     */
    async asignarTarea(
        dto: AsignarTareaDto,
        idUsuarioAsignador: number,
        ipOrigen?: string,
    ): Promise<TareaAsignacionLog> {
        // Verificar que la tarea existe
        const tarea = await this.tareaRepo.findOne({
            where: { idTarea: dto.idTarea }
        });
        if (!tarea) {
            throw new NotFoundException(`Tarea ${dto.idTarea} no encontrada`);
        }

        // Si hay usuario asignado, verificar que existe
        if (dto.idUsuarioAsignado) {
            const usuario = await this.usuarioRepo.findOne({
                where: { idUsuario: dto.idUsuarioAsignado }
            });
            if (!usuario) {
                throw new NotFoundException(`Usuario ${dto.idUsuarioAsignado} no encontrado`);
            }
        }

        // Cerrar asignación anterior si existe
        await this.cerrarAsignacionActiva(dto.idTarea, idUsuarioAsignador);

        // Crear nueva asignación en el LOG (historial)
        const nuevaAsignacion = this.logRepo.create({
            idTarea: dto.idTarea,
            idUsuarioAsignado: dto.idUsuarioAsignado,
            idUsuarioAsignador: idUsuarioAsignador,
            tipoAsignacion: dto.tipoAsignacion || 'RESPONSABLE',
            motivoCambio: dto.motivoCambio || 'ASIGNACION_INICIAL',
            notas: dto.notas,
            activo: true,
            ipOrigen,
        });

        const logGuardado = await this.logRepo.save(nuevaAsignacion);

        // SINCRONIZAR con tabla p_TareaAsignados (sistema legacy)
        // Eliminar asignaciones previas de esta tarea
        await this.tareaAsignadoRepo.delete({ idTarea: dto.idTarea });

        // Si hay nuevo asignado, crear registro en tabla legacy
        if (dto.idUsuarioAsignado) {
            await this.tareaAsignadoRepo.save({
                idTarea: dto.idTarea,
                idUsuario: dto.idUsuarioAsignado,
                tipo: dto.tipoAsignacion || 'Responsable',
            });
        }

        return logGuardado;
    }

    /**
     * Reasigna una tarea a otro usuario
     * Mantiene historial completo
     */
    async reasignarTarea(
        dto: ReasignarTareaDto,
        idUsuarioAsignador: number,
        ipOrigen?: string,
    ): Promise<TareaAsignacionLog> {
        return this.asignarTarea(
            {
                idTarea: dto.idTarea,
                idUsuarioAsignado: dto.idNuevoUsuario,
                motivoCambio: dto.motivoCambio,
                notas: dto.notas,
            },
            idUsuarioAsignador,
            ipOrigen,
        );
    }

    /**
     * Reasigna TODAS las tareas de un usuario a otro
     * Útil para offboarding o transferencias
     */
    async reasignarMasivo(
        dto: ReasignarMasivoDto,
        idUsuarioAsignador: number,
        ipOrigen?: string,
    ): Promise<{
        tareasReasignadas: number;
        tareasAfectadas: number[];
    }> {
        // Buscar todas las asignaciones activas del usuario origen
        const asignacionesActivas = await this.logRepo.find({
            where: {
                idUsuarioAsignado: dto.idUsuarioOrigen,
                activo: true,
            },
        });

        if (asignacionesActivas.length === 0) {
            return { tareasReasignadas: 0, tareasAfectadas: [] };
        }

        const tareasAfectadas: number[] = [];

        for (const asignacion of asignacionesActivas) {
            await this.reasignarTarea(
                {
                    idTarea: asignacion.idTarea,
                    idNuevoUsuario: dto.idUsuarioDestino,
                    motivoCambio: dto.motivoCambio as any,
                    notas: dto.notas,
                },
                idUsuarioAsignador,
                ipOrigen,
            );
            tareasAfectadas.push(asignacion.idTarea);
        }

        return {
            tareasReasignadas: tareasAfectadas.length,
            tareasAfectadas,
        };
    }

    /**
     * Obtiene el historial completo de una tarea
     */
    async getHistorialTarea(idTarea: number): Promise<HistorialAsignacionDto[]> {
        const logs = await this.logRepo.find({
            where: { idTarea },
            relations: ['usuarioAsignado', 'usuarioAsignador', 'tarea'],
            order: { fechaInicio: 'DESC' },
        });

        return logs.map(log => this.mapToHistorialDto(log));
    }

    /**
     * Obtiene el historial laboral de un usuario
     * (todas las tareas en las que ha trabajado)
     */
    async getHistorialUsuario(
        idUsuario: number,
        opciones?: {
            soloActivas?: boolean;
            fechaDesde?: Date;
            fechaHasta?: Date;
        }
    ): Promise<HistorialAsignacionDto[]> {
        let query = this.logRepo.createQueryBuilder('log')
            .leftJoinAndSelect('log.tarea', 'tarea')
            .leftJoinAndSelect('log.usuarioAsignado', 'asignado')
            .leftJoinAndSelect('log.usuarioAsignador', 'asignador')
            .where('log.idUsuarioAsignado = :idUsuario', { idUsuario })
            .orderBy('log.fechaInicio', 'DESC');

        if (opciones?.soloActivas) {
            query = query.andWhere('log.activo = :activo', { activo: true });
        }

        if (opciones?.fechaDesde) {
            query = query.andWhere('log.fechaInicio >= :fechaDesde', {
                fechaDesde: opciones.fechaDesde
            });
        }

        if (opciones?.fechaHasta) {
            query = query.andWhere('log.fechaInicio <= :fechaHasta', {
                fechaHasta: opciones.fechaHasta
            });
        }

        const logs = await query.getMany();
        return logs.map(log => this.mapToHistorialDto(log));
    }

    /**
     * Obtiene tareas sin asignar (pendientes de asignación)
     * Consulta AMBOS sistemas (nuevo historial y legacy) para evitar falsos positivos
     */
    async getTareasSinAsignar(): Promise<Tarea[]> {
        // Tareas con asignación activa en el NUEVO sistema (historial)
        const tareasNuevoSistema = await this.logRepo.find({
            where: { activo: true, idUsuarioAsignado: Not(IsNull()) },
            select: ['idTarea'],
        });

        // Tareas con asignación en el sistema LEGACY (p_TareaAsignados)
        const tareasLegacy = await this.tareaAsignadoRepo.find({
            select: ['idTarea'],
        });

        // Unir IDs de ambos sistemas (sin duplicados)
        const todasAsignadas = new Set([
            ...tareasNuevoSistema.map(t => Number(t.idTarea)),
            ...tareasLegacy.map(t => Number(t.idTarea)),
        ]);

        // Buscar tareas que NO están asignadas en NINGÚN sistema
        const query = this.tareaRepo.createQueryBuilder('tarea')
            .where('tarea.estado != :completado', { completado: 'Completada' });

        if (todasAsignadas.size > 0) {
            query.andWhere('tarea.idTarea NOT IN (:...ids)', {
                ids: [...todasAsignadas]
            });
        }

        return query.getMany();
    }

    /**
     * Obtiene la asignación activa de una tarea
     */
    async getAsignacionActiva(idTarea: number): Promise<TareaAsignacionLog | null> {
        return this.logRepo.findOne({
            where: { idTarea, activo: true },
            relations: ['usuarioAsignado', 'usuarioAsignador'],
        });
    }

    /**
     * Estadísticas de asignaciones de un usuario
     */
    async getEstadisticasUsuario(idUsuario: number): Promise<{
        tareasActuales: number;
        tareasCompletadasHistorico: number;
        tareasReasignadasA: number;
        tareasReasignadasDesde: number;
        tiempoPromedioTareaDias: number;
    }> {
        const tareasActuales = await this.logRepo.count({
            where: { idUsuarioAsignado: idUsuario, activo: true }
        });

        const historialCompleto = await this.logRepo.find({
            where: { idUsuarioAsignado: idUsuario, activo: false }
        });

        const tareasReasignadasDesde = historialCompleto.filter(
            h => h.motivoCambio === 'REASIGNACION' ||
                h.motivoCambio === 'TRANSFERENCIA_AREA' ||
                h.motivoCambio === 'BAJA_EMPLEADO'
        ).length;

        // Calcular tiempo promedio
        let tiempoTotalDias = 0;
        let tareasConTiempo = 0;
        for (const h of historialCompleto) {
            if (h.fechaFin) {
                const dias = Math.ceil(
                    (h.fechaFin.getTime() - h.fechaInicio.getTime()) / (1000 * 60 * 60 * 24)
                );
                tiempoTotalDias += dias;
                tareasConTiempo++;
            }
        }

        // Calcular tareas que este usuario reasignó a otros
        const tareasReasignadasA = await this.logRepo.count({
            where: {
                idUsuarioAsignador: idUsuario,
                motivoCambio: In(['REASIGNACION', 'TRANSFERENCIA_AREA', 'BAJA_EMPLEADO'])
            }
        });

        return {
            tareasActuales,
            tareasCompletadasHistorico: historialCompleto.length,
            tareasReasignadasA,
            tareasReasignadasDesde,
            tiempoPromedioTareaDias: tareasConTiempo > 0
                ? Math.round(tiempoTotalDias / tareasConTiempo)
                : 0,
        };
    }

    // =========================================
    // MÉTODOS PRIVADOS
    // =========================================

    private async cerrarAsignacionActiva(
        idTarea: number,
        idUsuarioQueCierra: number
    ): Promise<void> {
        const asignacionActiva = await this.logRepo.findOne({
            where: { idTarea, activo: true }
        });

        if (asignacionActiva) {
            asignacionActiva.activo = false;
            asignacionActiva.fechaFin = new Date();
            await this.logRepo.save(asignacionActiva);
        }
    }

    private mapToHistorialDto(log: TareaAsignacionLog): HistorialAsignacionDto {
        let duracionDias: number | null = null;
        if (log.fechaFin) {
            duracionDias = Math.ceil(
                (log.fechaFin.getTime() - log.fechaInicio.getTime()) / (1000 * 60 * 60 * 24)
            );
        } else if (log.activo) {
            duracionDias = Math.ceil(
                (new Date().getTime() - log.fechaInicio.getTime()) / (1000 * 60 * 60 * 24)
            );
        }

        return {
            id: log.id,
            idTarea: log.idTarea,
            tituloTarea: log.tarea?.titulo || 'Sin título',
            usuarioAsignado: {
                id: log.idUsuarioAsignado,
                nombre: log.usuarioAsignado?.correo?.split('@')[0] || null,
                correo: log.usuarioAsignado?.correo || null,
            },
            usuarioAsignador: {
                id: log.idUsuarioAsignador,
                nombre: log.usuarioAsignador?.correo?.split('@')[0] || 'Sistema',
                correo: log.usuarioAsignador?.correo || '',
            },
            fechaInicio: log.fechaInicio,
            fechaFin: log.fechaFin,
            duracionDias,
            tipoAsignacion: log.tipoAsignacion,
            motivoCambio: log.motivoCambio,
            notas: log.notas,
            activo: log.activo,
        };
    }
}
