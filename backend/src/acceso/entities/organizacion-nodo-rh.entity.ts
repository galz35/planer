import { Entity, Column, PrimaryColumn, Index, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';

/**
 * p_organizacion_nodos - Árbol organizacional desde RH (SIGHO1.dbo.organizacion)
 * PK = idorg (el ID lógico real del nodo, NO el identity)
 * Estructura: Adjacency List (padre -> idorg del padre)
 */
@Entity({ name: 'p_organizacion_nodos' })
export class OrganizacionNodoRh {
    @PrimaryColumn({ name: 'idorg', type: 'bigint' })
    idOrg: string; // bigint -> string

    @Index()
    @Column({ name: 'padre', type: 'bigint', nullable: true })
    padre: string | null;

    @ManyToOne(() => OrganizacionNodoRh, (nodo) => nodo.hijos, { nullable: true })
    @JoinColumn({ name: 'padre', referencedColumnName: 'idOrg' })
    nodoPadre: OrganizacionNodoRh | null;

    @OneToMany(() => OrganizacionNodoRh, (nodo) => nodo.nodoPadre)
    hijos: OrganizacionNodoRh[];

    @Column({ name: 'descripcion', type: 'varchar', length: 100, nullable: true })
    descripcion: string | null;

    @Column({ name: 'tipo', type: 'varchar', length: 50, nullable: true })
    tipo: string | null;

    @Column({ name: 'estado', type: 'varchar', length: 50, nullable: true })
    estado: string | null;

    @Column({ name: 'nivel', type: 'varchar', length: 200, nullable: true })
    nivel: string | null;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
    updatedAt: Date;
}
