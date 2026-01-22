import { DataSource } from 'typeorm';
import {
    Usuario, Tarea, TareaAsignado, Proyecto, OrganizacionNodo,
    Rol, Checkin, CheckinTarea, Bloqueo, TareaAvance, AuditLog,
    UsuarioOrganizacion, UsuarioConfig, UsuarioCredenciales
} from '../entities';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../../.env') });

const entities = [
    Usuario, Tarea, TareaAsignado, Proyecto, OrganizacionNodo,
    Rol, Checkin, CheckinTarea, Bloqueo, TareaAvance, AuditLog,
    UsuarioOrganizacion, UsuarioConfig, UsuarioCredenciales
];

async function run() {
    const ds = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_NAME || 'clarity_db',
        entities: entities,
        synchronize: false,
    });

    await ds.initialize();
    const result = await ds.query('UPDATE "p_Usuarios" SET activo = true');
    console.log('Restaurados a activo:', result);
    await ds.destroy();
}

run();
