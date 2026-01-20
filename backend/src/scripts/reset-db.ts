import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const tables = [
    'p_CheckinTareas',
    'p_Checkins',
    'p_TareaAsignados',
    'p_Bloqueos',
    'p_Tareas',
    'p_Proyectos',
    'p_UsuariosOrganizacion',
    'p_OrganizacionNodos',
    'p_UsuariosCredenciales',
    'p_Usuarios',
    'p_Roles'
];

async function resetDb() {
    const client = new Client({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    });

    try {
        await client.connect();
        console.log('Connected to DB');

        for (const table of tables) {
            console.log(`Dropping table ${table}...`);
            await client.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
        }

        console.log('All project tables dropped successfully.');
    } catch (err) {
        console.error('Error dropping tables:', err);
    } finally {
        await client.end();
    }
}

resetDb();
