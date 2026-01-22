import { Module } from '@nestjs/common';
import { ClarityController } from './clarity.controller';
import { OrganizacionController } from './organizacion.controller';
import { KpisController, EquipoController, AsignacionesController, AvanceMensualController } from './kpis.controller';
import { TasksService } from './tasks.service';
import { RecurrenciaService } from './recurrencia.service';
import { PlanningModule } from '../planning/planning.module';
import { AccesoModule } from '../acceso/acceso.module';

// NOTA: ClarityService, ReportsService, FocoService, SeedService
// han sido removidos o migrados a SQL directo

@Module({
    imports: [
        PlanningModule,
        AccesoModule
    ],
    controllers: [ClarityController, OrganizacionController, KpisController, EquipoController, AsignacionesController, AvanceMensualController],
    providers: [TasksService, RecurrenciaService],
    exports: [TasksService, RecurrenciaService]
})
export class ClarityModule { }

