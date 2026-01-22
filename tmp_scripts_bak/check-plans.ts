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
    const plans = await ds.query('SELECT carnet, nombre, estado FROM "p_PlanesTrabajo" pt JOIN "p_Usuarios" u ON pt."idUsuario" = u."idUsuario"');
    console.table(plans);
    await ds.destroy();
}
run();
