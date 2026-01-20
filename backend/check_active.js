
const { DataSource } = require('typeorm');
require('dotenv').config();

async function checkSubordinatesActive() {
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
        const res = await ds.query("SELECT carnet, \"nombreCompleto\", activo FROM \"p_Usuarios\" WHERE \"jefeCarnet\" = '402178'");
        console.log('SUBS:', res);

        const count = await ds.query("SELECT count(*) FROM \"p_Usuarios\" WHERE activo = true");
        console.log('TOTAL_ACTIVE:', count[0].count);
    } catch (e) {
        console.error(e);
    } finally {
        await ds.destroy();
    }
}

checkSubordinatesActive();
