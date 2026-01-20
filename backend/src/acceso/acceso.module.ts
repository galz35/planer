import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entidades
import {
    OrganizacionNodoRh,
    PermisoArea,
    PermisoEmpleado,
    DelegacionVisibilidad,
} from './entities';

// Services
import { AccesoService } from './acceso.service';
import { VisibilidadService } from './visibilidad.service';

// Controllers
import { AccesoController } from './acceso.controller';
import { VisibilidadController } from './visibilidad.controller';

// Guards
import { VisibilidadGuard } from './visibilidad.guard';

// External Entities (Unified)
import { Usuario } from '../auth/entities/usuario.entity';
import { UsuarioCredenciales } from '../auth/entities/usuario-credenciales.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            // Empleado removed
            OrganizacionNodoRh,
            PermisoArea,
            PermisoEmpleado,
            DelegacionVisibilidad,
            Usuario,
            UsuarioCredenciales,
        ]),
    ],
    controllers: [
        AccesoController,
        VisibilidadController,
        // ImportController removed (Legacy p_empleados)
    ],
    providers: [
        AccesoService,
        VisibilidadService,
        // ImportService removed (Legacy p_empleados)
        VisibilidadGuard,
    ],
    exports: [
        AccesoService,
        VisibilidadService,
        VisibilidadGuard,
        TypeOrmModule,
    ],
})
export class AccesoModule { }
