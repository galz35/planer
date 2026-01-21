import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminSecurityController } from './admin-security.controller';
import { AdminSecurityService } from './admin-security.service';
import { Usuario } from '../auth/entities/usuario.entity';
import { UsuarioConfig } from '../auth/entities/usuario-config.entity';
import { SeguridadPerfil } from '../auth/entities/seguridad-perfil.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Usuario, UsuarioConfig, SeguridadPerfil])
    ],
    controllers: [AdminSecurityController],
    providers: [AdminSecurityService],
    exports: [AdminSecurityService]
})
export class AdminModule { }
