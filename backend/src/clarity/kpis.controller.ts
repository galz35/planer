import { Controller, Get, Post, Body, UseGuards, Request, Query, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import * as clarityRepo from './clarity.repo';
import * as avanceMensualRepo from '../planning/avance-mensual.repo';

@ApiTags('KPIs & Dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('kpis')
export class KpisController {
    constructor(private readonly tasksService: TasksService) { }

    @Get('dashboard')
    @ApiOperation({ summary: 'Obtener KPIs del dashboard ejecutivo' })
    async getKpisDashboard(@Request() req) {
        return this.tasksService.getDashboardKPIs(req.user.userId);
    }
}

@ApiTags('Equipo')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('equipo')
export class EquipoController {
    constructor(private readonly tasksService: TasksService) { }

    @Get('hoy')
    @ApiOperation({ summary: 'Obtener snapshot del equipo para el día de hoy' })
    async getEquipoHoy(@Request() req, @Query('fecha') fecha: string) {
        return this.tasksService.getEquipoHoy(req.user.userId, fecha);
    }
}

@ApiTags('Asignaciones')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('asignaciones')
export class AsignacionesController {

    @Post()
    @ApiOperation({ summary: 'Asignar un usuario a una tarea' })
    async asignarUsuario(@Body() body: { idTarea: number; idUsuarioAsignado: number }, @Request() req) {
        await clarityRepo.asignarUsuarioTarea(body.idTarea, body.idUsuarioAsignado, 'Responsable');
        return { success: true, message: 'Usuario asignado correctamente' };
    }
}

@ApiTags('Avance Mensual')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('tareas/:idTarea/avance-mensual')
export class AvanceMensualController {

    @Get()
    @ApiOperation({ summary: 'Obtener historial de avances mensuales de una tarea' })
    async getHistorial(@Param('idTarea') idTarea: number) {
        const historial = await avanceMensualRepo.obtenerHistorialMensual(idTarea);
        const acumulado = await avanceMensualRepo.obtenerAcumulado(idTarea);
        return {
            success: true,
            data: {
                historial,
                acumulado
            }
        };
    }

    @Post()
    @ApiOperation({ summary: 'Registrar avance mensual (upsert)' })
    async registrarAvance(
        @Param('idTarea') idTarea: number,
        @Body() body: { anio: number; mes: number; porcentajeMes: number; comentario?: string },
        @Request() req
    ) {
        console.log(`[API] registrarAvance idTarea=${idTarea}`, body);
        await avanceMensualRepo.upsertAvanceMensual(
            idTarea,
            body.anio,
            body.mes,
            body.porcentajeMes,
            body.comentario || null,
            req.user.userId
        );

        // Devolver el estado actualizado
        const historial = await avanceMensualRepo.obtenerHistorialMensual(idTarea);
        const acumulado = await avanceMensualRepo.obtenerAcumulado(idTarea);

        console.log(`[API] Nuevo acumulado idTarea=${idTarea}: ${acumulado}`);

        return {
            success: true,
            message: `Avance de ${body.porcentajeMes}% registrado para ${body.mes}/${body.anio}`,
            data: { historial, acumulado }
        };
    }
}

