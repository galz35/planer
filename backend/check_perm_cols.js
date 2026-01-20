
const { DataSource } = require('typeorm');
require('dotenv').config();

async function checkAreaTable() {
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
        const res = await ds.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'p_permiso_area'");
        console.log('PERMISO_AREA_COLUMNS:');
        res.forEach(r => console.log(`- ${r.column_name} (${r.data_type})`));

        const res2 = await ds.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'p_permiso_empleado'");
        console.log('PERMISO_EMPLEADO_COLUMNS:');
        res2.forEach(r => console.log(`- ${r.column_name} (${r.data_type})`));

    } catch (e) {
        console.error(e);
    } finally {
        await ds.destroy();
    }
}

checkAreaTable();
