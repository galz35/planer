import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditService } from './audit.service';
import { AuditLog } from './entities/audit-log.entity';
import { LogSistema } from './entities/log-sistema.entity';

import { AuditSubscriber } from './audit.subscriber';

/**
 * Módulo global de auditoría
 * Se puede inyectar en cualquier servicio sin importar explícitamente
 */
@Global()
@Module({
    imports: [
        TypeOrmModule.forFeature([AuditLog, LogSistema]),
    ],
    providers: [AuditService, AuditSubscriber],
    exports: [AuditService],
})
export class AuditModule { }
