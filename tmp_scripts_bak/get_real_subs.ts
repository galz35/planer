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
    });
    await ds.initialize();
    const subs = await ds.query("SELECT carnet, nombre_completo, cargo FROM p_empleados WHERE carnet_jefe1 = 'USR-1353' ORDER BY carnet LIMIT 10");
    console.log(JSON.stringify(subs, null, 2));
    await ds.destroy();
}
run();
