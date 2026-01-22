import { DataSource } from 'typeorm';
import { config } from 'dotenv';
config();

async function run() {
    const ds = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT) || 5432,
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        synchronize: false,
    });

    await ds.initialize();

    const jefe = 'USR-1353'; // Candida
    const subs = await ds.query(`
        SELECT carnet, nombre_completo, cargo 
        FROM p_empleados 
        WHERE carnet_jefe1 = $1 
        LIMIT 10
    `, [jefe]);

    console.log('--- Subordinados de Candida ---');
    console.table(subs);

    await ds.destroy();
}

run().catch(console.error);
