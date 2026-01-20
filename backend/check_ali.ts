
import { DataSource } from 'typeorm';
import { Usuario } from './src/auth/entities/usuario.entity';
import { Rol } from './src/auth/entities/rol.entity';
import { UsuarioOrganizacion } from './src/auth/entities/usuario-organizacion.entity';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkUser() {
    const ds = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'clarity_db',
        entities: [Usuario, Rol, UsuarioOrganizacion],
        synchronize: false,
    });

    await ds.initialize();
    const repo = ds.getRepository(Usuario);
    const user = await repo.findOne({ where: { correo: 'ali.rodriguez@claro.com.ni' } });

    if (user && user.carnet) {
        console.log('USER_DETAILS_START');
        console.log(JSON.stringify(user, null, 2));
        console.log('USER_DETAILS_END');

        // Also check if there are subordinates
        const subordinates = await repo.find({ where: { jefeCarnet: user.carnet } });
        console.log('SUBORDINATES_START');
        console.log(JSON.stringify(subordinates.map(s => ({ carnet: s.carnet, nombre: s.nombreCompleto || s.nombre })), null, 2));
        console.log('SUBORDINATES_END');
    } else {
        console.log('User not found or has no carnet');
    }

    await ds.destroy();
}

checkUser().catch(console.error);
