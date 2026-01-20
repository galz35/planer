
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { Usuario } from '../auth/entities/usuario.entity';
import { UsuarioConfig } from '../auth/entities/usuario-config.entity';
import { Rol } from '../auth/entities/rol.entity';
import * as fs from 'fs';

async function bootstrap() {
    try {
        const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
        const dataSource = app.get(DataSource);

        const userRepo = dataSource.getRepository(Usuario);
        const configRepo = dataSource.getRepository(UsuarioConfig);
        const rolRepo = dataSource.getRepository(Rol);

        // Disable logging to avoid clutter
        app.useLogger(false);

        const email = 'gustavo.lira@claro.com.ni';
        const user = await userRepo.findOne({
            where: { correo: email },
            relations: ['rol']
        });

        let output = '';

        if (!user) {
            output += 'User not found\n';
        } else {
            output += JSON.stringify({
                id: user.idUsuario,
                email: user.correo,
                rolGlobal: user.rolGlobal,
                rolId: user.idRol,
                rolName: user.rol?.nombre
            }, null, 2) + '\n';

            const config = await configRepo.findOne({ where: { idUsuario: user.idUsuario } });
            output += 'User Config (Custom Menu): ' + (config?.customMenu || 'null') + '\n';

            if (user.rol) {
                const rol = await rolRepo.findOne({ where: { idRol: user.rol.idRol } });
                output += 'Role Config (Default Menu): ' + (rol?.defaultMenu || 'null') + '\n';
            }
        }

        fs.writeFileSync('debug_output.txt', output);
        await app.close();
        process.exit(0);
    } catch (e) {
        fs.writeFileSync('debug_output.txt', 'Error: ' + e.message);
        process.exit(1);
    }
}

bootstrap();
