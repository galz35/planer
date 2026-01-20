import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Usuario } from '../../auth/entities/usuario.entity';

@Entity({ name: 'p_Auditoria' })
export class AuditLog {
    @PrimaryGeneratedColumn()
    idAudit: number;

    @Column()
    idUsuario: number;

    @ManyToOne(() => Usuario)
    @JoinColumn({ name: 'idUsuario' })
    usuario: Usuario;

    @Column()
    accion: string;

    @Column({ nullable: true })
    recurso: string;

    @Column({ nullable: true })
    recursoId: string;

    @Column({ type: 'text', nullable: true })
    detalles: string;

    @Column({ nullable: true })
    ip: string;

    @CreateDateColumn()
    fecha: Date;
}
