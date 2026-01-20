import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Usuario, Rol, UsuarioCredenciales, OrganizacionNodo, UsuarioOrganizacion, Proyecto, Tarea, TareaAsignado, Checkin, CheckinTarea, Bloqueo } from '../entities';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    entities: [Usuario, Rol, UsuarioCredenciales, OrganizacionNodo, UsuarioOrganizacion, Proyecto, Tarea, TareaAsignado, Checkin, CheckinTarea, Bloqueo],
    synchronize: true, // This is what we want to trigger
    logging: true
});

async function syncSchema() {
    try {
        console.log('Connecting to DB...');
        await AppDataSource.initialize();
        console.log('Connected. Synchronizing schema...');
        await AppDataSource.synchronize();
        console.log('Schema synchronized successfully.');
    } catch (err) {
        console.error('Error syncing schema:', err);
    } finally {
        await AppDataSource.destroy();
    }
}

syncSchema();
