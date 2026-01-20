import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Usuario, OrganizacionNodo, UsuarioOrganizacion, UsuarioCredenciales } from '../entities';
import * as bcrypt from 'bcrypt';

interface ImportEmpleadoDto {
    nombre: string;
    correo: string;
    telefono?: string;
    activo?: boolean;
    nodoNombre?: string;
    rolEnNodo?: string;
}

interface ImportNodoDto {
    nombre: string;
    tipo: 'Dirección' | 'Gerencia' | 'Subgerencia' | 'Equipo';
    nombrePadre?: string;
    activo?: boolean;
}

interface ImportResult {
    success: boolean;
    message: string;
    created: number;
    updated: number;
    errors: string[];
    details?: any[];
}

@Injectable()
export class ImportService {
    constructor(
        @InjectRepository(Usuario)
        private readonly userRepo: Repository<Usuario>,
        @InjectRepository(OrganizacionNodo)
        private readonly nodoRepo: Repository<OrganizacionNodo>,
        @InjectRepository(UsuarioOrganizacion)
        private readonly userOrgRepo: Repository<UsuarioOrganizacion>,
        private readonly dataSource: DataSource,
    ) { }

    /**
     * Importar empleados
     */
    async importEmpleados(empleados: ImportEmpleadoDto[], modo: 'crear' | 'actualizar' | 'upsert'): Promise<ImportResult> {
        const result: ImportResult = {
            success: true,
            message: '',
            created: 0,
            updated: 0,
            errors: [],
            details: []
        };

        for (const emp of empleados) {
            try {
                // Validar campos requeridos
                if (!emp.nombre || !emp.correo) {
                    result.errors.push(`Empleado sin nombre o correo: ${JSON.stringify(emp)}`);
                    continue;
                }

                // Normalizar correo
                const correo = emp.correo.toLowerCase().trim();

                // Buscar si ya existe
                let usuario = await this.userRepo.findOne({ where: { correo } });

                if (usuario && modo === 'crear') {
                    result.errors.push(`Empleado ya existe (modo=crear): ${correo}`);
                    continue;
                }

                if (!usuario && modo === 'actualizar') {
                    result.errors.push(`Empleado no existe (modo=actualizar): ${correo}`);
                    continue;
                }

                if (usuario) {
                    // Actualizar
                    usuario.nombre = emp.nombre.trim();
                    usuario.telefono = emp.telefono?.trim() || usuario.telefono;
                    usuario.activo = emp.activo !== undefined ? emp.activo : usuario.activo;
                    await this.userRepo.save(usuario);
                    result.updated++;
                    result.details?.push({ correo, accion: 'actualizado' });
                } else {
                    // Crear nuevo usuario
                    usuario = this.userRepo.create({
                        nombre: emp.nombre.trim(),
                        correo,
                        telefono: emp.telefono?.trim(),
                        activo: emp.activo !== undefined ? emp.activo : true,
                        rolGlobal: 'Empleado',
                    });
                    await this.userRepo.save(usuario);

                    // Crear credenciales con password por defecto
                    const passwordHash = await bcrypt.hash('Claro2024!', 10);
                    await this.dataSource.query(
                        `INSERT INTO "p_UsuariosCredenciales" ("idUsuario", "passwordHash") VALUES ($1, $2)`,
                        [usuario.idUsuario, passwordHash]
                    );

                    result.created++;
                    result.details?.push({ correo, accion: 'creado' });
                }

                // Asignar a nodo si se especificó
                if (emp.nodoNombre) {
                    const nodo = await this.nodoRepo.findOne({
                        where: { nombre: emp.nodoNombre.trim() }
                    });

                    if (nodo) {
                        // Verificar si ya tiene asignación
                        const existeAsig = await this.userOrgRepo.findOne({
                            where: {
                                idUsuario: usuario.idUsuario,
                                idNodo: nodo.idNodo
                            }
                        });

                        if (!existeAsig) {
                            const asignacion = this.userOrgRepo.create({
                                idUsuario: usuario.idUsuario,
                                idNodo: nodo.idNodo,
                                rol: emp.rolEnNodo || 'Colaborador'
                            });
                            await this.userOrgRepo.save(asignacion);
                        } else if (emp.rolEnNodo) {
                            existeAsig.rol = emp.rolEnNodo;
                            await this.userOrgRepo.save(existeAsig);
                        }
                    } else {
                        result.errors.push(`Nodo no encontrado para ${correo}: ${emp.nodoNombre}`);
                    }
                }

            } catch (error: any) {
                result.errors.push(`Error procesando ${emp.correo}: ${error.message}`);
            }
        }

        result.message = `Procesados ${empleados.length} empleados. Creados: ${result.created}, Actualizados: ${result.updated}, Errores: ${result.errors.length}`;
        result.success = result.errors.length === 0;

        return result;
    }

