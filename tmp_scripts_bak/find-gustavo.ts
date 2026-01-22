
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
config();
async function main() {
    const ds = new DataSource({
        type: 'postgres', host: process.env.DB_HOST, port: 5432, username: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME
    });
    await ds.initialize();
    const g = await ds.query('SELECT carnet FROM p_empleados WHERE LOWER(correo) = LOWER($1)', ['gustavo.lira@claro.com.ni']);
    console.log('GUSTAVO_CARNET:', g[0]?.carnet);
    await ds.destroy();
}
main();
