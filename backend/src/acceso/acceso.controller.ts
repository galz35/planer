import { Body, Controller, Delete, Get, Param, Post, Query, NotFoundException } from '@nestjs/common';
import { AccesoService } from './acceso.service';
import { CrearPermisoAreaDto } from './dto/crear-permiso-area.dto';
import { CrearPermisoEmpleadoDto } from './dto/crear-permiso-empleado.dto';
import { CrearDelegacionDto } from './dto/crear-delegacion.dto';
import { Usuario } from '../auth/entities/usuario.entity';

/**
 * AccesoController - CRUD para permisos y delegaciones
 * REFACTORED to use Usuario entity
 */
@Controller('acceso')
export class AccesoController {
    constructor(private readonly accesoService: AccesoService) { }

    // =========================================
    // PERMISO POR ÁREA
    // =========================================

    @Post('permiso-area')
    async crearPermisoArea(@Body() dto: CrearPermisoAreaDto) {
        const permiso = await this.accesoService.crearPermisoArea(dto);
        return {
            mensaje: 'Permiso por área creado exitosamente',
            permiso,
        };
    }

    @Get('permiso-area/:carnetRecibe')
    async listarPermisosArea(@Param('carnetRecibe') carnetRecibe: string) {
        return this.accesoService.listarPermisosArea(carnetRecibe);
    }

    @Get('permiso-area')
    async listarTodosPermisosArea() {
        return this.accesoService.listarTodosPermisosArea();
    }

    @Delete('permiso-area/:id')
    async desactivarPermisoArea(@Param('id') id: string) {
        const permiso = await this.accesoService.desactivarPermisoArea(id);
        return {
            mensaje: 'Permiso por área desactivado',
            permiso,
        };
    }

    // =========================================
    // PERMISO POR EMPLEADO
    // =========================================

    @Post('permiso-empleado')
    async crearPermisoEmpleado(@Body() dto: CrearPermisoEmpleadoDto) {
        const permiso = await this.accesoService.crearPermisoEmpleado(dto);
        return {
            mensaje: 'Permiso por empleado creado exitosamente',
            permiso,
        };
    }

    @Get('permiso-empleado/:carnetRecibe')
    async listarPermisosEmpleado(@Param('carnetRecibe') carnetRecibe: string) {
        return this.accesoService.listarPermisosEmpleado(carnetRecibe);
    }

    @Get('permiso-empleado')
    async listarTodosPermisosEmpleado() {
        return this.accesoService.listarTodosPermisosEmpleado();
    }

    @Delete('permiso-empleado/:id')
    async desactivarPermisoEmpleado(@Param('id') id: string) {
        const permiso = await this.accesoService.desactivarPermisoEmpleado(id);
        return {
            mensaje: 'Permiso por empleado desactivado',
            permiso,
        };
    }

    // =========================================
    // DELEGACIÓN
    // =========================================

    @Post('delegacion')
    async crearDelegacion(@Body() dto: CrearDelegacionDto) {
        const delegacion = await this.accesoService.crearDelegacion(dto);
        return {
            mensaje: 'Delegación creada exitosamente',
            delegacion,
        };
    }

    @Get('delegacion/delegado/:carnetDelegado')
    async listarDelegacionesPorDelegado(@Param('carnetDelegado') carnetDelegado: string) {
        return this.accesoService.listarDelegacionesPorDelegado(carnetDelegado);
    }

    @Get('delegacion/delegante/:carnetDelegante')
    async listarDelegacionesPorDelegante(@Param('carnetDelegante') carnetDelegante: string) {
        return this.accesoService.listarDelegacionesPorDelegante(carnetDelegante);
    }

    @Get('delegacion')
    async listarTodasDelegaciones() {
        return this.accesoService.listarTodasDelegaciones();
    }

    @Delete('delegacion/:id')
    async desactivarDelegacion(@Param('id') id: string) {
        const delegacion = await this.accesoService.desactivarDelegacion(id);
        return {
            mensaje: 'Delegación desactivada',
            delegacion,
        };
    }

    // =========================================
    // EMPLEADOS (AHORA USUARIOS) Y ORGANIZACIÓN
    // =========================================

    @Get('empleado/:carnet')
    async buscarEmpleado(@Param('carnet') carnet: string) {
        const empleado = await this.accesoService.buscarEmpleadoPorCarnet(carnet);
        if (!empleado) {
            throw new NotFoundException(`Empleado (Usuario) no encontrado con carnet: ${carnet}`);
        }
        return empleado;
    }

    @Get('empleados')
    async listarEmpleados() {
        return this.accesoService.listarEmpleadosActivos();
    }

    @Get('empleados/buscar')
    async buscarEmpleados(@Query('q') q: string, @Query('limit') limit: string) {
        if (!q || q.length < 2) return [];
        return this.accesoService.buscarEmpleados(q, parseInt(limit) || 10);
    }

    @Get('empleado/email/:correo')
    async buscarEmpleadoPorCorreo(@Param('correo') correo: string) {
        const empleado = await this.accesoService.buscarEmpleadoPorCorreo(correo);
        if (!empleado) {
            return { encontrado: false, correo };
        }
        return {
            encontrado: true,
            empleado: empleado // Return full Usuario object
        };
    }

    @Get('organizacion/buscar')
    async buscarOrganizacion(@Query('q') termino: string) {
        if (!termino || termino.length < 2) return [];
        return this.accesoService.buscarNodosOrganizacion(termino);
    }

    @Get('organizacion/tree')
    async getNodosTree() {
        return this.accesoService.getNodosTree();
    }

    @Get('organizacion/nodo/:idOrg')
    async getNodo(@Param('idOrg') idOrg: string) {
        return this.accesoService.getNodo(idOrg);
    }

    @Get('organizacion/nodo/:idOrg/preview')
    async previewEmpleadosPorNodo(
        @Param('idOrg') idOrg: string,
        @Query('alcance') alcance: 'SUBARBOL' | 'SOLO_NODO' = 'SUBARBOL'
    ) {
        return this.accesoService.previewEmpleadosPorNodo(idOrg, alcance);
    }

    @Get('debug-raw-data')
    async debugRawData() {
        return this.accesoService.getDebugRawData();
    }
}
