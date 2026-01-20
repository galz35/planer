import { Entity, Column, PrimaryGeneratedColumn, Index, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Usuario } from '../../auth/entities/usuario.entity';
import { OrganizacionNodoRh } from './organizacion-nodo-rh.entity';

/**
 * p_permiso_area - Permiso por área/subárbol organizacional
 * "Este usuario puede ver este nodo y su subárbol"
 */
@Entity({ name: 'p_permiso_area' })
@Index(['carnetRecibe', 'activo'])
export class PermisoArea {
    @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
    id: string;

    @Column({ name: 'carnet_otorga', type: 'varchar', length: 100, nullable: true })
    carnetOtorga: string | null;

    @ManyToOne(() => Usuario, { nullable: true })
    @JoinColumn({ name: 'carnet_otorga', referencedColumnName: 'carnet' })
    empleadoOtorga: Usuario | null;

    @Column({ name: 'carnet_recibe', type: 'varchar', length: 100 })
    carnetRecibe: string;

    @ManyToOne(() => Usuario)
    @JoinColumn({ name: 'carnet_recibe', referencedColumnName: 'carnet' })
    empleadoRecibe: Usuario;

    @Column({ name: 'idorg_raiz', type: 'bigint' })
    idOrgRaiz: string;

    @ManyToOne(() => OrganizacionNodoRh)
    @JoinColumn({ name: 'idorg_raiz', referencedColumnName: 'idOrg' })
    nodoRaiz: OrganizacionNodoRh;

    @Column({ name: 'alcance', type: 'varchar', length: 20, default: 'SUBARBOL' })
    alcance: 'SUBARBOL' | 'SOLO_NODO';

    @Column({ name: 'activo', type: 'boolean', default: true })
    activo: boolean;

    @Column({ name: 'fecha_inicio', type: 'date', nullable: true })
    fechaInicio: Date | null;

    @Column({ name: 'fecha_fin', type: 'date', nullable: true })
    fechaFin: Date | null;

    @Column({ name: 'motivo', type: 'varchar', length: 300, nullable: true })
    motivo: string | null;

    @CreateDateColumn({ name: 'creado_en', type: 'timestamp' })
    creadoEn: Date;
}
