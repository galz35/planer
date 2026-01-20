import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, OneToMany, Index } from 'typeorm';
import { Usuario } from '../../auth/entities/usuario.entity';
import { CheckinTarea } from './checkin-tarea.entity';

@Entity({ name: 'p_Checkins' })
@Index(["fecha", "idUsuario"], { unique: true })
export class Checkin {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    idCheckin: number;

    @Column('date')
    fecha: string;

    @Column()
    idUsuario: number;

    @ManyToOne(() => Usuario)
    @JoinColumn({ name: 'idUsuario' })
    usuario: Usuario;

    @Column({ nullable: true })
    idNodo: number;

    @Column()
    entregableTexto: string;

    @Column({ nullable: true })
    nota: string;

    @Column({ nullable: true })
    linkEvidencia: string;

    @Column({ nullable: true })
    estadoAnimo: string;

    @CreateDateColumn()
    fechaCreacion: Date;

    @OneToMany(() => CheckinTarea, (ct) => ct.checkin)
    tareas: CheckinTarea[];
}
