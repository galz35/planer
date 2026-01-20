import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { Usuario, UsuarioCredenciales, UsuarioOrganizacion, OrganizacionNodo, Rol, UsuarioConfig } from '../entities';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Usuario,
            UsuarioCredenciales,
            UsuarioOrganizacion,
            OrganizacionNodo,
            Rol,
            UsuarioConfig
        ]),
    ],
    controllers: [AdminController, ImportController],
    providers: [AdminService, AdminGuard, ImportService],
    exports: [AdminService, ImportService],
})
export class AdminModule { }
