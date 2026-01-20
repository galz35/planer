import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Checkin } from './checkin.entity';
import { Tarea } from '../../planning/entities/tarea.entity';

@Entity({ name: 'p_CheckinTareas' })
export class CheckinTarea {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    idCheckinTarea: number;

    @Column({ type: 'bigint' })
    idCheckin: number;

    @ManyToOne(() => Checkin)
    @JoinColumn({ name: 'idCheckin' })
    checkin: Checkin;

    @Column({ type: 'bigint' })
    idTarea: number;

    @ManyToOne(() => Tarea)
    @JoinColumn({ name: 'idTarea' })
    tarea: Tarea;

    @Column()
    tipo: string;
}
