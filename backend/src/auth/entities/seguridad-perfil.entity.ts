import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'p_SeguridadPerfiles' })
export class SeguridadPerfil {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', unique: true })
    nombre: string; // Ej: 'Gerente', 'Coordinador', 'Empleado'

    @Column({ type: 'text', nullable: true })
    menuJson: string; // JSON con la estructura del menú

    @Column({ type: 'simple-array', nullable: true })
    permisos: string[]; // Ej: ['APPROVE_CHANGES', 'VIEW_REPORTS']

    @Column({ default: true })
    activo: boolean;

    @CreateDateColumn()
    fechaCreacion: Date;

    @UpdateDateColumn()
    fechaActualizacion: Date;
}
