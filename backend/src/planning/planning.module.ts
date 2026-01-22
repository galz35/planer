import { Module } from '@nestjs/common';
import { PlanningController } from './planning.controller';
import { PlanningService } from './planning.service';
import { AnalyticsService } from './analytics.service';
import { AccesoModule } from '../acceso/acceso.module';

// NOTA: AsignacionService/Controller removidos temporalmente (usan TypeORM)
// TODO: Migrar a SQL directo

@Module({
    imports: [AccesoModule],
    controllers: [PlanningController],
    providers: [PlanningService, AnalyticsService],
    exports: [PlanningService, AnalyticsService]
})
export class PlanningModule { }
