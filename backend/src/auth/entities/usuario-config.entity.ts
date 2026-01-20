import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, UpdateDateColumn } from 'typeorm';
import { Usuario } from './usuario.entity';

@Entity({ name: 'p_UsuariosConfig' })
export class UsuarioConfig {
    @PrimaryGeneratedColumn()
    idConfig: number;

    @Column()
    idUsuario: number;

    @ManyToOne(() => Usuario)
    @JoinColumn({ name: 'idUsuario' })
    usuario: Usuario;

    @Column({ default: 'list' })
    vistaPreferida: string;

    @Column({ type: 'text', nullable: true })
    rutinas: string;

    @Column({ type: 'text', nullable: true })
    customMenu: string;

    @UpdateDateColumn()
    fechaActualizacion: Date;
}
