import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanningController } from './planning.controller';
import { PlanningService } from './planning.service';
import { Tarea } from './entities/tarea.entity';
import { Proyecto } from './entities/proyecto.entity';
import { SolicitudCambio } from './entities/solicitud-cambio.entity';
import { PlanTrabajo } from './entities/plan-trabajo.entity';
import { TareaAsignado } from './entities/tarea-asignado.entity';
import { AuditLog } from '../common/entities/audit-log.entity';
import { Usuario } from '../auth/entities/usuario.entity';
import { OrganizacionNodo } from '../auth/entities/organizacion-nodo.entity';
import { UsuarioOrganizacion } from '../auth/entities/usuario-organizacion.entity';
import { TareaAsignacionLog } from './entities/tarea-asignacion-log.entity';
import { AsignacionService } from './services/asignacion.service';
import { AsignacionController } from './controllers/asignacion.controller';
import { AnalyticsService } from './analytics.service';
import { AccesoModule } from '../acceso/acceso.module';

import { Bloqueo } from '../clarity/entities/bloqueo.entity';

@Module({
    imports: [
        AccesoModule,
        TypeOrmModule.forFeature([
            Tarea,
            TareaAsignado,
            Proyecto,
            SolicitudCambio,
            AuditLog,
            Usuario,
            OrganizacionNodo,
            TareaAsignacionLog,
            PlanTrabajo,
            UsuarioOrganizacion,
            Bloqueo,
        ])
    ],
    controllers: [PlanningController, AsignacionController],
    providers: [PlanningService, AsignacionService, AnalyticsService],
    exports: [PlanningService, AsignacionService, AnalyticsService]
})
export class PlanningModule { }
