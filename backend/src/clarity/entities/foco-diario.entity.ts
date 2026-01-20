import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { Usuario } from '../../auth/entities/usuario.entity';
import { Tarea } from '../../planning/entities/tarea.entity';

@Entity({ name: 'p_FocoDiario' })
@Index(["fecha", "idUsuario"])
@Index(["idUsuario", "idTarea", "fecha"], { unique: true })
export class FocoDiario {
    @PrimaryGeneratedColumn()
    idFoco: number;

    @Column('date')
    fecha: string;

    @Column()
    idUsuario: number;

    @ManyToOne(() => Usuario)
    @JoinColumn({ name: 'idUsuario' })
    usuario: Usuario;

    @Column({ type: 'bigint' })
    idTarea: number;

    @ManyToOne(() => Tarea)
    @JoinColumn({ name: 'idTarea' })
    tarea: Tarea;

    @Column({ default: false })
    esEstrategico: boolean;

    @Column('date')
    fechaPrimerFoco: string;

    @Column({ default: 1 })
    diasArrastre: number;

    @Column({ default: 0 })
    orden: number;

    @Column('date', { nullable: true })
    completadoEnFecha: string;

    @CreateDateColumn()
    fechaCreacion: Date;
}
