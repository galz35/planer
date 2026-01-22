import {
    Controller, Get, Post, Patch, Delete, Body, Query, Param, UseGuards, Request, ForbiddenException
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { RecurrenciaService } from './recurrencia.service';
import { TareaCrearRapidaDto, CheckinUpsertDto, FechaQueryDto, TareaActualizarDto, ProyectoCrearDto, ProyectoFilterDto, TareaRevalidarDto } from './dto/clarity.dtos';

@ApiTags('Clarity Core (Migrated)')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller()
export class ClarityController {
    constructor(
        private readonly tasksService: TasksService,
        private readonly recurrenciaService: RecurrenciaService
    ) { }

    @Get('mi-dia')
    @ApiOperation({ summary: 'Obtener snapshot del día para el empleado' })
    async getMiDia(@Request() req, @Query() query: FechaQueryDto) {
        return this.tasksService.miDiaGet(req.user.userId, query.fecha);
    }

    @Post('checkins')
    @ApiOperation({ summary: 'Registrar o actualizar check-in diario' })
    async upsertCheckin(@Body() dto: CheckinUpsertDto, @Request() req) {
        // Si se intenta crear para otro usuario, verificar permisos
        if (dto.idUsuario && Number(dto.idUsuario) !== req.user.userId) {
            const canManage = await this.tasksService.canManageUser(req.user.userId, Number(dto.idUsuario), req.user.rolGlobal);
            if (!canManage) {
                throw new ForbiddenException('No tienes permisos para modificar el checkin de este usuario.');
            }
        } else {
            dto.idUsuario = req.user.userId;
        }
        return this.tasksService.checkinUpsert(dto);
    }

    @Post('tareas/rapida')
    @ApiOperation({ summary: 'Crear tarea rápida' })
    async crearTareaRapida(@Body() dto: TareaCrearRapidaDto, @Request() req) {
        if (dto.idUsuario && Number(dto.idUsuario) !== req.user.userId) {
            const canManage = await this.tasksService.canManageUser(req.user.userId, Number(dto.idUsuario), req.user.rolGlobal);
            if (!canManage) throw new ForbiddenException('No puedes crear tareas para este usuario.');
        } else {
            dto.idUsuario = req.user.userId;
        }
        return this.tasksService.tareaCrearRapida(dto);
    }

    @Get('tareas/mias')
    @ApiOperation({ summary: 'Listar mis tareas' })
    async getMisTareas(@Request() req, @Query('estado') estado?: string, @Query('idProyecto') idProyecto?: number) {
        return this.tasksService.tareasMisTareas(req.user.userId, estado, idProyecto);
    }

    @Patch('tareas/:id')
    @ApiOperation({ summary: 'Actualizar tarea' })
    async actualizarTarea(@Param('id') id: number, @Body() body: TareaActualizarDto, @Request() req) {
        return this.tasksService.tareaActualizar(id, body, req.user.userId);
    }

    @Post('tareas/:id/revalidar')
    @ApiOperation({ summary: 'Revalidar o reasignar tarea' })
    async revalidarTarea(@Param('id') id: number, @Body() body: TareaRevalidarDto, @Request() req) {
        return this.tasksService.tareaRevalidar(id, body, req.user.userId);
    }

    @Get('agenda/:targetUserId')
    @ApiOperation({ summary: 'MANAGER: Obtener agenda de un tercero' })
    async getMemberAgenda(@Param('targetUserId') targetUserId: string, @Query() query: FechaQueryDto, @Request() req) {
        const requesterId = req.user.userId;
        const targetId = Number(targetUserId);

        if (requesterId !== targetId) {
            const hasAccess = await this.tasksService.canManageUser(requesterId, targetId);
            if (!hasAccess) {
                throw new ForbiddenException('No tienes permisos para ver la agenda de este usuario.');
            }
        }
        return this.tasksService.miDiaGet(targetId, query.fecha);
    }

    @Get('equipo/miembro/:idMiembro/tareas')
    @ApiOperation({ summary: 'MANAGER: Ver detalles de miembro de equipo' })
    async getEquipoMemberTareas(@Param('idMiembro') idMiembro: number, @Request() req) {
        const idLider = req.user.userId;
        const res = await this.tasksService.equipoMiembro(idLider, idMiembro);
        return res.tareas; // El frontend espera solo el arreglo de tareas en este endpoint
    }

    @Get('equipo/miembro/:idMiembro')
    @ApiOperation({ summary: 'MANAGER: Ver detalles de miembro de equipo' })
    async getEquipoMember(@Param('idMiembro') idMiembro: number, @Request() req) {
        const idLider = req.user.userId;
        return this.tasksService.equipoMiembro(idLider, idMiembro);
    }

    @Get('tareas/historico/:carnet')
    @ApiOperation({ summary: 'Obtener historial de tareas por carnet' })
    async getTareasHistorico(@Param('carnet') carnet: string, @Query('dias') dias: number = 30) {
        return this.tasksService.tareasHistorico(carnet, dias);
    }

    @Post('tareas/:id/avance')
    @ApiOperation({ summary: 'Registrar avance en una tarea' })
    async registrarAvance(@Param('id') id: number, @Body() body: { progreso: number; comentario?: string }, @Request() req) {
        return this.tasksService.registrarAvance(id, body.progreso, body.comentario, req.user.userId);
    }

    @Get('planning/workload')
    @ApiOperation({ summary: 'Obtener carga de trabajo del equipo' })
    async getWorkload(@Request() req) {
        return this.tasksService.getWorkload(req.user.userId);
    }

    @Get('audit-logs/task/:idTarea')
    @ApiOperation({ summary: 'Obtener logs de auditoría de una tarea' })
    async getAuditLogsByTask(@Param('idTarea') idTarea: number) {
        return this.tasksService.getAuditLogsByTask(idTarea);
    }

    @Post('tareas/solicitud-cambio')
    @ApiOperation({ summary: 'Solicitar cambio en una tarea estratégica' })
    async solicitarCambio(@Body() body: { idTarea: number; campo: string; valorNuevo: string; motivo: string }, @Request() req) {
        return this.tasksService.crearSolicitudCambio(req.user.userId, body.idTarea, body.campo, body.valorNuevo, body.motivo);
    }

    // ==========================================
    // PROYECTOS (Restaurado)
    // ==========================================

    @Get('proyectos')
    @ApiOperation({ summary: 'Listar proyectos' })
    async listarProyectos(@Request() req, @Query() filter: ProyectoFilterDto) {
        return this.tasksService.proyectoListar(req.user.userId, filter);
    }

    @Post('proyectos')
    @ApiOperation({ summary: 'Crear proyecto' })
    async crearProyecto(@Body() dto: ProyectoCrearDto, @Request() req) {
        return this.tasksService.proyectoCrear(dto, req.user.userId);
    }

    @Get('proyectos/:id')
    async getProyecto(@Param('id') id: number) {
        return this.tasksService.proyectoObtener(id);
    }

    @Patch('proyectos/:id')
    async actualizarProyecto(@Param('id') id: number, @Body() dto: Partial<ProyectoCrearDto>, @Request() req) {
        return this.tasksService.proyectoActualizar(id, dto, req.user.userId);
    }

    @Delete('proyectos/:id')
    async eliminarProyecto(@Param('id') id: number, @Request() req) {
        return this.tasksService.proyectoEliminar(id, req.user.userId);
    }

    @Get('proyectos/:id/tareas')
    @ApiOperation({ summary: 'Obtener todas las tareas de un proyecto' })
    async getProyectosTareas(@Param('id') id: number, @Request() req) {
        return this.tasksService.tareasDeProyecto(id, req.user.userId);
    }

    // ==========================================
    // RECURRENCIA (Agenda Diaria / Mi Día)
    // ==========================================

    @Post('tareas/:id/recurrencia')
    @ApiOperation({ summary: 'Crear recurrencia para una tarea' })
    async crearRecurrencia(
        @Param('id') idTarea: number,
        @Body() body: {
            tipoRecurrencia: 'SEMANAL' | 'MENSUAL';
            diasSemana?: string;
            diaMes?: number;
            fechaInicioVigencia: string;
            fechaFinVigencia?: string;
        },
        @Request() req
    ) {
        return this.recurrenciaService.crearTareaRecurrente(
            idTarea,
            {
                tipoRecurrencia: body.tipoRecurrencia,
                diasSemana: body.diasSemana,
                diaMes: body.diaMes,
                fechaInicioVigencia: new Date(body.fechaInicioVigencia),
                fechaFinVigencia: body.fechaFinVigencia ? new Date(body.fechaFinVigencia) : undefined
            },
            req.user.userId
        );
    }

    @Get('tareas/:id/recurrencia')
    @ApiOperation({ summary: 'Obtener configuración de recurrencia' })
    async obtenerRecurrencia(@Param('id') idTarea: number) {
        return this.recurrenciaService.obtenerRecurrencia(idTarea);
    }

    @Post('tareas/:id/instancia')
    @ApiOperation({ summary: 'Marcar instancia (hecha/omitida/reprogramada)' })
    async marcarInstancia(
        @Param('id') idTarea: number,
        @Body() body: {
            fechaProgramada: string;
            estadoInstancia: 'HECHA' | 'OMITIDA' | 'REPROGRAMADA';
            comentario?: string;
            fechaReprogramada?: string;
        },
        @Request() req
    ) {
        return this.recurrenciaService.marcarInstancia(
            idTarea,
            new Date(body.fechaProgramada),
            body.estadoInstancia,
            body.comentario,
            req.user.userId,
            body.fechaReprogramada ? new Date(body.fechaReprogramada) : undefined
        );
    }

    @Get('tareas/:id/instancias')
    @ApiOperation({ summary: 'Obtener bitácora de instancias' })
    async obtenerInstancias(@Param('id') idTarea: number, @Query('limit') limit: number = 30) {
        return this.recurrenciaService.obtenerInstancias(idTarea, limit);
    }

    @Get('equipo/bloqueos')
    @ApiOperation({ summary: 'Obtener bloqueos del equipo' })
    async getEquipoBloqueos(@Request() req, @Query('fecha') fecha: string) {
        return this.tasksService.getEquipoBloqueos(req.user.userId, fecha);
    }

    @Get('agenda-recurrente')
    @ApiOperation({ summary: 'Obtener tareas recurrentes para una fecha' })
    async obtenerAgendaRecurrente(@Query('fecha') fecha: string, @Request() req) {
        return this.recurrenciaService.obtenerAgendaRecurrente(
            fecha ? new Date(fecha) : new Date(),
            req.user.userId
        );
    }
}


