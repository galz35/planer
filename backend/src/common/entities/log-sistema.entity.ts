import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'p_Logs' })
export class LogSistema {
    @PrimaryGeneratedColumn()
    idLog: number;

    @Column()
    nivel: string;

    @Column()
    origen: string;

    @Column({ type: 'text' })
    mensaje: string;

    @Column({ type: 'text', nullable: true })
    stack: string;

    @Column({ nullable: true })
    idUsuario: number;

    @CreateDateColumn()
    fecha: Date;
}
