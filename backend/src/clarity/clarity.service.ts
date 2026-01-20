import { Injectable } from '@nestjs/common';
import { ResourceNotFoundException, InsufficientPermissionsException, BusinessRuleException } from '../common/exceptions';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan, In, Brackets, DataSource, Not, IsNull } from 'typeorm';
import { Usuario } from '../auth/entities/usuario.entity';
import { OrganizacionNodo } from '../auth/entities/organizacion-nodo.entity';
import { UsuarioOrganizacion } from '../auth/entities/usuario-organizacion.entity';
import { UsuarioConfig } from '../auth/entities/usuario-config.entity';
import { Rol } from '../auth/entities/rol.entity';
import { LogSistema } from '../common/entities/log-sistema.entity';
import { AuditLog } from '../common/entities/audit-log.entity';
import { AuditService } from '../common/audit.service';
import {
    LogCrearDto, RolCrearDto, RolActualizarDto, OrganizacionNodoCrearDto, UsuarioOrganizacionAsignarDto, AuditFilterDto
} from './dto/clarity.dtos';

@Injectable()
export class ClarityService {
    constructor(
        @InjectRepository(Usuario) private userRepo: Repository<Usuario>,
        @InjectRepository(OrganizacionNodo) private nodoRepo: Repository<OrganizacionNodo>,
        @InjectRepository(UsuarioConfig) private configRepo: Repository<UsuarioConfig>,
        @InjectRepository(UsuarioOrganizacion) private userOrgRepo: Repository<UsuarioOrganizacion>,
        @InjectRepository(LogSistema) private logRepo: Repository<LogSistema>,
        @InjectRepository(Rol) private rolRepo: Repository<Rol>,
        private dataSource: DataSource,
        private auditService: AuditService,
    ) { }

    private async saveAuditLog(idUsuario: number, accion: string, recurso: string, recursoId: string, detalles?: any) {
        await this.auditService.log({
            idUsuario,
            accion,
            recurso,
            recursoId,
            detalles
        });
    }

    async usuariosListarTodos(page: number = 1, limit: number = 20) {
        const [items, total] = await this.userRepo.findAndCount({
            order: { nombre: 'ASC' },
            relations: ['rol'],
            skip: (page - 1) * limit,
            take: limit,
        });
        return { items, total, page, lastPage: Math.ceil(total / limit) };
    }

    async usuarioCambiarRol(idUsuario: number, rol: string, idEjecutor: number, idRol?: number) {
        const updateData: any = { rolGlobal: rol };
        if (idRol !== undefined) updateData.idRol = idRol;
        const result = await this.userRepo.update(idUsuario, updateData);
        await this.saveAuditLog(idEjecutor, 'RolCambiado', 'Usuario', idUsuario.toString(), { nuevoRol: rol, idRol });
        return result;
    }

    async crearLog(dto: LogCrearDto) {
        return this.logRepo.save(dto);
    }

