import { Controller, Post, Body, UseGuards, HttpException, HttpStatus, Get, Param, Patch } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    /**
     * Importar empleados masivamente
     * Body: { empleados: Array<EmpleadoImport> }
     */
    @Post('empleados/import')
    async importEmpleados(@Body() body: { empleados: EmpleadoImportDto[] }) {
        if (!body.empleados || !Array.isArray(body.empleados)) {
            throw new HttpException('Se requiere array de empleados', HttpStatus.BAD_REQUEST);
        }
        return this.adminService.importEmpleados(body.empleados);
    }

    /**
     * Crear un solo usuario
     */
    @Post('usuarios')
    async crearUsuario(@Body() body: EmpleadoImportDto) {
        return this.adminService.crearUsuario(body);
    }

    /**
     * Actualizar estado de un empleado (activo/inactivo por baja)
     */
    @Patch('empleados/:correo/estado')
    async updateEstado(
        @Param('correo') correo: string,
        @Body() body: { activo: boolean; fechaBaja?: string }
    ) {
        return this.adminService.updateEstadoEmpleado(correo, body.activo, body.fechaBaja);
    }

    /**
     * Resetear contraseña de un usuario
     */
    @Post('empleados/:correo/reset-password')
    async resetPassword(
        @Param('correo') correo: string,
        @Body() body: { nuevaPassword?: string }
    ) {
        return this.adminService.resetPassword(correo, body.nuevaPassword || '123456');
    }

    /**
     * Obtener lista de empleados con filtros
     */
    @Get('empleados')
    async getEmpleados() {
        return this.adminService.getEmpleados();
    }

    /**
     * Obtener estadísticas de usuarios
     */
    /**
     * Actualizar menú por defecto de rol
     */
    @Post('roles/:idRol/menu')
    async updateRoleMenu(
        @Param('idRol') idRol: string,
        @Body() body: { menu: any }
    ) {
        return this.adminService.updateRoleMenu(Number(idRol), body.menu);
    }

    /**
     * Actualizar menú personalizado de usuario
     */
    @Post('usuarios/:idUsuario/menu')
    async updateUserMenu(
        @Param('idUsuario') idUsuario: string,
        @Body() body: { menu: any }
    ) {
        return this.adminService.updateUserMenu(Number(idUsuario), body.menu);
    }

    @Get('stats')
    async getStats() {
        return this.adminService.getStats();
    }
}


// DTO para importación
export interface EmpleadoImportDto {
    correo: string;
    nombre: string;
    cargo?: string;
    telefono?: string;
    fechaIngreso?: string;
    fechaBaja?: string | null; // null = activo
    organizacion?: string; // Nombre del nodo
    jefeCorreo?: string;
    rol?: 'Colaborador' | 'Lider' | 'Gerente';
}
