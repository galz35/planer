import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn } from 'typeorm';
import { OrganizacionNodo } from '../../auth/entities/organizacion-nodo.entity';
import { Tarea } from './tarea.entity';

@Entity({ name: 'p_Proyectos' })
export class Proyecto {
    @PrimaryGeneratedColumn()
    idProyecto: number;

    @Column()
    nombre: string;

    @Column({ nullable: true })
    descripcion: string;

    @Column({ nullable: true })
    idNodoDuenio: number;

    @ManyToOne(() => OrganizacionNodo)
    @JoinColumn({ name: 'idNodoDuenio' })
    nodoDuenio: OrganizacionNodo;

    @CreateDateColumn()
    fechaCreacion: Date;

    @Column({ length: 10, default: 'NI' })
    pais: string;

    @OneToMany(() => Tarea, (tarea) => tarea.proyecto)
    tareas: Tarea[];

    @Column({ default: 'Operativo' })
    tipo: string;

    @Column({ default: 'Borrador' })
    estado: string; // Borrador | Confirmado | EnEjecucion | Cerrado

    @Column({ default: false })
    requiereAprobacion: boolean;

    @Column({ name: 'enllavado', type: 'boolean', default: false })
    enllavado: boolean;

    @Column({ nullable: true })
    fechaInicio: Date;

    @Column({ nullable: true })
    fechaFin: Date;

    @Column({ length: 200, nullable: true })
    area: string;

    @Column({ length: 200, nullable: true })
    subgerencia: string;

    @Column({ length: 200, nullable: true })
    gerencia: string;

    // Campo virtual (no base de datos) para enviar al frontend
    progreso?: number;
}
