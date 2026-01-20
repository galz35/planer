import { DataSource } from 'typeorm';
import { OrganizacionNodo } from '../entities';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../../.env') });

const entities = [OrganizacionNodo];

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
    try {
        const nodos = await ds.getRepository(OrganizacionNodo).find({ take: 5 });
        console.log('--- Nodos Disponibles ---');
        nodos.forEach(n => console.log(`ID: ${n.idNodo}, Nombre: ${n.nombre}`));
    } finally {
        await ds.destroy();
    }
}
run();
