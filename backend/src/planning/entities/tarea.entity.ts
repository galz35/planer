import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Proyecto } from './proyecto.entity';
import { Usuario } from '../../auth/entities/usuario.entity';
import { TareaAsignado } from './tarea-asignado.entity';
import { TareaAvance } from './tarea-avance.entity';
import { PlanTrabajo } from './plan-trabajo.entity';

@Entity({ name: 'p_Tareas' })
@Index(["idProyecto", "estado"])
export class Tarea {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    idTarea: number;

    // Propiedad transitoria para pasar contexto al Subscriber de Auditoría
    _auditUsuario?: number;

    @Column({ nullable: true })
    idProyecto: number;

    @Column({ nullable: true })
    idPlan: number;

    @ManyToOne(() => PlanTrabajo, (plan) => plan.tareas)
    @JoinColumn({ name: 'idPlan' })
    plan: PlanTrabajo;

    @ManyToOne(() => Proyecto)
    @JoinColumn({ name: 'idProyecto' })
    proyecto: Proyecto;

    @Column()
    titulo: string;

    @Column({ nullable: true })
    descripcion: string;

    @Column({ default: 'Pendiente' })
    estado: string;

    @Column({ default: 'Media' })
    prioridad: string;

    @Column({ default: 'M' })
    esfuerzo: string;

    @Column({ default: 'Administrativa' }) // Estrategica, AMX, Logistica, Administrativa, Otros
    tipo: string;

    @Column('date', { nullable: true })
    fechaInicioPlanificada: string;

    @Column('date', { nullable: true })
    fechaObjetivo: string;

    @Column({ nullable: true })
    fechaEnCurso: Date;

    @Column({ nullable: true })
    fechaHecha: Date;

    @Column()
    idCreador: number;

    @Column({ nullable: true })
    idAsignadoPor: number;

    @ManyToOne(() => Usuario)
    @JoinColumn({ name: 'idAsignadoPor' })
    asignadoPor: Usuario;

    @CreateDateColumn()
    fechaCreacion: Date;

    @UpdateDateColumn()
    fechaUltActualizacion: Date;

    @OneToMany(() => TareaAsignado, (asignado) => asignado.tarea)
    asignados: TareaAsignado[];

    @Column({ default: 0 })
    progreso: number;

    @Column({ default: 0 })
    orden: number;

    @OneToMany(() => TareaAvance, (av) => av.tarea)
    avances: TareaAvance[];
}
