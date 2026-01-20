import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';

import { PermisoArea } from './entities/permiso-area.entity';
import { PermisoEmpleado } from './entities/permiso-empleado.entity';
import { DelegacionVisibilidad } from './entities/delegacion-visibilidad.entity';
// import { Empleado } from './entities/empleado.entity'; // DEPRECATED
import { OrganizacionNodoRh } from './entities/organizacion-nodo-rh.entity';
import { Usuario } from '../auth/entities/usuario.entity';

import { CrearPermisoAreaDto } from './dto/crear-permiso-area.dto';
import { CrearPermisoEmpleadoDto } from './dto/crear-permiso-empleado.dto';
import { CrearDelegacionDto } from './dto/crear-delegacion.dto';

/**
 * AccesoService - CRUD para permisos y delegaciones
 * REFACTORED: Uses p_Usuarios (Usuario) instead of p_empleados (Empleado)
 */
@Injectable()
export class AccesoService {
    constructor(
        @InjectRepository(PermisoArea)
        private readonly repoArea: Repository<PermisoArea>,

        @InjectRepository(PermisoEmpleado)
        private readonly repoEmpleado: Repository<PermisoEmpleado>,

        @InjectRepository(DelegacionVisibilidad)
        private readonly repoDelegacion: Repository<DelegacionVisibilidad>,

        // Removed Empleado repo since table is dropped
        @InjectRepository(OrganizacionNodoRh)
        private readonly repoOrg: Repository<OrganizacionNodoRh>,

        @InjectRepository(Usuario)
        private readonly repoUsuario: Repository<Usuario>,
    ) { }

    async crearPermisoArea(dto: CrearPermisoAreaDto): Promise<PermisoArea> {
        const empleadoRecibe = await this.repoUsuario.findOne({ where: { carnet: dto.carnetRecibe.trim() } });
        if (!empleadoRecibe) throw new BadRequestException(`Empleado receptor no encontrado: ${dto.carnetRecibe}`);

        const nodo = await this.repoOrg.findOne({ where: { idOrg: dto.idOrgRaiz } });
        if (!nodo) throw new BadRequestException(`Nodo organizacional no encontrado: ${dto.idOrgRaiz}`);

        const permiso = this.repoArea.create({
            carnetOtorga: dto.carnetOtorga?.trim() || null,
            carnetRecibe: dto.carnetRecibe.trim(),
            idOrgRaiz: String(dto.idOrgRaiz),
            alcance: dto.alcance || 'SUBARBOL',
            activo: dto.activo !== false,
            fechaInicio: new Date(),
            fechaFin: dto.fechaFin ? new Date(dto.fechaFin) : null,
            motivo: dto.motivo?.trim() || null,
        });
        return this.repoArea.save(permiso);
    }

    async listarPermisosArea(carnetRecibe: string): Promise<PermisoArea[]> {
        return this.repoArea.find({
            where: { carnetRecibe: carnetRecibe.trim() },
            relations: ['nodoRaiz', 'empleadoOtorga'], // Requires mapping relations in Entity if changed
            order: { creadoEn: 'DESC' },
        });
    }

    async listarTodosPermisosArea(): Promise<PermisoArea[]> {
        return this.repoArea.find({
            where: { activo: true },
            relations: ['nodoRaiz', 'empleadoRecibe', 'empleadoOtorga'],
            order: { creadoEn: 'DESC' },
        });
    }

    async desactivarPermisoArea(id: string): Promise<PermisoArea> {
        const permiso = await this.repoArea.findOne({ where: { id } });
        if (!permiso) throw new NotFoundException(`Permiso de área no encontrado: ${id}`);
        permiso.activo = false;
        return this.repoArea.save(permiso);
    }

    async crearPermisoEmpleado(dto: CrearPermisoEmpleadoDto): Promise<PermisoEmpleado> {
        const carnetRecibe = dto.carnetRecibe.trim();
        const carnetObjetivo = dto.carnetObjetivo.trim();
        if (carnetRecibe === carnetObjetivo) throw new BadRequestException('No tiene sentido crear un permiso hacia sí mismo.');

        const empleadoRecibe = await this.repoUsuario.findOne({ where: { carnet: carnetRecibe } });
        if (!empleadoRecibe) throw new BadRequestException(`Empleado receptor no encontrado: ${carnetRecibe}`);

        const empleadoObjetivo = await this.repoUsuario.findOne({ where: { carnet: carnetObjetivo } });
        if (!empleadoObjetivo) throw new BadRequestException(`Empleado objetivo no encontrado: ${carnetObjetivo}`);

        const existente = await this.repoEmpleado.findOne({ where: { carnetRecibe, carnetObjetivo, activo: true } });
        if (existente) throw new BadRequestException('Ya existe un permiso activo para esta combinación.');

        const permiso = this.repoEmpleado.create({
            carnetOtorga: dto.carnetOtorga?.trim() || null,
            carnetRecibe,
            carnetObjetivo,
            activo: dto.activo !== false,
            fechaInicio: new Date(),
            fechaFin: dto.fechaFin ? new Date(dto.fechaFin) : null,
            motivo: dto.motivo?.trim() || null,
            tipoAcceso: dto.tipoAcceso || 'ALLOW',
        });
        return this.repoEmpleado.save(permiso);
    }

