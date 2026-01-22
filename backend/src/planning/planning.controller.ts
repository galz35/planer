import { Controller, Post, Body, Get, UseGuards, Request, Query, Param, Delete } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { PlanningService } from './planning.service';
import { AuthGuard } from '@nestjs/passport';

import { AnalyticsService } from './analytics.service';

@Controller('planning')
@UseGuards(AuthGuard('jwt'))
export class PlanningController {
    constructor(
        private planningService: PlanningService,
        private analyticsService: AnalyticsService
    ) { }

    @Post('check-permission')
    async checkPermission(@Request() req: any, @Body() body: { idTarea: number }) {
        return await this.planningService.checkEditPermission(body.idTarea, req.user.userId);
    }

    @Post('request-change')
    async requestChange(@Request() req: any, @Body() body: { idTarea: number, campo: string, valorNuevo: string, motivo: string }) {
        return await this.planningService.solicitarCambio(
            req.user.userId,
            body.idTarea,
            body.campo,
            body.valorNuevo,
            body.motivo
        );
    }

    @Get('pending')
    async getPendingRequests(@Request() req: any) {
        return await this.planningService.getSolicitudesPendientes(req.user.userId);
    }

    @Get('approvals')
    @ApiOperation({ summary: 'Alias para pending requests (usado por frontend)' })
    async getApprovals(@Request() req: any) {
        return await this.planningService.getSolicitudesPendientes(req.user.userId);
    }

    @Post('resolve')
    async resolveRequest(@Request() req: any, @Body() body: { idSolicitud: number, accion: 'Aprobar' | 'Rechazar' }) {
        return await this.planningService.resolverSolicitud(
            req.user.userId,
            body.idSolicitud,
            body.accion
        );
    }

    @Post('approvals/:idSolicitud/resolve')
    @ApiOperation({ summary: 'Resolver solicitud de cambio (ruta usada por frontend)' })
    async resolveApproval(
        @Request() req: any,
        @Param('idSolicitud') idSolicitud: number,
        @Body() body: { accion: 'Aprobar' | 'Rechazar', comentario?: string }
    ) {
        return await this.planningService.resolverSolicitud(
            req.user.userId,
            Number(idSolicitud),
            body.accion,
            body.comentario
        );
    }

    @Post('update-operative')
    async updateOperative(@Request() req: any, @Body() body: { idTarea: number, updates: any }) {
        return await this.planningService.updateTareaOperativa(
            req.user.userId,
            body.idTarea,
            body.updates
        );
    }
    @Get('plans')
    async getPlans(@Request() req: any, @Query('idUsuario') idUsuario: number, @Query('mes') mes: number, @Query('anio') anio: number) {
        return await this.planningService.getPlans(
            req.user.userId,
            idUsuario || req.user.userId, // Default to self if not provided
            Number(mes),
            Number(anio)
        );
    }

    @Post('plans')
    async upsertPlan(@Request() req: any, @Body() body: any) {
        return await this.planningService.upsertPlan(req.user.userId, body);
    }

    @Get('stats')
    async getStats(@Request() req: any, @Query('mes') mes: number, @Query('anio') anio: number) {
        return await this.analyticsService.getDashboardStats(
            req.user.userId,
            Number(mes),
            Number(anio)
        );
    }

    @Get('team')
    async getMyTeam(@Request() req: any) {
        return await this.planningService.getMyTeam(req.user.userId);
    }

    @Get('my-projects')
    @ApiOperation({ summary: 'Obtiene proyectos visibles según jerarquía del usuario' })
    async getMyProjects(@Request() req: any) {
        return await this.planningService.getMyProjects(req.user.userId);
    }

    @Post('tasks/:id/clone')
    async cloneTask(@Param('id') id: number, @Request() req: any) {
        return await this.planningService.cloneTask(req.user.userId, id);
    }

    @Post('reassign')
    async reassignTasks(@Body() body: any, @Request() req: any) {
        const { fromUserId, toUserId, taskIds } = body;
        return await this.planningService.reassignTasks(req.user.userId, fromUserId, toUserId, taskIds);
    }

    @Get('tasks/:id/history')
    async getTaskHistory(@Param('id') id: number) {
        return await this.planningService.getTaskHistory(id);
    }

    @Post('plans/:id/close')
    async closePlan(@Param('id') id: number, @Request() req: any) {
        return await this.planningService.closePlan(req.user.userId, id);
    }

    // ==========================================
    // AVANCE MENSUAL (Solo Plan de Trabajo)
    // ==========================================

    @Post('tasks/:id/avance-mensual')
    @ApiOperation({ summary: 'Registrar avance mensual de tarea larga' })
    async registrarAvanceMensual(
        @Param('id') id: number,
        @Body() body: { anio: number; mes: number; porcentajeMes: number; comentario?: string },
        @Request() req: any
    ) {
        return await this.planningService.registrarAvanceMensual(
            id,
            body.anio,
            body.mes,
            body.porcentajeMes,
            body.comentario || null,
            req.user.userId
        );
    }

    @Get('tasks/:id/avance-mensual')
    @ApiOperation({ summary: 'Obtener historial de avance mensual' })
    async obtenerHistorialMensual(@Param('id') id: number) {
        return await this.planningService.obtenerHistorialMensual(id);
    }

    // ==========================================
    // GRUPOS / FASES (Solo Plan de Trabajo)
    // ==========================================

    @Post('tasks/:id/crear-grupo')
    @ApiOperation({ summary: 'Convertir tarea en grupo/contenedor de fases' })
    async crearGrupo(@Param('id') id: number, @Request() req: any) {
        return await this.planningService.crearGrupo(id, req.user.userId);
    }

    @Post('tasks/:id/agregar-fase')
    @ApiOperation({ summary: 'Agregar tarea como fase de un grupo' })
    async agregarFase(
        @Param('id') idGrupo: number,
        @Body() body: { idTareaNueva: number },
        @Request() req: any
    ) {
        return await this.planningService.agregarFase(idGrupo, body.idTareaNueva, req.user.userId);
    }

    @Get('grupos/:idGrupo')
    @ApiOperation({ summary: 'Obtener todas las fases de un grupo' })
    async obtenerGrupo(@Param('idGrupo') idGrupo: number) {
        return await this.planningService.obtenerGrupo(idGrupo);
    }
}

