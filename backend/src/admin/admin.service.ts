import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario, UsuarioCredenciales, UsuarioOrganizacion, OrganizacionNodo, Rol, UsuarioConfig } from '../entities';
import * as bcrypt from 'bcrypt';
import { EmpleadoImportDto } from './admin.controller';

@Injectable()
export class AdminService {
    constructor(
        @InjectRepository(Usuario)
        private usuarioRepo: Repository<Usuario>,
        @InjectRepository(UsuarioCredenciales)
        private credencialesRepo: Repository<UsuarioCredenciales>,
        @InjectRepository(UsuarioOrganizacion)
        private usuarioOrgRepo: Repository<UsuarioOrganizacion>,
        @InjectRepository(OrganizacionNodo)
        private nodoRepo: Repository<OrganizacionNodo>,
        @InjectRepository(Rol)
        private rolRepo: Repository<Rol>,
        @InjectRepository(UsuarioConfig)
        private configRepo: Repository<UsuarioConfig>,
    ) { }

    /**
     * Importar empleados masivamente
     * - Si existe (por correo): actualizar datos y estado
     * - Si no existe: crear nuevo
     */
    async importEmpleados(empleados: EmpleadoImportDto[]) {
        const results = {
            creados: 0,
            actualizados: 0,
            errores: [] as string[],
        };

        const hashedDefaultPw = await bcrypt.hash('123456', 10);
        const today = new Date();

        for (const emp of empleados) {
            try {
                if (!emp.correo || !emp.nombre) {
                    results.errores.push(`Falta correo o nombre: ${JSON.stringify(emp)}`);
                    continue;
                }

                const correo = emp.correo.toLowerCase().trim();
                let user = await this.usuarioRepo.findOneBy({ correo });

                // Determinar si está activo basado en fechaBaja
                let activo = true;
                if (emp.fechaBaja) {
                    const fechaBaja = new Date(emp.fechaBaja);
                    activo = fechaBaja > today; // Activo si baja es futura
                }

                if (user) {
                    // UPDATE existing
                    user.nombre = emp.nombre;
                    if (emp.telefono) user.telefono = emp.telefono;
                    user.activo = activo;
                    await this.usuarioRepo.save(user);
                    results.actualizados++;
                } else {
                    // CREATE new
                    user = await this.usuarioRepo.save({
                        nombre: emp.nombre,
                        correo: correo,
                        telefono: emp.telefono || undefined,
                        activo: activo,
                        rolGlobal: 'User',
                    });

                    // Create credentials
                    await this.credencialesRepo.save({
                        idUsuario: user.idUsuario,
                        passwordHash: hashedDefaultPw,
                    });

                    results.creados++;
                }

                // Handle organization assignment
                if (emp.organizacion) {
                    const nodo = await this.nodoRepo.findOneBy({ nombre: emp.organizacion });
                    if (nodo) {
                        // Check if assignment exists
                        let asign = await this.usuarioOrgRepo.findOneBy({
                            idUsuario: user.idUsuario,
                            idNodo: nodo.idNodo
                        });

                        if (!asign) {
                            await this.usuarioOrgRepo.save({
                                idUsuario: user.idUsuario,
                                idNodo: nodo.idNodo,
                                rol: emp.rol || 'Colaborador',
                                fechaInicio: emp.fechaIngreso ? new Date(emp.fechaIngreso) : new Date(),
                            });
                        } else if (emp.rol && asign.rol !== emp.rol) {
                            asign.rol = emp.rol;
                            await this.usuarioOrgRepo.save(asign);
                        }
                    }
                }

            } catch (err) {
                results.errores.push(`Error procesando ${emp.correo}: ${err.message}`);
            }
        }

        return results;
    }

    /**
     * Crear un solo usuario (Reutilizando lógica de importación)
     */
    async crearUsuario(dto: EmpleadoImportDto) {
        return this.importEmpleados([dto]);
    }

    /**
     * Actualizar estado de un empleado
     */
    async updateEstadoEmpleado(correo: string, activo: boolean, fechaBaja?: string) {
        const user = await this.usuarioRepo.findOneBy({ correo: correo.toLowerCase() });
        if (!user) {
            throw new NotFoundException(`Usuario no encontrado: ${correo}`);
        }

        user.activo = activo;
        await this.usuarioRepo.save(user);

        return { mensaje: `Usuario ${correo} actualizado a ${activo ? 'ACTIVO' : 'INACTIVO'}` };
    }

    /**
     * Resetear contraseña
     */
    async resetPassword(correo: string, nuevaPassword: string) {
        const user = await this.usuarioRepo.findOneBy({ correo: correo.toLowerCase() });
        if (!user) {
            throw new NotFoundException(`Usuario no encontrado: ${correo}`);
        }

        const hashedPw = await bcrypt.hash(nuevaPassword, 10);

        let creds = await this.credencialesRepo.findOneBy({ idUsuario: user.idUsuario });
        if (creds) {
            creds.passwordHash = hashedPw;
            await this.credencialesRepo.save(creds);
        } else {
            await this.credencialesRepo.save({
                idUsuario: user.idUsuario,
                passwordHash: hashedPw,
            });
        }

        return { mensaje: `Contraseña reseteada para ${correo}` };
    }

    /**
     * Obtener lista de empleados
     */
    async getEmpleados() {
        const users = await this.usuarioRepo.find({
            select: ['idUsuario', 'nombre', 'correo', 'telefono', 'activo', 'rolGlobal', 'fechaCreacion'],
            order: { nombre: 'ASC' },
            take: 500, // Limit for safety
        });
        return users;
    }

    /**
     * Estadísticas
     */
    async getStats() {
        const total = await this.usuarioRepo.count();
        const activos = await this.usuarioRepo.count({ where: { activo: true } });
        const inactivos = total - activos;
        const admins = await this.usuarioRepo.count({ where: { rolGlobal: 'Admin' } });
        const nodos = await this.nodoRepo.count();
        const asignaciones = await this.usuarioOrgRepo.count();

        return {
            totalUsuarios: total,
            usuariosActivos: activos,
            usuariosInactivos: inactivos,
            administradores: admins,
            nodosOrganizacionales: nodos,
            asignaciones: asignaciones,
        };
    }

    /**
     * Actualizar menú por defecto de un rol
     */
    async updateRoleMenu(idRol: number, menuJson: any) {
        const rol = await this.rolRepo.findOneBy({ idRol });
        if (!rol) throw new NotFoundException('Rol no encontrado');

        rol.defaultMenu = JSON.stringify(menuJson);
        await this.rolRepo.save(rol);
        return { mensaje: 'Menú actualizado correctamente' };
    }

    /**
     * Actualizar menú personalizado de usuario
     */
    async updateUserMenu(idUsuario: number, menuJson: any) {
        let config = await this.configRepo.findOneBy({ idUsuario });
        if (!config) {
            config = this.configRepo.create({ idUsuario });
        }

        config.customMenu = JSON.stringify(menuJson);
        await this.configRepo.save(config);
        return { mensaje: 'Menú personalizado guardado' };
    }
}
