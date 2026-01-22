import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';
import { AdminSecurityService } from './admin-security.service';
import { PaginationDto, AuditFilterDto, RolCrearDto, RolActualizarDto, OrganizacionNodoCrearDto, UsuarioOrganizacionAsignarDto } from './dto/admin.dtos';

@UseGuards(AuthGuard('jwt'))
@Controller('admin')
export class AdminController {
    constructor(
        private readonly adminService: AdminService,
        private readonly securityService: AdminSecurityService
    ) { }

    // ==========================================
    // USUARIOS
    // ==========================================
    @Get('stats')
    async getStats() {
        return this.adminService.getStats();
    }

    @Get('usuarios')
    async listarUsuarios(@Query() pag: PaginationDto) {
        return this.adminService.usuariosListarTodos(pag.page || 1, pag.limit || 50);
    }



    @Patch('usuarios/:id/rol')
    async cambiarRolUsuario(@Param('id') id: string, @Body('rol') rol: string, @Request() req: any) {
        return this.adminService.usuarioCambiarRol(+id, rol, req.user?.userId || 1);
    }

    @Get('usuarios/:id/visibilidad-efectiva')
    async obtenerVisibilidadEfectiva(@Param('id') id: string) {
        return this.adminService.getEfectiveVisibility(+id);
    }

    // ==========================================
    // ROLES
    // ==========================================
    @Get('roles')
    async listarRoles() {
        return this.adminService.rolesListar();
    }

    @Post('roles')
    async crearRol(@Body() dto: RolCrearDto, @Request() req: any) {
        return this.adminService.rolCrear(dto, req.user?.userId || 1);
    }

    @Patch('roles/:id')
    async actualizarRol(@Param('id') id: string, @Body() dto: RolActualizarDto, @Request() req: any) {
        return this.adminService.rolActualizar(+id, dto, req.user?.userId || 1);
    }

    @Delete('roles/:id')
    async eliminarRol(@Param('id') id: string, @Request() req: any) {
        return this.adminService.rolEliminar(+id, req.user?.userId || 1);
    }

    // ==========================================
    // LOGS & AUDIT
    // ==========================================
    @Get('logs')
    async listarLogs(@Query() pag: PaginationDto) {
        return this.adminService.logsListar(pag.page || 1, pag.limit || 50);
    }

    @Get('audit-logs')
    async listarAuditLogs(@Query() filtro: AuditFilterDto) {
        return this.adminService.auditLogsListar(filtro);
    }

    // ==========================================
    // ORGANIGRAMA
    // ==========================================
    @Get('organigrama')
    async obtenerOrganigrama() {
        return this.adminService.getOrganigrama();
    }

    @Post('nodos')
    async crearNodo(@Body() dto: OrganizacionNodoCrearDto, @Request() req: any) {
        return this.adminService.nodoCrear(dto, req.user?.userId || 1);
    }

    @Post('usuarios-organizacion')
    async asignarUsuarioNodo(@Body() dto: UsuarioOrganizacionAsignarDto, @Request() req: any) {
        return this.adminService.usuarioAsignarANodo(dto, req.user?.userId || 1);
    }
}
