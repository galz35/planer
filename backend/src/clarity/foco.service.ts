import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, IsNull } from 'typeorm';
import { FocoDiario } from './entities/foco-diario.entity';
import { Tarea } from '../planning/entities/tarea.entity';
import { FocoAgregarDto, FocoActualizarDto } from './dto/clarity.dtos';

@Injectable()
export class FocoService {
    constructor(
        @InjectRepository(FocoDiario)
        private focoRepo: Repository<FocoDiario>,
        @InjectRepository(Tarea)
        private tareaRepo: Repository<Tarea>,
    ) { }

    /**
     * Obtener el foco del día para un usuario
     * Si es un nuevo día, arrastra automáticamente las tareas pendientes del día anterior
     */
    async getFocoDelDia(idUsuario: number, fecha: string) {
        // 1. Arrastrar tareas pendientes de días anteriores
        await this.arrastrarPendientes(idUsuario, fecha);

        // 2. Obtener foco del día actual
        const focos = await this.focoRepo.find({
            where: { idUsuario, fecha },
            relations: ['tarea', 'tarea.proyecto', 'tarea.asignados', 'tarea.asignados.usuario'],
            order: { orden: 'ASC', idFoco: 'ASC' }
        });

        return focos.map(f => ({
            idFoco: f.idFoco,
            idTarea: f.idTarea,
            tarea: f.tarea,
            esEstrategico: f.esEstrategico,
            diasArrastre: f.diasArrastre,
            fechaPrimerFoco: f.fechaPrimerFoco,
            completado: !!f.completadoEnFecha,
            completadoEnFecha: f.completadoEnFecha,
            orden: f.orden
        }));
    }

