import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany, Index } from 'typeorm';
import { Rol } from './rol.entity';
import { UsuarioOrganizacion } from './usuario-organizacion.entity';

/** ENTIDAD UNIFICADA: USUARIO + EMPLEADO */
@Entity({ name: 'p_Usuarios' })
export class Usuario {
    @PrimaryGeneratedColumn()
    idUsuario: number;

    @Column({ type: 'varchar' })
    nombre: string;

    @Index({ unique: true })
    @Column({ type: 'varchar', length: 50, nullable: true })
    carnet: string | null;

    @Index({ unique: true })
    @Column({ type: 'varchar' })
    correo: string;

    @Column({ type: 'varchar', nullable: true })
    telefono: string | null;

    @Column({ default: true })
    activo: boolean;

    @Column({ type: 'varchar', default: 'Empleado' })
    rolGlobal: string;

    @Column({ type: 'int', nullable: true })
    idRol: number | null;

    @ManyToOne(() => Rol)
    @JoinColumn({ name: 'idRol' })
    rol: Rol;

    @Column({ type: 'varchar', length: 2, default: 'NI' })
    pais: string;

    // === CAMPOS RRHH (NUEVOS) ===

    @Column({ type: 'varchar', nullable: true })
    nombreCompleto: string | null;

    @Column({ type: 'varchar', nullable: true })
    cargo: string | null;

    @Column({ type: 'varchar', nullable: true })
    departamento: string | null;

    @Column({ type: 'varchar', nullable: true })
    orgDepartamento: string | null;

    @Column({ type: 'varchar', nullable: true })
    orgGerencia: string | null;

    @Column({ type: 'varchar', nullable: true })
    idOrg: string | null;

    @Column({ type: 'varchar', nullable: true })
    jefeCarnet: string | null;

    @Column({ type: 'varchar', nullable: true })
    jefeNombre: string | null;

    @Column({ type: 'varchar', nullable: true })
    jefeCorreo: string | null;

    @Column({ type: 'timestamp', nullable: true })
    fechaIngreso: Date | null;

    @Column({ type: 'varchar', nullable: true })
    genero: string | null;

    @Column({ type: 'varchar', nullable: true })
    username: string | null;

    // === CAMPOS EXTENDIDOS RRHH (CSV) ===

    @Column({ type: 'varchar', nullable: true })
    cedula: string | null;

    @Column({ type: 'varchar', nullable: true })
    area: string | null;

    @Column({ type: 'varchar', nullable: true })
    gerencia: string | null;

    @Column({ type: 'varchar', nullable: true })
    subgerencia: string | null;

    @Column({ type: 'varchar', nullable: true })
    ogerencia: string | null;

    @Column({ type: 'varchar', nullable: true })
    direccion: string | null;

    @Column({ type: 'varchar', nullable: true })
    empresa: string | null;

    @Column({ type: 'varchar', nullable: true })
    ubicacion: string | null;

    // NIVELES ORGANIZACIONALES (TEXTO)
    @Column({ type: 'varchar', nullable: true, name: 'primer_nivel' })
    primerNivel: string | null;

    @Column({ type: 'varchar', nullable: true, name: 'segundo_nivel' })
    segundoNivel: string | null;

    @Column({ type: 'varchar', nullable: true, name: 'tercer_nivel' })
    tercerNivel: string | null;

    @Column({ type: 'varchar', nullable: true, name: 'cuarto_nivel' })
    cuartoNivel: string | null;

    @Column({ type: 'varchar', nullable: true, name: 'quinto_nivel' })
    quintoNivel: string | null;

    @Column({ type: 'varchar', nullable: true, name: 'sexto_nivel' })
    sextoNivel: string | null;

    // JEFATURA EXTENDIDA
    @Column({ type: 'varchar', nullable: true, name: 'carnet_jefe2' })
    carnetJefe2: string | null;

    @Column({ type: 'varchar', nullable: true, name: 'carnet_jefe3' })
    carnetJefe3: string | null;

    @Column({ type: 'varchar', nullable: true, name: 'carnet_jefe4' })
    carnetJefe4: string | null;

    // CONTRATO
    @Column({ type: 'varchar', nullable: true, name: 'tipo_empleado' })
    tipoEmpleado: string | null;

    @Column({ type: 'varchar', nullable: true, name: 'tipo_contrato' })
    tipoContrato: string | null;

    @Column({ type: 'varchar', nullable: true, name: 'fuente_datos' })
    fuenteDatos: string | null; // EXCEL, MANUAL

    @CreateDateColumn()
    fechaCreacion: Date;

    @OneToMany(() => UsuarioOrganizacion, (uo) => uo.usuario)
    organizaciones: UsuarioOrganizacion[];
}
