import {
    Controller, Get, Post, Patch, Delete, Body, Query, Param, UseGuards, Request, ForbiddenException
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { RecurrenciaService } from './recurrencia.service';
import { TareaCrearRapidaDto, CheckinUpsertDto, FechaQueryDto, TareaActualizarDto, ProyectoCrearDto, ProyectoFilterDto, TareaRevalidarDto, BloqueoCrearDto, TaskFilterDto, TareaMasivaDto } from './dto/clarity.dtos';

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
        const carnet = req.user.carnet || await this.tasksService.resolveCarnet(req.user.userId);
        return this.tasksService.miDiaGet(carnet, query.fecha, query.startDate, query.endDate);
    }

    @Post('checkins')
    @ApiOperation({ summary: 'Registrar o actualizar check-in diario' })
    async upsertCheckin(@Body() dto: CheckinUpsertDto, @Request() req) {
        const carnet = req.user.carnet || await this.tasksService.resolveCarnet(req.user.userId);
        return this.tasksService.checkinUpsert(dto, carnet);
    }

    @Post('tareas/rapida')
    @ApiOperation({ summary: 'Crear tarea rápida' })
    async crearTareaRapida(@Body() dto: TareaCrearRapidaDto, @Request() req) {
        // Asegurar manejo robusto del ID de usuario (permitir coerción si viene como string)
        const targetUserId = dto.idUsuario ? Number(dto.idUsuario) : req.user.userId;

        if (targetUserId && targetUserId !== req.user.userId) {
            const canManage = await this.tasksService.canManageUser(req.user.userId, targetUserId, req.user.rolGlobal);
            if (!canManage) throw new ForbiddenException('No puedes crear tareas para este usuario.');
            dto.idUsuario = targetUserId; // Asegurar asignación explícita
        } else {
            dto.idUsuario = req.user.userId;
        }
        return this.tasksService.tareaCrearRapida(dto);
    }

    @Post('tareas/masiva')
    @ApiOperation({ summary: 'Crear tarea masiva (asignar a múltiples)' })
    async crearTareaMasiva(@Body() dto: TareaMasivaDto, @Request() req) {
        return this.tasksService.crearTareaMasiva(dto, req.user.userId);
    }

    @Get('tareas/mias')
    @ApiOperation({ summary: 'Listar mis tareas' })
    async getMisTareas(@Request() req, @Query() filters: TaskFilterDto) {
        const carnet = req.user.carnet || await this.tasksService.resolveCarnet(req.user.userId);
        return this.tasksService.tareasMisTareas(carnet, filters.estado, filters.idProyecto, filters.startDate, filters.endDate);
    }

    @Get('tareas/:id')
    @ApiOperation({ summary: 'Obtener detalle de tarea (con subtasks)' })
    async getTarea(@Param('id') id: number, @Request() req) {
        return this.tasksService.tareaObtener(id, req.user.userId);
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

    @Get('agenda/:targetCarnet')
    @ApiOperation({ summary: 'MANAGER: Obtener agenda de un tercero' })
    async getMemberAgenda(@Param('targetCarnet') targetCarnet: string, @Query() query: FechaQueryDto, @Request() req) {
        const requesterCarnet = req.user.carnet || await this.tasksService.resolveCarnet(req.user.userId);

        if (requesterCarnet !== targetCarnet) {
            const hasAccess = await this.tasksService.canManageUserByCarnet(requesterCarnet, targetCarnet);
            if (!hasAccess) {
                throw new ForbiddenException('No tienes permisos para ver la agenda de este usuario.');
            }
        }
        return this.tasksService.miDiaGet(targetCarnet, query.fecha, query.startDate, query.endDate);
    }


    @Get('tareas/historico/:carnet')
    @ApiOperation({ summary: 'Obtener historial de tareas por carnet' })
    async getTareasHistorico(@Param('carnet') carnet: string, @Query('dias') dias: number = 30) {
        return this.tasksService.tareasHistorico(carnet, dias);
    }

    @Delete('tareas/:id')
    @ApiOperation({ summary: 'Eliminar tarea (Físico si es hoy y creador, sino Soft Delete)' })
    async eliminarTarea(@Param('id') id: number, @Request() req) {
        const carnet = req.user.carnet || await this.tasksService.resolveCarnet(req.user.userId);
        return this.tasksService.tareaEliminar(id, carnet);
    }

    @Post('tareas/:id/descartar')
    @ApiOperation({ summary: 'Descartar tarea (Alias para eliminar)' })
    async descartarTarea(@Param('id') id: number, @Body() body: { motivo?: string }, @Request() req) {
        const motivo = body?.motivo || 'Descarte manual';
        const carnet = req.user.carnet || await this.tasksService.resolveCarnet(req.user.userId);
        return this.tasksService.tareaEliminar(id, carnet, motivo);
    }

    @Post('tareas/:id/avance')
    @ApiOperation({ summary: 'Registrar avance en una tarea' })
    async registrarAvance(@Param('id') id: number, @Body() body: { progreso: number; comentario?: string }, @Request() req) {
        return this.tasksService.registrarAvance(id, body.progreso, body.comentario, req.user.userId);
    }

    @Delete('tareas/avance/:id')
    @ApiOperation({ summary: 'Eliminar comentario (avance)' })
    async eliminarAvance(@Param('id') id: number, @Request() req) {
        return this.tasksService.eliminarAvance(id, req.user.userId);
    }

    @Get('planning/workload')
    @ApiOperation({ summary: 'Obtener carga de trabajo del equipo' })
    async getWorkload(@Request() req) {
        const carnet = req.user.carnet || await this.tasksService.resolveCarnet(req.user.userId);
        return this.tasksService.getWorkload(carnet);
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

    @Post('proyectos/:id/clonar')
    @ApiOperation({ summary: 'Clonar proyecto y sus tareas (sin asignar)' })
    async clonarProyecto(@Param('id') id: number, @Body() body: { nombre: string }, @Request() req) {
        return this.tasksService.proyectoClonar(id, body.nombre, req.user.userId);
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

    // @Get('equipo/hoy') -> MOVIDO A OTRO LADO O YA EXISTE ARRIBA PARA EVITAR DUPLICADO
    // @ApiOperation({ summary: 'Dashboard equipo: hoy' })
    // async getEquipoHoy(@Request() req, @Query() query: FechaQueryDto) {
    //    return this.tasksService.getEquipoHoy(req.user.userId, query.fecha);
    // }

    @Get('equipo/inform')
    @ApiOperation({ summary: 'Dashboard equipo: informe detallado independiente' })
    async getEquipoInform(@Request() req, @Query() query: FechaQueryDto) {
        const carnet = req.user.carnet || await this.tasksService.resolveCarnet(req.user.userId);
        return this.tasksService.getEquipoInform(carnet, query.fecha);
    }

    @Get('equipo/backlog')
    @ApiOperation({ summary: 'Dashboard equipo: backlog' })
    async getEquipoBacklog(@Request() req, @Query() query: FechaQueryDto) {
        return this.tasksService.getEquipoBacklog(req.user.userId);
    }



    @Get('agenda-recurrente')
    @ApiOperation({ summary: 'Obtener tareas recurrentes para una fecha' })
    async obtenerAgendaRecurrente(@Query('fecha') fecha: string, @Request() req) {
        const carnet = req.user.carnet || await this.tasksService.resolveCarnet(req.user.userId);
        return this.recurrenciaService.obtenerAgendaRecurrente(
            fecha ? new Date(fecha) : new Date(),
            carnet
        );
    }

    // ==========================================
    // BLOQUEOS (Faltantes)
    // ==========================================

    @Post('bloqueos')
    @ApiOperation({ summary: 'Registrar un bloqueo' })
    async crearBloqueo(@Body() dto: BloqueoCrearDto, @Request() req) {
        // Asegurar que idOrigenUsuario tenga valor
        if (!dto.idOrigenUsuario) dto.idOrigenUsuario = req.user.userId;
        return this.tasksService.bloqueoCrear(dto);
    }

    @Patch('bloqueos/:id/resolver')
    @ApiOperation({ summary: 'Resolver un bloqueo' })
    async resolverBloqueo(@Param('id') id: number, @Body() body: any, @Request() req) {
        return this.tasksService.bloqueoResolver(id, body, req.user.userId);
    }

    // ==========================================
    // NOTAS
    // ==========================================

    @Get('notas')
    async getNotas(@Request() req) {
        const carnet = req.user.carnet || await this.tasksService.resolveCarnet(req.user.userId);
        return this.tasksService.notasListar(carnet);
    }

    @Post('notas')
    async crearNota(@Body() body: { title: string, content: string }, @Request() req) {
        const carnet = req.user.carnet || await this.tasksService.resolveCarnet(req.user.userId);
        return this.tasksService.notaCrear(carnet, body.title, body.content);
    }

    @Patch('notas/:id')
    async updateNota(@Param('id') id: number, @Body() body: { title: string, content: string }, @Request() req) {
        return this.tasksService.notaActualizar(id, body.title, body.content);
    }

    @Delete('notas/:id')
    async deleteNota(@Param('id') id: number, @Request() req) {
        return this.tasksService.notaEliminar(id);
    }
}


