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

    @Post('resolve')
    async resolveRequest(@Request() req: any, @Body() body: { idSolicitud: number, accion: 'Aprobar' | 'Rechazar' }) {
        return await this.planningService.resolverSolicitud(
            req.user.userId,
            body.idSolicitud,
            body.accion
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
}
