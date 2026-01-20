
const { DataSource } = require('typeorm');
require('dotenv').config();

async function checkColumns() {
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
        const res = await ds.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'p_Usuarios'");
        console.log('COLUMNS:');
        console.log(res.map(r => r.column_name).join(', '));
    } catch (e) {
        console.error(e);
    } finally {
        await ds.destroy();
    }
}

checkColumns();
