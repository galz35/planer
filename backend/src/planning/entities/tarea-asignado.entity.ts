import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Tarea } from './tarea.entity';
import { Usuario } from '../../auth/entities/usuario.entity';

@Entity({ name: 'p_TareaAsignados' })
@Index(["idUsuario", "idTarea"])
export class TareaAsignado {
    @PrimaryGeneratedColumn()
    idAsignacion: number;

    @Column({ type: 'bigint' })
    idTarea: number;

    @ManyToOne(() => Tarea, (t) => t.asignados)
    @JoinColumn({ name: 'idTarea' })
    tarea: Tarea;

    @Column()
    idUsuario: number;

    @ManyToOne(() => Usuario)
    @JoinColumn({ name: 'idUsuario' })
    usuario: Usuario;

    @Column()
    tipo: string;
}
