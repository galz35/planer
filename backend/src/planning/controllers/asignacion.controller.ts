import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    ParseIntPipe,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AsignacionService } from '../services/asignacion.service';
import {
    AsignarTareaDto,
    ReasignarTareaDto,
    ReasignarMasivoDto
} from '../dto/asignacion.dto';

@Controller('asignaciones')
@UseGuards(AuthGuard('jwt'))
export class AsignacionController {
    constructor(private readonly asignacionService: AsignacionService) { }

    // =========================================
    // ASIGNACIÓN DE TAREAS
    // =========================================

    /**
     * POST /api/asignaciones
     * Asigna una tarea a un usuario (o la deja sin asignar si idUsuarioAsignado es null)
     */
    @Post()
    async asignarTarea(
        @Body() dto: AsignarTareaDto,
        @Request() req: any,
    ) {
        const ipOrigen = req.ip || req.connection?.remoteAddress;
        return this.asignacionService.asignarTarea(
            dto,
            req.user.idUsuario,
            ipOrigen,
        );
    }

    /**
     * POST /api/asignaciones/reasignar
     * Reasigna una tarea a otro usuario
     */
    @Post('reasignar')
    async reasignarTarea(
        @Body() dto: ReasignarTareaDto,
        @Request() req: any,
    ) {
        const ipOrigen = req.ip || req.connection?.remoteAddress;
        return this.asignacionService.reasignarTarea(
            dto,
            req.user.idUsuario,
            ipOrigen,
        );
    }

    /**
     * POST /api/asignaciones/reasignar-masivo
     * Reasigna TODAS las tareas de un usuario a otro
     * Útil para offboarding o transferencias de área
     */
    @Post('reasignar-masivo')
    @HttpCode(HttpStatus.OK)
    async reasignarMasivo(
        @Body() dto: ReasignarMasivoDto,
        @Request() req: any,
    ) {
        const ipOrigen = req.ip || req.connection?.remoteAddress;
        return this.asignacionService.reasignarMasivo(
            dto,
            req.user.idUsuario,
            ipOrigen,
        );
    }

    // =========================================
    // CONSULTAS DE HISTORIAL
    // =========================================

    /**
     * GET /api/asignaciones/tarea/:idTarea/historial
     * Obtiene el historial completo de asignaciones de una tarea
     */
    @Get('tarea/:idTarea/historial')
    async getHistorialTarea(
        @Param('idTarea', ParseIntPipe) idTarea: number,
    ) {
        return this.asignacionService.getHistorialTarea(idTarea);
    }

    /**
     * GET /api/asignaciones/tarea/:idTarea/activa
     * Obtiene la asignación activa (actual) de una tarea
     */
    @Get('tarea/:idTarea/activa')
    async getAsignacionActiva(
        @Param('idTarea', ParseIntPipe) idTarea: number,
    ) {
        const asignacion = await this.asignacionService.getAsignacionActiva(idTarea);
        return asignacion || { mensaje: 'Tarea sin asignar', asignada: false };
    }

    /**
     * GET /api/asignaciones/usuario/:idUsuario/historial
     * Obtiene el historial laboral de un usuario (todas las tareas en las que ha trabajado)
     */
    @Get('usuario/:idUsuario/historial')
    async getHistorialUsuario(
        @Param('idUsuario', ParseIntPipe) idUsuario: number,
        @Query('soloActivas') soloActivas?: string,
        @Query('fechaDesde') fechaDesde?: string,
        @Query('fechaHasta') fechaHasta?: string,
    ) {
        return this.asignacionService.getHistorialUsuario(idUsuario, {
            soloActivas: soloActivas === 'true',
            fechaDesde: fechaDesde ? new Date(fechaDesde) : undefined,
            fechaHasta: fechaHasta ? new Date(fechaHasta) : undefined,
        });
    }

    /**
     * GET /api/asignaciones/usuario/:idUsuario/estadisticas
     * Obtiene estadísticas de asignaciones de un usuario
     */
    @Get('usuario/:idUsuario/estadisticas')
    async getEstadisticasUsuario(
        @Param('idUsuario', ParseIntPipe) idUsuario: number,
    ) {
        return this.asignacionService.getEstadisticasUsuario(idUsuario);
    }

    /**
     * GET /api/asignaciones/mi-historial
     * Obtiene el historial del usuario autenticado
     */
    @Get('mi-historial')
    async getMiHistorial(
        @Request() req: any,
        @Query('soloActivas') soloActivas?: string,
    ) {
        return this.asignacionService.getHistorialUsuario(req.user.idUsuario, {
            soloActivas: soloActivas === 'true',
        });
    }

    /**
     * GET /api/asignaciones/mis-estadisticas
     * Obtiene estadísticas del usuario autenticado
     */
    @Get('mis-estadisticas')
    async getMisEstadisticas(@Request() req: any) {
        return this.asignacionService.getEstadisticasUsuario(req.user.idUsuario);
    }

    // =========================================
    // TAREAS SIN ASIGNAR
    // =========================================

    /**
     * GET /api/asignaciones/sin-asignar
     * Obtiene todas las tareas que no tienen asignado activo
     */
    @Get('sin-asignar')
    async getTareasSinAsignar() {
        return this.asignacionService.getTareasSinAsignar();
    }
}