    /**
     * Arrastrar tareas pendientes de días anteriores al día actual
     */
    private async arrastrarPendientes(idUsuario: number, fechaHoy: string) {
        // Buscar focos de días anteriores que no estén completados
        const pendientes = await this.focoRepo.find({
            where: {
                idUsuario,
                fecha: LessThan(fechaHoy),
                completadoEnFecha: IsNull()
            },
            relations: ['tarea']
        });

        for (const foco of pendientes) {
            // Verificar si la tarea ya está en el foco de hoy
            const yaExiste = await this.focoRepo.findOne({
                where: { idUsuario, idTarea: foco.idTarea, fecha: fechaHoy }
            });

            if (!yaExiste) {
                // Verificar que la tarea no esté completada o descartada
                if (foco.tarea && !['Hecha', 'Descartada'].includes(foco.tarea.estado)) {
                    // Calcular días de arrastre
                    const primerFoco = new Date(foco.fechaPrimerFoco);
                    const hoy = new Date(fechaHoy);
                    const diasDiff = Math.ceil((hoy.getTime() - primerFoco.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                    // Crear nuevo foco para hoy
                    await this.focoRepo.save({
                        idUsuario,
                        idTarea: foco.idTarea,
                        fecha: fechaHoy,
                        esEstrategico: foco.esEstrategico,
                        fechaPrimerFoco: foco.fechaPrimerFoco,
                        diasArrastre: diasDiff,
                        orden: foco.orden
                    });
                }
            }
        }
    }

    /**
     * Agregar una tarea al foco del día
     */
    async agregarAlFoco(idUsuario: number, dto: FocoAgregarDto) {
        // Verificar que la tarea existe
        const tarea = await this.tareaRepo.findOne({ where: { idTarea: dto.idTarea } });
        if (!tarea) {
            throw new Error('Tarea no encontrada');
        }

        // Verificar si ya está en el foco de ese día
        const existente = await this.focoRepo.findOne({
            where: { idUsuario, idTarea: dto.idTarea, fecha: dto.fecha }
        });

        if (existente) {
            return existente;
        }

        // Obtener el orden máximo actual
        const maxOrden = await this.focoRepo
            .createQueryBuilder('f')
            .select('MAX(f.orden)', 'max')
            .where('f.idUsuario = :idUsuario AND f.fecha = :fecha', { idUsuario, fecha: dto.fecha })
            .getRawOne();

        const nuevoOrden = (maxOrden?.max || 0) + 1;

        // Crear el foco
        const foco = this.focoRepo.create({
            idUsuario,
            idTarea: dto.idTarea,
            fecha: dto.fecha,
            esEstrategico: dto.esEstrategico || false,
            fechaPrimerFoco: dto.fecha,
            diasArrastre: 1,
            orden: nuevoOrden
        });

        return this.focoRepo.save(foco);
    }

    /**
     * Actualizar un foco (marcar estratégico o completado)
     */
    async actualizarFoco(idFoco: number, idUsuario: number, dto: FocoActualizarDto, fechaHoy: string) {
        const foco = await this.focoRepo.findOne({
            where: { idFoco, idUsuario },
            relations: ['tarea']
        });

        if (!foco) {
            throw new Error('Foco no encontrado');
        }

        if (dto.esEstrategico !== undefined) {
            foco.esEstrategico = dto.esEstrategico;
        }

        if (dto.completado !== undefined) {
            if (dto.completado) {
                foco.completadoEnFecha = fechaHoy;

                // También marcar la tarea como Hecha si no lo está
                if (foco.tarea && foco.tarea.estado !== 'Hecha') {
                    await this.tareaRepo.update(foco.idTarea, {
                        estado: 'Hecha',
                        fechaHecha: new Date()
                    });
                }
            } else {
                foco.completadoEnFecha = null as any;
            }
        }

        return this.focoRepo.save(foco);
    }

    /**
     * Quitar una tarea del foco del día
     */
    async quitarDelFoco(idFoco: number, idUsuario: number) {
        const foco = await this.focoRepo.findOne({ where: { idFoco, idUsuario } });

        if (!foco) {
            throw new Error('Foco no encontrado');
        }

        await this.focoRepo.remove(foco);
        return { success: true };
    }

    /**
     * Reordenar focos del día
     */
    async reordenarFocos(idUsuario: number, fecha: string, ids: number[]) {
        for (let i = 0; i < ids.length; i++) {
            await this.focoRepo.update(
                { idFoco: ids[i], idUsuario, fecha },
                { orden: i + 1 }
            );
        }
        return { success: true };
    }

    /**
     * Obtener historial de focos completados (para métricas)
     */
    async getHistorialFocos(idUsuario: number, limit: number = 30) {
        return this.focoRepo.find({
            where: { idUsuario },
            relations: ['tarea'],
            order: { fechaCreacion: 'DESC' },
            take: limit
        });
    }

    /**
     * Estadísticas de efectividad del foco
     */
    async getEstadisticasFoco(idUsuario: number, mes?: number, anio?: number) {
        const query = this.focoRepo.createQueryBuilder('f')
            .where('f.idUsuario = :idUsuario', { idUsuario });

        if (mes && anio) {
            const inicio = new Date(anio, mes - 1, 1).toISOString().split('T')[0];
            const fin = new Date(anio, mes, 0).toISOString().split('T')[0];
            query.andWhere('f.fecha BETWEEN :inicio AND :fin', { inicio, fin });
        }

        const total = await query.getCount();
        const completados = await query.clone()
            .andWhere('f.completadoEnFecha IS NOT NULL')
            .getCount();

        const estrategicosTotal = await query.clone()
            .andWhere('f.esEstrategico = true')
            .getCount();

        const estrategicosCompletados = await query.clone()
            .andWhere('f.esEstrategico = true')
            .andWhere('f.completadoEnFecha IS NOT NULL')
            .getCount();

        const promedioArrastre = await this.focoRepo.createQueryBuilder('f')
            .select('AVG(f.diasArrastre)', 'promedio')
            .where('f.idUsuario = :idUsuario', { idUsuario })
            .andWhere('f.completadoEnFecha IS NOT NULL')
            .getRawOne();

        return {
            total,
            completados,
            pendientes: total - completados,
            porcentajeCompletado: total > 0 ? Math.round((completados / total) * 100) : 0,
            estrategicos: {
                total: estrategicosTotal,
                completados: estrategicosCompletados,
                porcentaje: estrategicosTotal > 0 ? Math.round((estrategicosCompletados / estrategicosTotal) * 100) : 0
            },
            promedioArrastre: parseFloat(promedioArrastre?.promedio || '1').toFixed(1)
        };
    }
}