    async listarPermisosEmpleado(carnetRecibe: string): Promise<PermisoEmpleado[]> {
        return this.repoEmpleado.find({
            where: { carnetRecibe: carnetRecibe.trim() },
            relations: ['empleadoObjetivo', 'empleadoOtorga'],
            order: { creadoEn: 'DESC' },
        });
    }

    async listarTodosPermisosEmpleado(): Promise<PermisoEmpleado[]> {
        return this.repoEmpleado.find({
            where: { activo: true },
            relations: ['empleadoRecibe', 'empleadoObjetivo', 'empleadoOtorga'],
            order: { creadoEn: 'DESC' },
        });
    }

    async desactivarPermisoEmpleado(id: string): Promise<PermisoEmpleado> {
        const permiso = await this.repoEmpleado.findOne({ where: { id } });
        if (!permiso) throw new NotFoundException(`Permiso por empleado no encontrado: ${id}`);
        permiso.activo = false;
        return this.repoEmpleado.save(permiso);
    }

    async crearDelegacion(dto: CrearDelegacionDto): Promise<DelegacionVisibilidad> {
        const carnetDelegante = dto.carnetDelegante.trim();
        const carnetDelegado = dto.carnetDelegado.trim();
        if (carnetDelegante === carnetDelegado) throw new BadRequestException('La delegación a sí mismo no tiene sentido.');

        const delegante = await this.repoUsuario.findOne({ where: { carnet: carnetDelegante } });
        if (!delegante) throw new BadRequestException(`Empleado delegante no encontrado: ${carnetDelegante}`);

        const delegado = await this.repoUsuario.findOne({ where: { carnet: carnetDelegado } });
        if (!delegado) throw new BadRequestException(`Empleado delegado no encontrado: ${carnetDelegado}`);

        const existente = await this.repoDelegacion.findOne({ where: { carnetDelegante, carnetDelegado, activo: true } });
        if (existente) throw new BadRequestException('Ya existe una delegación activa para esta combinación.');

        const delegacion = this.repoDelegacion.create({
            carnetDelegante,
            carnetDelegado,
            activo: dto.activo !== false,
            fechaInicio: new Date(),
            fechaFin: dto.fechaFin ? new Date(dto.fechaFin) : null,
            motivo: dto.motivo?.trim() || null,
        });
        return this.repoDelegacion.save(delegacion);
    }

    async listarDelegacionesPorDelegado(carnetDelegado: string): Promise<DelegacionVisibilidad[]> {
        return this.repoDelegacion.find({
            where: { carnetDelegado: carnetDelegado.trim() },
            relations: ['empleadoDelegante'],
            order: { creadoEn: 'DESC' },
        });
    }

    async listarDelegacionesPorDelegante(carnetDelegante: string): Promise<DelegacionVisibilidad[]> {
        return this.repoDelegacion.find({
            where: { carnetDelegante: carnetDelegante.trim() },
            relations: ['empleadoDelegado'],
            order: { creadoEn: 'DESC' },
        });
    }

    async listarTodasDelegaciones(): Promise<DelegacionVisibilidad[]> {
        return this.repoDelegacion.find({
            where: { activo: true },
            relations: ['empleadoDelegante', 'empleadoDelegado'],
            order: { creadoEn: 'DESC' },
        });
    }

    async desactivarDelegacion(id: string): Promise<DelegacionVisibilidad> {
        const delegacion = await this.repoDelegacion.findOne({ where: { id } });
        if (!delegacion) throw new NotFoundException(`Delegación no encontrada: ${id}`);
        delegacion.activo = false;
        return this.repoDelegacion.save(delegacion);
    }

    async buscarEmpleadoPorCarnet(carnet: string): Promise<Usuario | null> {
        return this.repoUsuario.findOne({ where: { carnet: carnet.trim() } });
    }

    async buscarEmpleadoPorCorreo(correo: string): Promise<Usuario | null> {
        return this.repoUsuario.findOne({ where: { correo: correo.trim().toLowerCase() } });
    }

    async listarEmpleadosActivos(): Promise<Usuario[]> {
        return this.repoUsuario.find({ where: { activo: true }, order: { nombre: 'ASC' } });
    }

    async buscarEmpleados(termino: string, limite: number = 10): Promise<Usuario[]> {
        return this.repoUsuario
            .createQueryBuilder('u')
            .where('LOWER(u.nombre) LIKE LOWER(:t) OR u.carnet LIKE :t OR LOWER(u.correo) LIKE LOWER(:t)', { t: `%${termino}%` })
            .andWhere('u.activo = true')
            .orderBy('u.nombre', 'ASC')
            .limit(limite)
            .getMany();
    }

    async buscarNodosOrganizacion(termino: string): Promise<OrganizacionNodoRh[]> {
        return this.repoOrg
            .createQueryBuilder('nodo')
            .where('LOWER(nodo.descripcion) LIKE LOWER(:termino)', { termino: `%${termino}%` })
            .orderBy('nodo.descripcion', 'ASC')
            .limit(50)
            .getMany();
    }

    async getDebugRawData(): Promise<any> {
        // Only return p_Usuarios sample as p_empleados is dropped
        const usuarios = await this.repoUsuario.find({ take: 5 });
        return {
            p_usuarios_sample: usuarios
        };
    }
}
