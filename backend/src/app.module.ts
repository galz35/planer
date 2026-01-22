import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ClarityModule } from './clarity/clarity.module';
import { AdminModule } from './admin/admin.module';
import { PlanningModule } from './planning/planning.module';
import { AccesoModule } from './acceso/acceso.module';
import { AuditModule } from './common/audit.module';
import { DbModule } from './db/db.module';
import { DiagnosticoModule } from './diagnostico/diagnostico.module';
import { SoftwareModule } from './software/software.module';

// TypeORM y Entidades han sido totalmente eliminadas de AppModule
// Ahora toda la aplicación usa DbModule (SQL Server directo)

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DbModule, // Pool SQL Server directo

    // Rate Limiting - Protección contra abuso
    ThrottlerModule.forRoot([{
      name: 'short',
      ttl: 1000,    // 1 segundo
      limit: 10,    // 10 requests por segundo
    }, {
      name: 'medium',
      ttl: 10000,   // 10 segundos
      limit: 50,    // 50 requests por 10 segundos
    }, {
      name: 'long',
      ttl: 60000,   // 1 minuto
      limit: 100,   // 100 requests por minuto
    }]),

    // Módulos de la aplicación (Migrados a SQL Directo)
    AuthModule,
    ClarityModule,
    AdminModule,
    PlanningModule,
    AccesoModule,
    // Módulo de Auditoría Global
    AuditModule,
    // Módulo de Diagnóstico (SQL Server directo)
    DiagnosticoModule,
    SoftwareModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Aplicar Rate Limiting globalmente
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