    async logsListar(page: number = 1, limit: number = 100) {
        const [items, total] = await this.logRepo.findAndCount({
            order: { fecha: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
            relations: []
        });
        return { items, total, page, lastPage: Math.ceil(total / limit) };
    }

    async auditLogsListar(filter: AuditFilterDto) {
        const result = await this.auditService.listarAudit(filter.page, filter.limit, {
            accion: filter.accion,
            recurso: filter.recurso,
            idUsuario: filter.idUsuario,
            query: filter.query
        });
        return { items: result.items, total: result.total, page: filter.page, totalPages: result.totalPages };
    }

    async auditLogsByTask(taskId: number) {
        const logs = await this.auditService.getHistorialEntidad('Tarea', taskId.toString());
        return logs.slice(0, 20);
    }

    // --- CONFIG ---
    async getConfig(idUsuario: number) {
        return this.configRepo.findOne({ where: { idUsuario } });
    }

    async setConfig(idUsuario: number, dto: { vistaPreferida?: string, rutinas?: string }) {
        let config = await this.configRepo.findOne({ where: { idUsuario } });
        if (!config) {
            config = this.configRepo.create({
                idUsuario,
                vistaPreferida: dto.vistaPreferida || 'list',
                rutinas: dto.rutinas || '[]'
            });
        } else {
            if (dto.vistaPreferida) config.vistaPreferida = dto.vistaPreferida;
            if (dto.rutinas) config.rutinas = dto.rutinas;
        }
        return this.configRepo.save(config);
    }

    // --- ROLES ---
    async rolesListar() {
        return this.rolRepo.find({ order: { nombre: 'ASC' } });
    }

    async rolCrear(dto: RolCrearDto, idEjecutor: number) {
        const existing = await this.rolRepo.findOne({ where: { nombre: dto.nombre } });
        if (existing) throw new BusinessRuleException('Ya existe un rol con este nombre');

        const rol = this.rolRepo.create({
            nombre: dto.nombre,
            descripcion: dto.descripcion,
            reglas: dto.reglas ? JSON.stringify(dto.reglas) : '[]',
            esSistema: false
        });
        const saved = await this.rolRepo.save(rol);
        await this.saveAuditLog(idEjecutor, 'RolCreado', 'Rol', saved.idRol.toString(), { nombre: saved.nombre });
        return saved;
    }

    async rolActualizar(id: number, dto: RolActualizarDto, idEjecutor: number) {
        const rol = await this.rolRepo.findOneBy({ idRol: id });
        if (!rol) throw new ResourceNotFoundException('Rol', id);

        if (dto.nombre) {
            const existing = await this.rolRepo.findOne({ where: { nombre: dto.nombre } });
            if (existing && existing.idRol !== id) throw new BusinessRuleException('El nombre ya está en uso');
            rol.nombre = dto.nombre;
        }
        if (dto.descripcion !== undefined) rol.descripcion = dto.descripcion;
        if (dto.reglas) rol.reglas = JSON.stringify(dto.reglas);

        const saved = await this.rolRepo.save(rol);
        await this.saveAuditLog(idEjecutor, 'RolActualizado', 'Rol', saved.idRol.toString(), { nombre: saved.nombre });
        return saved;
    }

    async rolEliminar(id: number, idEjecutor: number) {
        const rol = await this.rolRepo.findOneBy({ idRol: id });
        if (!rol) throw new ResourceNotFoundException('Rol', id);
        if (rol.esSistema) throw new InsufficientPermissionsException('eliminar roles de sistema');

        const users = await this.userRepo.count({ where: { idRol: id } });
        if (users > 0) throw new BusinessRuleException('No se puede eliminar un rol que tiene usuarios asignados.');

        const result = await this.rolRepo.remove(rol);
        await this.saveAuditLog(idEjecutor, 'RolEliminado', 'Rol', id.toString(), { nombre: rol.nombre });
        return result;
    }

    // --- ORGANIGRAMA ---
    async getOrganigrama() {
        // Build clear tree structure
        const nodos = await this.nodoRepo.find({ order: { idPadre: 'ASC', nombre: 'ASC' } });
        const map = new Map();
        const roots: any[] = [];

        nodos.forEach(n => map.set(n.idNodo, { ...n, hijos: [], usuarios: [] }));

        // Get members
        const members = await this.userOrgRepo.find({ relations: ['usuario'] });
        members.forEach(m => {
            const node = map.get(m.idNodo);
            if (node) node.usuarios.push({
                idUsuario: m.idUsuario,
                nombre: m.usuario.nombre,
                rolNodo: m.rol, // Matching frontend u.rolNodo
                correo: m.usuario.correo
            });
        });

        // Build Tree
        nodos.forEach(n => {
            const node = map.get(n.idNodo);
            if (n.idPadre) {
                const parent = map.get(n.idPadre);
                if (parent) parent.hijos.push(node);
                else roots.push(node);
            } else {
                roots.push(node);
            }
        });

        return roots;
    }

    async nodoCrear(dto: OrganizacionNodoCrearDto, idEjecutor: number) {
        const nodo = this.nodoRepo.create({
            nombre: dto.nombre,
            tipo: dto.tipo,
            idPadre: dto.idPadre
        });
        const saved = await this.nodoRepo.save(nodo);
        await this.saveAuditLog(idEjecutor, 'NodoCreado', 'Organigrama', saved.idNodo.toString(), { nombre: saved.nombre });
        return saved;
    }

    async usuarioAsignarANodo(dto: UsuarioOrganizacionAsignarDto, idEjecutor: number) {
        const exists = await this.userOrgRepo.findOne({ where: { idUsuario: dto.idUsuario, idNodo: dto.idNodo } });
        if (exists) {
            exists.rol = dto.rol;
            return this.userOrgRepo.save(exists);
        }
        const rel = this.userOrgRepo.create({
            idUsuario: dto.idUsuario,
            idNodo: dto.idNodo,
            rol: dto.rol
        });
        const saved = await this.userOrgRepo.save(rel);
        await this.saveAuditLog(idEjecutor, 'AsignacionNodo', 'Organigrama', dto.idNodo.toString(), { usuario: dto.idUsuario, rol: dto.rol });
        return saved;
    }
}
