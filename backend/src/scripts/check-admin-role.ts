
import { DataSource } from 'typeorm';
import { Usuario, Rol, UsuarioCredenciales, UsuarioOrganizacion, OrganizacionNodo } from '../entities';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const AppDataSource = new DataSource({
    type: 'mssql',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '1433'),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [Usuario, Rol, UsuarioCredenciales, UsuarioOrganizacion, OrganizacionNodo],
    synchronize: false,
    options: { encrypt: false },
});

async function checkAdminRole() {
    await AppDataSource.initialize();
    const user = await AppDataSource.getRepository(Usuario).findOne({
        where: { correo: 'gustavo.lira@claro.com.ni' }
    });

    if (user) {
        console.log(`User: ${user.nombre}`);
        console.log(`Email: ${user.correo}`);
        console.log(`RolGlobal: '${user.rolGlobal}'`); // Quotes to see if there's whitespace
        console.log(`Active: ${user.activo}`);
    } else {
        console.log('User gustavo.lira@claro.com.ni not found');
    }

    await AppDataSource.destroy();
}

checkAdminRole().catch(console.error);
