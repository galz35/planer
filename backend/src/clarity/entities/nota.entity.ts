import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Usuario } from '../../auth/entities/usuario.entity';
import { Proyecto } from '../../planning/entities/proyecto.entity';

@Entity({ name: 'p_Notas' })
@Index(["idUsuario"])
export class Nota {
    @PrimaryGeneratedColumn()
    idNota: number;

    @Column()
    titulo: string;

    @Column({ type: 'text', nullable: true })
    contenido: string;

    @Column()
    idUsuario: number;

    @ManyToOne(() => Usuario)
    @JoinColumn({ name: 'idUsuario' })
    usuario: Usuario;

    @Column({ nullable: true })
    idProyecto: number;

    @ManyToOne(() => Proyecto)
    @JoinColumn({ name: 'idProyecto' })
    proyecto: Proyecto;

    @CreateDateColumn()
    fechaCreacion: Date;

    @UpdateDateColumn()
    fechaActualizacion: Date;
}
