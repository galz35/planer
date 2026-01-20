import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Tarea } from './tarea.entity';
import { Usuario } from '../../auth/entities/usuario.entity';

@Entity({ name: 'p_SolicitudCambios' })
export class SolicitudCambio {
    @PrimaryGeneratedColumn()
    idSolicitud: number;

    @Column()
    idTarea: number;

    @ManyToOne(() => Tarea)
    @JoinColumn({ name: 'idTarea' })
    tarea: Tarea;

    @Column()
    idUsuarioSolicitante: number;

    @ManyToOne(() => Usuario)
    @JoinColumn({ name: 'idUsuarioSolicitante' })
    usuarioSolicitante: Usuario;

    @Column()
    campoAfectado: string;

    @Column({ nullable: true })
    valorAnterior: string | null;

    @Column({ nullable: true })
    valorNuevo: string | null;

    @Column({ type: 'text', nullable: true })
    motivo: string;

    @Column({ default: 'Pendiente' })
    estado: string;

    @Column({ nullable: true })
    idAprobador: number;

    @ManyToOne(() => Usuario)
    @JoinColumn({ name: 'idAprobador' })
    aprobador: Usuario;

    @CreateDateColumn()
    fechaSolicitud: Date;

    @Column({ nullable: true })
    fechaResolucion: Date;
}
