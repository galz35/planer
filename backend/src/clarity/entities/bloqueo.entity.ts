import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { Tarea } from '../../planning/entities/tarea.entity';
import { Usuario } from '../../auth/entities/usuario.entity';

@Entity({ name: 'p_Bloqueos' })
@Index(["estado", "fechaCreacion"])
export class Bloqueo {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    idBloqueo: number;

    @Column({ type: 'bigint', nullable: true })
    idTarea: number;

    @ManyToOne(() => Tarea)
    @JoinColumn({ name: 'idTarea' })
    tarea: Tarea;

    @Column()
    idOrigenUsuario: number;

    @ManyToOne(() => Usuario)
    @JoinColumn({ name: 'idOrigenUsuario' })
    origenUsuario: Usuario;

    @Column({ nullable: true })
    idDestinoUsuario: number;

    @ManyToOne(() => Usuario)
    @JoinColumn({ name: 'idDestinoUsuario' })
    destinoUsuario: Usuario;

    @Column({ nullable: true })
    destinoTexto: string;

    @Column()
    motivo: string;

    @Column({ nullable: true })
    accionMitigacion: string;

    @Column({ default: 'Activo' })
    estado: string;

    @CreateDateColumn()
    fechaCreacion: Date;

    @Column({ nullable: true })
    fechaResolucion: Date;
}
