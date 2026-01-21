import { Entity, Column, PrimaryGeneratedColumn, Index, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Usuario } from '../../auth/entities/usuario.entity';

/**
 * p_delegacion_visibilidad - Delegación de visibilidad
 * "La secretaria ve lo que ve el gerente"
 * Permite heredar la visibilidad de otro usuario sin hacks por cargo
 */
@Entity({ name: 'p_delegacion_visibilidad' })
@Index(['carnetDelegado', 'activo'])
export class DelegacionVisibilidad {
    @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
    id: string;

    @Column({ name: 'carnet_delegante', type: 'varchar', length: 100 })
    carnetDelegante: string;

    @ManyToOne(() => Usuario)
    @JoinColumn({ name: 'carnet_delegante', referencedColumnName: 'carnet' })
    empleadoDelegante: Usuario; // El gerente

    @Column({ name: 'carnet_delegado', type: 'varchar', length: 100 })
    carnetDelegado: string;

    @ManyToOne(() => Usuario)
    @JoinColumn({ name: 'carnet_delegado', referencedColumnName: 'carnet' })
    empleadoDelegado: Usuario; // La secretaria

    @Column({ name: 'activo', default: true })
    activo: boolean;

    @Column({ name: 'fecha_inicio', type: 'date', nullable: true })
    fechaInicio: Date | null;

    @Column({ name: 'fecha_fin', type: 'date', nullable: true })
    fechaFin: Date | null;

    @Column({ name: 'motivo', type: 'varchar', length: 300, nullable: true })
    motivo: string | null;

    @CreateDateColumn({ name: 'creado_en' })
    creadoEn: Date;
}
