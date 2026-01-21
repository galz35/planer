import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from '../auth/entities/usuario.entity';
import { UsuarioConfig } from '../auth/entities/usuario-config.entity';
import { SeguridadPerfil } from '../auth/entities/seguridad-perfil.entity';
import { UserAccessInfoDto } from './dto/admin-security.dto';

@Injectable()
export class AdminSecurityService {
    constructor(
        @InjectRepository(Usuario) private userRepo: Repository<Usuario>,
        @InjectRepository(UsuarioConfig) private configRepo: Repository<UsuarioConfig>,
        @InjectRepository(SeguridadPerfil) private perfilRepo: Repository<SeguridadPerfil>,
    ) { }

    async getUsersWithAccessInfo(): Promise<UserAccessInfoDto[]> {
        // Obtener todos los usuarios activos
        const users = await this.userRepo.find({
            where: { activo: true },
            relations: ['rol'],
            order: { nombre: 'ASC' }
        });

        // Obtener configs de usuarios (para customMenu)
        const configs = await this.configRepo.find();
        const configMap = new Map(configs.map(c => [c.idUsuario, c]));

        // Calcular subordinados para cada usuario
        const usersWithInfo: UserAccessInfoDto[] = await Promise.all(
            users.map(async (user) => {
                const subordinateCount = user.carnet
                    ? await this.userRepo.count({
                        where: { jefeCarnet: user.carnet, activo: true }
                    })
                    : 0;

                const config = configMap.get(user.idUsuario);
                const hasCustomMenu = !!(config?.customMenu);

                let menuType: 'ADMIN' | 'LEADER' | 'EMPLOYEE' | 'CUSTOM';
                if (user.rolGlobal === 'Admin') {
                    menuType = 'ADMIN';
                } else if (hasCustomMenu) {
                    menuType = 'CUSTOM';
                } else if (subordinateCount > 0) {
                    menuType = 'LEADER';
                } else {
                    menuType = 'EMPLOYEE';
                }

                return {
                    idUsuario: user.idUsuario,
                    nombre: user.nombre,
                    carnet: user.carnet || '',
                    cargo: user.cargo || 'Sin cargo',
                    departamento: user.departamento || 'Sin departamento',
                    subordinateCount,
                    menuType,
                    hasCustomMenu,
                    rolGlobal: user.rolGlobal
                };
            })
        );

        return usersWithInfo;
    }

    async assignCustomMenu(idUsuario: number, customMenu: string | null): Promise<void> {
        let config = await this.configRepo.findOne({ where: { idUsuario } });

        if (!config) {
            config = this.configRepo.create({ idUsuario });
        }

        config.customMenu = customMenu ?? null;
        await this.configRepo.save(config);
    }

    async removeCustomMenu(idUsuario: number): Promise<void> {
        await this.assignCustomMenu(idUsuario, null);
    }

    async getSecurityProfiles(): Promise<SeguridadPerfil[]> {
        return this.perfilRepo.find({ where: { activo: true } });
    }
}
