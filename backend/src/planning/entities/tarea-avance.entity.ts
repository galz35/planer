import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, CreateDateColumn } from 'typeorm';
import { Tarea } from './tarea.entity';
import { Usuario } from '../../auth/entities/usuario.entity';

@Entity({ name: 'p_TareaAvances' })
@Index(["idTarea", "fechaCreacion"])
export class TareaAvance {
    @PrimaryGeneratedColumn()
    idAvance: number;

    @Column({ type: 'bigint' })
    idTarea: number;

    @ManyToOne(() => Tarea, (t) => t.avances)
    @JoinColumn({ name: 'idTarea' })
    tarea: Tarea;

    @Column()
    comentario: string;

    @Column({ nullable: true })
    progreso: number;

    @CreateDateColumn()
    fechaCreacion: Date;

    @Column()
    idUsuario: number;

    @ManyToOne(() => Usuario)
    @JoinColumn({ name: 'idUsuario' })
    usuario: Usuario;
}
