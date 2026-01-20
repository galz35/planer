import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Usuario } from './usuario.entity';
import { OrganizacionNodo } from './organizacion-nodo.entity';

@Entity({ name: 'p_UsuariosOrganizacion' })
@Index(["idUsuario", "idNodo"])
export class UsuarioOrganizacion {
    @PrimaryGeneratedColumn()
    idRelacion: number;

    @Column()
    idUsuario: number;

    @ManyToOne(() => Usuario)
    @JoinColumn({ name: 'idUsuario' })
    usuario: Usuario;

    @Column()
    idNodo: number;

    @ManyToOne(() => OrganizacionNodo)
    @JoinColumn({ name: 'idNodo' })
    nodo: OrganizacionNodo;

    @Column()
    rol: string;

    @Column()
    fechaInicio: Date;

    @Column({ nullable: true })
    fechaFin: Date;
}
