import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';

@Entity({ name: 'p_OrganizacionNodos' })
@Index(["idPadre"])
export class OrganizacionNodo {
    @PrimaryGeneratedColumn()
    idNodo: number;

    @Column({ nullable: true })
    idPadre: number;

    @ManyToOne(() => OrganizacionNodo, (nodo) => nodo.hijos)
    @JoinColumn({ name: 'idPadre' })
    padre: OrganizacionNodo;

    @OneToMany(() => OrganizacionNodo, (nodo) => nodo.padre)
    hijos: OrganizacionNodo[];

    @Column()
    tipo: string;

    @Column()
    nombre: string;

    @Column({ default: true })
    activo: boolean;
}
