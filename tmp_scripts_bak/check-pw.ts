import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as bcrypt from 'bcrypt';
import { Usuario, UsuarioCredenciales } from '../entities';

const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    entities: [Usuario, UsuarioCredenciales],
});

async function check() {
    try {
        await AppDataSource.initialize();
        const user = await AppDataSource.getRepository(Usuario).findOne({ where: { correo: 'gustavo@claro.com.ni' } });
        if (!user) {
            console.log('User not found');
            return;
        }
        const creds = await AppDataSource.getRepository(UsuarioCredenciales).findOne({ where: { idUsuario: user.idUsuario } });
        if (!creds) {
            console.log('Credentials not found');
            return;
        }
        const isMatch = await bcrypt.compare('password123', creds.passwordHash);
        console.log(`Password 'password123' for gustavo@claro.com.ni matches: ${isMatch}`);
        console.log(`Hash in DB: ${creds.passwordHash}`);
    } catch (e) {
        console.error(e);
    } finally {
        await AppDataSource.destroy();
    }
}
check();
