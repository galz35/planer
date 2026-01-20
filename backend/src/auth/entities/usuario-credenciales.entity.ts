import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'p_UsuariosCredenciales' })
export class UsuarioCredenciales {
    @PrimaryGeneratedColumn()
    idCredencial: number;

    @Column()
    idUsuario: number;

    @Column()
    passwordHash: string;

    @Column({ nullable: true })
    ultimoLogin: Date;

    @Column({ nullable: true })
    refreshTokenHash: string;
}
