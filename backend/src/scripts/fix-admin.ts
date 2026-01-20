
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { Usuario } from '../auth/entities/usuario.entity';
import { Rol } from '../auth/entities/rol.entity';

async function bootstrap() {
    try {
        const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
        app.useLogger(false);
        const dataSource = app.get(DataSource);

        const userRepo = dataSource.getRepository(Usuario);
        const rolRepo = dataSource.getRepository(Rol);

        const email = 'gustavo.lira@claro.com.ni';
        const user = await userRepo.findOne({
            where: { correo: email }
        });

        if (!user) {
            console.log('User not found');
            process.exit(1);
        }

        console.log('Found user:', user.correo, 'Current Role:', user.rolGlobal);

        // Find Admin Role
        let adminRole = await rolRepo.findOne({ where: { nombre: 'Admin' } });
        if (!adminRole) {
            // Try 'Administrador' or create one?
            adminRole = await rolRepo.findOne({ where: { nombre: 'Administrador' } });
        }

        // Update User
        user.rolGlobal = 'Admin';
        if (adminRole) {
            user.idRol = adminRole.idRol;
            console.log('Assigning Role ID:', adminRole.idRol);
        } else {
            console.log('Admin Role entity not found, but setting rolGlobal to Admin');
        }

        await userRepo.save(user);
        console.log('User updated successfully to Admin');

        await app.close();
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

bootstrap();
