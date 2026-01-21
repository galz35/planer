import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './entities/usuario.entity';
import { UsuarioCredenciales } from './entities/usuario-credenciales.entity';
import { UsuarioConfig } from './entities/usuario-config.entity';

@Injectable()
export class AuthService {
    constructor(
        private jwtService: JwtService,
        @InjectRepository(Usuario) private userRepo: Repository<Usuario>,
        @InjectRepository(UsuarioCredenciales) private credsRepo: Repository<UsuarioCredenciales>,
        @InjectRepository(UsuarioConfig) private configRepo: Repository<UsuarioConfig>,
    ) { }

    async validateUser(identifier: string, pass: string): Promise<any> {
        console.log('[DEBUG] validateUser called with:', identifier);
        const user = await this.userRepo.findOne({
            where: [
                { correo: identifier, activo: true },
                { carnet: identifier, activo: true }
            ],
            relations: ['rol']
        });
        console.log('[DEBUG] User found:', user ? user.idUsuario : 'NULL');
        if (!user) return null;

        const creds = await this.credsRepo.findOne({ where: { idUsuario: user.idUsuario } });
        console.log('[DEBUG] Creds found:', creds ? 'YES' : 'NULL');
        if (creds) {
            const match = await bcrypt.compare(pass, creds.passwordHash);
            console.log('[DEBUG] Password match:', match);
            if (match) {
                creds.ultimoLogin = new Date();
                await this.credsRepo.save(creds);
                return user;
            }
        }
        return null;
    }

    async login(user: any) {
        // User object comes from validateUser (which is the Entity)
        const tokens = await this.generateTokens(user);
        await this.updateRefreshToken(user.idUsuario, tokens.refresh_token);

        // SYNC REMOVED: Usuario table now holds all info (Unified)

        let idOrg: number | undefined;
        // Parse idOrg if valid string (RRHH data)
        if (user.idOrg && /^\d+$/.test(user.idOrg)) {
            idOrg = parseInt(user.idOrg, 10);
        }

        // Calcular subordinados de forma asíncrona (optimizado)
        const subordinateCount = await this.userRepo.count({
            where: { jefeCarnet: user.carnet, activo: true }
        });

        return {
            ...tokens,
            user: {
                idUsuario: user.idUsuario,
                nombre: user.nombre,
                correo: user.correo,
                carnet: user.carnet,
                rol: user.rol,
                rolGlobal: user.rolGlobal,
                pais: user.pais,
                idOrg: idOrg,
                cargo: user.cargo,
                departamento: user.departamento,
                subordinateCount, // Nuevo: conteo de gente a cargo
                menuConfig: await this.resolveMenu(user, subordinateCount)
            }
        };
    }

    async refreshTokens(userId: number, refreshToken: string) {
        const creds = await this.credsRepo.findOne({ where: { idUsuario: userId } });
        if (!creds || !creds.refreshTokenHash) throw new UnauthorizedException('Access Denied');

        const isMatch = await bcrypt.compare(refreshToken, creds.refreshTokenHash);
        if (!isMatch) throw new UnauthorizedException('Access Denied');

        const user = await this.userRepo.findOne({ where: { idUsuario: userId }, relations: ['rol'] });
        if (!user) throw new UnauthorizedException('User no longer exists');

        const tokens = await this.generateTokens(user);
        await this.updateRefreshToken(user.idUsuario, tokens.refresh_token);

        return tokens;
    }

    private async generateTokens(user: any) {
        const payload = {
            correo: user.correo,
            sub: user.idUsuario,
            userId: user.idUsuario,
            rol: user.rolGlobal,
            pais: user.pais
        };

        const [at, rt] = await Promise.all([
            this.jwtService.signAsync(payload, { expiresIn: '1h' }),
            this.jwtService.signAsync(payload, { expiresIn: '7d' })
        ]);

        return {
            access_token: at,
            refresh_token: rt
        };
    }

    private async updateRefreshToken(userId: number, rt: string) {
        const hashedRt = await bcrypt.hash(rt, 10);
        await this.credsRepo.update({ idUsuario: userId }, { refreshTokenHash: hashedRt });
    }
    private async resolveMenu(user: Usuario, subordinateCount: number): Promise<any> {
        // 0. Safety override: Admins always get full menu (fallback to frontend constant)
        const isAdmin = user.rolGlobal === 'Admin' || user.rol?.nombre === 'Admin' || user.rol?.nombre === 'Administrador';
        if (isAdmin) return null; // Frontend usará menú completo

        // 1. Try Custom Menu (Manual Override - Máxima Prioridad)
        const config = await this.configRepo.findOne({ where: { idUsuario: user.idUsuario } });
        if (config && config.customMenu) {
            try {
                return JSON.parse(config.customMenu);
            } catch (e) {
                console.error('Error parsing custom menu', e);
            }
        }

        // 2. Detección Automática: Si tiene gente a cargo, es Líder
        if (subordinateCount > 0) {
            // Retornar identificador de perfil en lugar de JSON completo (más eficiente)
            return { profileType: 'LEADER', subordinateCount };
        }

        // 3. Try Default Role Menu
        if (user.rol && user.rol.defaultMenu) {
            try {
                return JSON.parse(user.rol.defaultMenu);
            } catch (e) {
                console.error('Error parsing role menu', e);
            }
        }

        // 4. Fallback: Empleado Base
        return { profileType: 'EMPLOYEE' };
    }
}
