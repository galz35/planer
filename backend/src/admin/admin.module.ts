import { Module } from '@nestjs/common';
import { AdminSecurityController } from './admin-security.controller';
import { AdminSecurityService } from './admin-security.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AccesoModule } from '../acceso/acceso.module';

@Module({
    imports: [AccesoModule],
    controllers: [AdminSecurityController, AdminController],
    providers: [AdminSecurityService, AdminService],
    exports: [AdminSecurityService, AdminService]
})
export class AdminModule { }
