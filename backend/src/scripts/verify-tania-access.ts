
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AuthService } from '../auth/auth.service';
import { Usuario } from '../entities';
import { DataSource } from 'typeorm';

async function verifyTaniaLogin() {
    try {
        console.log('🕵️ Verificando credenciales para ACTO 1 (Tania)...');
        const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
        const authService = app.get(AuthService);
        const dataSource = app.get(DataSource);
        const userRepo = dataSource.getRepository(Usuario);

        const email = 'taniaa.aguirre@claro.com.ni';
        const user = await userRepo.findOne({ where: { correo: email }, relations: ['rol'] });

        if (!user) {
            console.error(`❌ ERROR FATAL: El usuario ${email} NO EXISTE en la BD.`);
            process.exit(1);
        }

        console.log(`✅ Usuario encontrado: ${user.nombre} | Rol: ${user.rol?.nombre || user.rolGlobal}`);

        try {
            // Intento de login simulado
            await authService.validateUser(email, '123456');
            console.log('✅ Contraseña válida verified.');

            const login = await authService.login(user);
            if (login.access_token) {
                console.log('✅ Token JWT generado correctamente.');
                console.log('🚀 LISTO PARA PRUEBA MANUAL EN FRONTEND.');
            }
        } catch (e) {
            console.error('❌ Error validando password:', e.message);
        }

        await app.close();
    } catch (e) {
        console.error('System Error:', e);
    }
}

verifyTaniaLogin();
