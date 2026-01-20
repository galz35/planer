import { Entity, Column, PrimaryGeneratedColumn, Index, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Usuario } from '../../auth/entities/usuario.entity';

/**
 * p_permiso_empleado - Permiso puntual por empleado
 * "Este usuario puede ver a este empleado específico"
 */
@Entity({ name: 'p_permiso_empleado' })
@Index(['carnetRecibe', 'activo'])
export class PermisoEmpleado {
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

    @Column({ name: 'carnet_objetivo', type: 'varchar', length: 100 })
    carnetObjetivo: string;

    @ManyToOne(() => Usuario)
    @JoinColumn({ name: 'carnet_objetivo', referencedColumnName: 'carnet' })
    empleadoObjetivo: Usuario;

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

    @Column({ name: 'tipo_acceso', type: 'varchar', length: 20, default: 'ALLOW' })
    tipoAcceso: string; // 'ALLOW' | 'DENY'
}
