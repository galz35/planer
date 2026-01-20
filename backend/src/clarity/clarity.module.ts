import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClarityController } from './clarity.controller';
import { ClarityService } from './clarity.service';
import { ReportsService } from './reports.service';
import { TasksService } from './tasks.service';
import { FocoService } from './foco.service';
import { Usuario, Tarea, TareaAsignado, Checkin, CheckinTarea, Bloqueo, OrganizacionNodo, Proyecto, UsuarioOrganizacion, UsuarioConfig, Nota, LogSistema, Rol, UsuarioCredenciales, AuditLog, FocoDiario, TareaAvance } from '../entities';

import { SeedController } from './seed.controller';

import { SeedService } from './seed.service';
import { PlanningModule } from '../planning/planning.module';
import { AccesoModule } from '../acceso/acceso.module';

import { SolicitudCambio } from '../planning/entities/solicitud-cambio.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Usuario, Tarea, TareaAsignado, Checkin, CheckinTarea, Bloqueo,
            OrganizacionNodo, Proyecto, UsuarioOrganizacion, UsuarioConfig, Nota, LogSistema, Rol, UsuarioCredenciales, AuditLog, FocoDiario, TareaAvance,
            SolicitudCambio
        ]),
        PlanningModule,
        AccesoModule
    ],
    controllers: [ClarityController, SeedController],
    providers: [ClarityService, ReportsService, TasksService, SeedService, FocoService],
    exports: [ClarityService, ReportsService, TasksService, SeedService, FocoService]
})
export class ClarityModule { }