    /**
     * Importar nodos de organización
     */
    async importOrganizacion(nodos: ImportNodoDto[], modo: 'crear' | 'actualizar' | 'upsert'): Promise<ImportResult> {
        const result: ImportResult = {
            success: true,
            message: '',
            created: 0,
            updated: 0,
            errors: [],
            details: []
        };

        // Ordenar por tipo para crear padres primero
        const tipoOrder = { 'Dirección': 1, 'Gerencia': 2, 'Subgerencia': 3, 'Equipo': 4 };
        const sorted = [...nodos].sort((a, b) =>
            (tipoOrder[a.tipo] || 5) - (tipoOrder[b.tipo] || 5)
        );

        for (const nodo of sorted) {
            try {
                // Validar campos requeridos
                if (!nodo.nombre || !nodo.tipo) {
                    result.errors.push(`Nodo sin nombre o tipo: ${JSON.stringify(nodo)}`);
                    continue;
                }

                const nombre = nodo.nombre.trim();

                // Buscar si ya existe
                let nodoExistente = await this.nodoRepo.findOne({ where: { nombre } });

                if (nodoExistente && modo === 'crear') {
                    result.errors.push(`Nodo ya existe (modo=crear): ${nombre}`);
                    continue;
                }

                if (!nodoExistente && modo === 'actualizar') {
                    result.errors.push(`Nodo no existe (modo=actualizar): ${nombre}`);
                    continue;
                }

                // Buscar padre si se especificó
                let idPadre: number | null = null;
                if (nodo.nombrePadre) {
                    const padre = await this.nodoRepo.findOne({
                        where: { nombre: nodo.nombrePadre.trim() }
                    });
                    if (padre) {
                        idPadre = padre.idNodo;
                    } else {
                        result.errors.push(`Padre no encontrado para ${nombre}: ${nodo.nombrePadre}`);
                        // Continuar de todos modos, crear sin padre
                    }
                }

                if (nodoExistente) {
                    // Actualizar
                    nodoExistente.tipo = nodo.tipo;
                    nodoExistente.activo = nodo.activo !== undefined ? nodo.activo : nodoExistente.activo;
                    if (idPadre !== null) {
                        nodoExistente.idPadre = idPadre;
                    }
                    await this.nodoRepo.save(nodoExistente);
                    result.updated++;
                    result.details?.push({ nombre, accion: 'actualizado' });
                } else {
                    // Crear nuevo
                    const nuevoNodo = this.nodoRepo.create({
                        nombre,
                        tipo: nodo.tipo,
                        idPadre: idPadre !== null ? idPadre : undefined,
                        activo: nodo.activo !== undefined ? nodo.activo : true,
                    });
                    await this.nodoRepo.save(nuevoNodo);
                    result.created++;
                    result.details?.push({ nombre, accion: 'creado' });
                }

            } catch (error: any) {
                result.errors.push(`Error procesando nodo ${nodo.nombre}: ${error.message}`);
            }
        }

        result.message = `Procesados ${nodos.length} nodos. Creados: ${result.created}, Actualizados: ${result.updated}, Errores: ${result.errors.length}`;
        result.success = result.errors.length === 0;

        return result;
    }

