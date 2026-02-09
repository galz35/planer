
import { Controller, Post, Body, UseGuards, Req, Logger } from '@nestjs/common';
import { NVarChar, ejecutarSP } from '../db/base.repo';
import { AuthGuard } from '@nestjs/passport';

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationController {
    private readonly logger = new Logger(NotificationController.name);

    @Post('device-token')
    async registerDeviceToken(@Req() req, @Body() body: { token: string, platform?: string }) {
        const idUsuario = req.user.userId || req.user.idUsuario || req.user.id;
        const { token, platform } = body;

        // Validar idUsuario
        if (!idUsuario) {
            this.logger.error('No user ID found in request');
            return { success: false, message: 'User not authenticated' };
        }

        this.logger.log(`Registering device token for user ${idUsuario}: ${token?.substring(0, 10)}...`);

        if (!token) return { success: false, message: 'Token required' };

        await ejecutarSP('sp_Dispositivos_Registrar', {
            idUsuario: { valor: idUsuario, tipo: 'Int' },
            tokenFCM: { valor: token, tipo: NVarChar },
            plataforma: { valor: platform || 'android', tipo: NVarChar }
        });

        return { success: true };
    }
}
