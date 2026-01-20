
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Usuario } from '../../auth/entities/usuario.entity';
import { Tarea } from './tarea.entity';

@Entity({ name: 'p_PlanesTrabajo' })
@Index(["idUsuario", "mes", "anio"])
export class PlanTrabajo {
    @PrimaryGeneratedColumn()
    idPlan: number;

    @Column({ length: 100, nullable: true })
    nombre: string; // e.g., "Plan Mensual Enero", "Proyecto Migración"

    @Column({ nullable: true })
    idProyecto: number; // Optional link to project

    @Column()
    idUsuario: number;

    @ManyToOne(() => Usuario)
    @JoinColumn({ name: 'idUsuario' })
    usuario: Usuario; // The owner of the plan (e.g. Employee)

    @Column()
    mes: number; // 1-12

    @Column()
    anio: number; // 2026

    @Column({ default: 'Borrador' })
    estado: string; // Borrador, Confirmado, Cerrado

    @Column({ type: 'text', nullable: true })
    objetivoGeneral: string;

    @Column({ type: 'text', nullable: true })
    resumenCierre: string;

    @Column()
    idCreador: number; // Who created it (could be Boss)

    @ManyToOne(() => Usuario)
    @JoinColumn({ name: 'idCreador' })
    creador: Usuario;

    // Campos organizacionales (extraídos de RRHH.csv)
    @Column({ length: 200, nullable: true })
    area: string; // primernivel - ej: "NI COORD. DE TRANSPORTE"

    @Column({ length: 200, nullable: true })
    subgerencia: string; // segundo_nivel - ej: "NI SUBGERENCIA DE RECURSOS HUMANOS"

    @Column({ length: 200, nullable: true })
    gerencia: string; // tercer_nivel - ej: "NI GERENCIA DE RECURSOS HUMANOS"

    @CreateDateColumn()
    fechaCreacion: Date;

    @UpdateDateColumn()
    fechaActualizacion: Date;

    @OneToMany(() => Tarea, (t) => t.plan)
    tareas: Tarea[];
}
