import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'p_Roles' })
export class Rol {
    @PrimaryGeneratedColumn()
    idRol: number;

    @Column({ unique: true })
    nombre: string;

    @Column({ nullable: true })
    descripcion: string;

    @Column({ default: false })
    esSistema: boolean;

    @Column({ type: 'text', default: '[]' })
    reglas: string;

    @Column({ type: 'text', nullable: true })
    defaultMenu: string;
}
