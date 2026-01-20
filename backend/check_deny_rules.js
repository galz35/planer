
const { DataSource } = require('typeorm');
require('dotenv').config();

async function checkDenyRules() {
    const ds = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT),
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        synchronize: false,
    });

    try {
        await ds.initialize();
        const res = await ds.query("SELECT * FROM p_permiso_empleado WHERE tipo_acceso = 'DENY'");
        console.log(JSON.stringify(res, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await ds.destroy();
    }
}

checkDenyRules();
