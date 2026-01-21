import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { Tarea } from './tarea.entity';
import { Usuario } from '../../auth/entities/usuario.entity';

/**
 * p_TareaAsignacionLog - Historial completo de asignaciones de tareas
 * 
 * Registra CADA cambio de asignación:
 * - Quién tuvo la tarea (idUsuarioAsignado)
 * - Quién hizo la asignación (idUsuarioAsignador)
 * - Cuándo inició y terminó la asignación
 * - Motivo del cambio
 * 
 * Permite:
 * - Ver historial completo de una tarea
 * - Saber quién trabajó en qué y cuándo
 * - Auditoría de reasignaciones
 * - Tareas sin asignar (idUsuarioAsignado = null)
 */
@Entity({ name: 'p_TareaAsignacionLog' })
@Index(['idTarea', 'fechaInicio'])
@Index(['idUsuarioAsignado', 'activo'])
export class TareaAsignacionLog {
    @PrimaryGeneratedColumn()
    id: number;

    // =========================================
    // TAREA
    // =========================================

    @Column({ type: 'bigint' })
    idTarea: number;

    @ManyToOne(() => Tarea)
    @JoinColumn({ name: 'idTarea' })
    tarea: Tarea;

    // =========================================
    // ASIGNADO (puede ser null = sin asignar)
    // =========================================

    @Column({ nullable: true })
    idUsuarioAsignado: number | null;

    @ManyToOne(() => Usuario, { nullable: true })
    @JoinColumn({ name: 'idUsuarioAsignado' })
    usuarioAsignado: Usuario | null;

    // =========================================
    // ASIGNADOR (quién hizo el cambio)
    // =========================================

    @Column()
    idUsuarioAsignador: number;

    @ManyToOne(() => Usuario)
    @JoinColumn({ name: 'idUsuarioAsignador' })
    usuarioAsignador: Usuario;

    // =========================================
    // PERIODO DE ASIGNACIÓN
    // =========================================

    @CreateDateColumn({ name: 'fecha_inicio' })
    fechaInicio: Date;

    @Column({ name: 'fecha_fin', type: 'datetime', nullable: true })
    fechaFin: Date | null; // null = asignación activa

    @Column({ default: true })
    activo: boolean; // true = es la asignación actual

    // =========================================
    // TIPO Y MOTIVO
    // =========================================

    @Column({
        type: 'varchar',
        length: 50,
        default: 'RESPONSABLE'
    })
    tipoAsignacion: string;
    // RESPONSABLE = dueño principal
    // COLABORADOR = ayuda pero no es dueño
    // REVISOR = solo revisa/aprueba

    @Column({
        type: 'varchar',
        length: 50,
        default: 'ASIGNACION_INICIAL'
    })
    motivoCambio: string;
    // ASIGNACION_INICIAL = primera asignación
    // REASIGNACION = cambiado a otra persona
    // TRANSFERENCIA_AREA = empleado cambió de área
    // BAJA_EMPLEADO = empleado renunció/fue despedido
    // SOLICITUD_EMPLEADO = el asignado pidió que lo quiten
    // CARGA_TRABAJO = reasignado por sobrecarga
    // DESASIGNACION = quitado sin nuevo asignado

    @Column({ type: 'text', nullable: true })
    notas: string | null; // Comentario opcional del cambio

    // =========================================
    // AUDITORÍA
    // =========================================

    @Column({ name: 'ip_origen', type: 'varchar', length: 50, nullable: true })
    ipOrigen: string | null;
}
