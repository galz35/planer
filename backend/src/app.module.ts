import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import {
  Usuario, Rol, UsuarioCredenciales, OrganizacionNodo, UsuarioOrganizacion,
  Proyecto, Tarea, TareaAsignado, TareaAsignacionLog, Checkin, CheckinTarea, Bloqueo, TareaAvance, UsuarioConfig, Nota, LogSistema, AuditLog, SolicitudCambio, FocoDiario, PlanTrabajo,
  // Módulo Acceso (Permisos/Visibilidad)
  // Empleado, // Removed
  OrganizacionNodoRh, PermisoArea, PermisoEmpleado, DelegacionVisibilidad
} from './entities';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

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

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const dbType = config.get('DB_TYPE') || 'postgres';

        // Entidades comunes para ambas bases de datos
        const entities = [
          // Auth
          Usuario, Rol, UsuarioCredenciales, OrganizacionNodo, UsuarioOrganizacion, UsuarioConfig,
          // Planning
          Proyecto, Tarea, TareaAsignado, TareaAsignacionLog, TareaAvance, SolicitudCambio, PlanTrabajo,
          // Clarity
          Checkin, CheckinTarea, Bloqueo, Nota, FocoDiario,
          // Common
          LogSistema, AuditLog,
          // Acceso (Permisos/Visibilidad)
          // Empleado, // Removed
          OrganizacionNodoRh, PermisoArea, PermisoEmpleado, DelegacionVisibilidad,
        ];

        // Configuración para SQL Server (mssql)
        if (dbType === 'mssql') {
          console.log('🔷 Conectando a SQL Server...');
          return {
            type: 'mssql',
            host: config.get('MSSQL_HOST') || 'localhost',
            port: parseInt(config.get('MSSQL_PORT') || '1433'),
            username: config.get('MSSQL_USER'),
            password: config.get('MSSQL_PASSWORD'),
            database: config.get('MSSQL_DATABASE'),
            options: {
              encrypt: config.get('MSSQL_ENCRYPT') === 'true',
              trustServerCertificate: config.get('MSSQL_TRUST_CERT') === 'true',
            },
            entities,
            synchronize: true, // AUTO-CREATE TABLES
            dropSchema: false,
          };
        }

        // Configuración para PostgreSQL (Supabase u otro)
        console.log('🐘 Conectando a PostgreSQL (Supabase)...');
        return {
          type: 'postgres',
          host: config.get('DB_HOST'),
          port: parseInt(config.get('DB_PORT') || '5432'),
          username: config.get('DB_USER'),
          password: config.get('DB_PASSWORD'),
          database: config.get('DB_NAME'),
          ssl: config.get('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
          entities,
          synchronize: true, // AUTO-CREATE TABLES
          dropSchema: false,
        };
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([Usuario]),
    AuthModule,
    ClarityModule,
    AdminModule,
    PlanningModule,
    AccesoModule,
    // Módulo de Auditoría Global
    AuditModule,
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
