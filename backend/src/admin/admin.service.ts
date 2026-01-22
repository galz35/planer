import { Injectable, NotFoundException } from '@nestjs/common';
import * as adminRepo from './admin.repo';
import * as authRepo from '../auth/auth.repo';
import { RolDb, OrganizacionNodoDb, LogSistemaDb } from '../db/tipos';
import { VisibilidadService } from '../acceso/visibilidad.service';
import { AuditService } from '../common/audit.service';

@Injectable()
export class AdminService {
    constructor(
        private readonly visibilidadService: VisibilidadService,
        private readonly auditService: AuditService
    ) { }

    // Usuarios
    async usuariosListarTodos(page: number, limit: number) {
        return adminRepo.listarUsuarios(page, limit);
    }

    async getStats() {
        return adminRepo.obtenerEstadisticasAdmin();
    }

    async usuarioCambiarRol(idUsuario: number, rol: string, idAdmin: number, idRol?: number) {
        await adminRepo.cambiarRolUsuario(idUsuario, rol, idRol);
        await this.crearLog({
            idUsuario: idAdmin,
            accion: 'CAMBIO_ROL',
            entidad: 'Usuario',
            datos: `Usuario ${idUsuario} -> ${rol} (idRol: ${idRol})`
        });
    }

    // Roles
    async rolesListar() {
        return adminRepo.listarRoles();
    }

    async rolCrear(dto: any, idAdmin: number) {
        await adminRepo.crearRol(dto);
        await this.crearLog({ idUsuario: idAdmin, accion: 'CREAR_ROL', entidad: 'Rol', datos: dto.nombre });
    }

    async rolActualizar(id: number, dto: any, idAdmin: number) {
        await adminRepo.actualizarRol(id, dto);
        await this.crearLog({ idUsuario: idAdmin, accion: 'ACTUALIZAR_ROL', entidad: 'Rol', datos: `${id}` });
    }

    async rolEliminar(id: number, idAdmin: number) {
        await adminRepo.eliminarRol(id);
        await this.crearLog({ idUsuario: idAdmin, accion: 'ELIMINAR_ROL', entidad: 'Rol', datos: `${id}` });
    }

    // Logs
    async crearLog(log: Partial<LogSistemaDb>) {
        // Asegurar campos obligatorios
        return adminRepo.crearLog({
            accion: log.accion || 'UNKNOWN',
            ...log
        });
    }

    async logsListar(page: number, limit: number) {
        return this.auditService.listarLogs(page, limit);
    }

    async auditLogsListar(filter: any) {
        return this.auditService.listarAudit(filter.page || 1, filter.limit || 50, filter);
    }

    async auditLogsByTask(idTarea: number) {
        return [];
    }

    // Organigrama
    async getOrganigrama() {
        return adminRepo.obtenerOrganigrama();
    }

    async nodoCrear(dto: any, idAdmin: number) {
        const result = await adminRepo.crearNodoOrganigrama(dto);
        // result en repo podría devolver array, check repo
        await this.crearLog({ idUsuario: idAdmin, accion: 'CREAR_NODO', entidad: 'OrganizacionNodo', datos: dto.nombre });
        return result;
    }

    async usuarioAsignarANodo(dto: any, idAdmin: number) {
        await adminRepo.asignarUsuarioNodo(dto.idUsuario, dto.idNodo, dto.rol);
        await this.crearLog({ idUsuario: idAdmin, accion: 'ASIGNAR_NODO', entidad: 'UsuarioOrganizacion', datos: `${dto.idUsuario} -> ${dto.idNodo}` });
    }

    async getEfectiveVisibility(idUsuarioObjetivo: number) {
        // 1. Obtener usuario
        const usuario = await authRepo.obtenerUsuarioPorId(idUsuarioObjetivo);
        if (!usuario || !usuario.carnet) {
            throw new NotFoundException('Usuario no encontrado o sin carnet');
        }

        // 2. Usar servicio de visibilidad (Fuente de la verdad)
        const visibleEmployees = await this.visibilidadService.obtenerEmpleadosVisibles(usuario.carnet);

        return visibleEmployees;
    }
}