    /**
     * Importar asignaciones de empleados a nodos
     */
    async importAsignaciones(asignaciones: { correo: string, nodoNombre: string, rol: string }[]): Promise<ImportResult> {
        const result: ImportResult = {
            success: true,
            message: '',
            created: 0,
            updated: 0,
            errors: [],
            details: []
        };

        for (const asig of asignaciones) {
            try {
                const correo = asig.correo.toLowerCase().trim();

                // Buscar usuario
                const usuario = await this.userRepo.findOne({ where: { correo } });
                if (!usuario) {
                    result.errors.push(`Usuario no encontrado: ${correo}`);
                    continue;
                }

                // Buscar nodo
                const nodo = await this.nodoRepo.findOne({
                    where: { nombre: asig.nodoNombre.trim() }
                });
                if (!nodo) {
                    result.errors.push(`Nodo no encontrado: ${asig.nodoNombre}`);
                    continue;
                }

                // Verificar si ya existe la asignación
                const existeAsig = await this.userOrgRepo.findOne({
                    where: {
                        idUsuario: usuario.idUsuario,
                        idNodo: nodo.idNodo
                    }
                });

                if (existeAsig) {
                    existeAsig.rol = asig.rol || existeAsig.rol;
                    await this.userOrgRepo.save(existeAsig);
                    result.updated++;
                    result.details?.push({ correo, nodo: asig.nodoNombre, accion: 'actualizado' });
                } else {
                    const nuevaAsig = this.userOrgRepo.create({
                        idUsuario: usuario.idUsuario,
                        idNodo: nodo.idNodo,
                        rol: asig.rol || 'Colaborador'
                    });
                    await this.userOrgRepo.save(nuevaAsig);
                    result.created++;
                    result.details?.push({ correo, nodo: asig.nodoNombre, accion: 'creado' });
                }

            } catch (error: any) {
                result.errors.push(`Error en asignación ${asig.correo} -> ${asig.nodoNombre}: ${error.message}`);
            }
        }

        result.message = `Procesadas ${asignaciones.length} asignaciones. Creadas: ${result.created}, Actualizadas: ${result.updated}, Errores: ${result.errors.length}`;
        result.success = result.errors.length === 0;

        return result;
    }

    /**
     * Obtener estadísticas actuales
     */
    async getStats() {
        const totalEmpleados = await this.userRepo.count();
        const empleadosActivos = await this.userRepo.count({ where: { activo: true } });
        const totalNodos = await this.nodoRepo.count();
        const nodosActivos = await this.nodoRepo.count({ where: { activo: true } });
        const totalAsignaciones = await this.userOrgRepo.count();

        // Empleados por tipo de nodo
        const porTipo = await this.userOrgRepo.query(`
            SELECT n.tipo, COUNT(DISTINCT uo."idUsuario") as cantidad
            FROM "p_UsuariosOrganizacion" uo
            JOIN "p_OrganizacionNodos" n ON n."idNodo" = uo."idNodo"
            GROUP BY n.tipo
        `);

        // Nodos vacíos
        const nodosVacios = await this.nodoRepo.query(`
            SELECT COUNT(*) as cantidad
            FROM "p_OrganizacionNodos" n
            LEFT JOIN "p_UsuariosOrganizacion" uo ON uo."idNodo" = n."idNodo"
            WHERE n.activo = true
            GROUP BY n."idNodo"
            HAVING COUNT(uo."idRelacion") = 0
        `);

        return {
            success: true,
            data: {
                empleados: {
                    total: totalEmpleados,
                    activos: empleadosActivos,
                    inactivos: totalEmpleados - empleadosActivos
                },
                nodos: {
                    total: totalNodos,
                    activos: nodosActivos,
                    vacios: nodosVacios.length
                },
                asignaciones: totalAsignaciones,
                distribucionPorTipo: porTipo
            }
        };
    }
}
