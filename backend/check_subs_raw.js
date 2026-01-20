
const { DataSource } = require('typeorm');
require('dotenv').config();

async function checkSubordinatesRaw() {
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
        const jefe = '402178';

        // Check Ali himself
        const ali = await ds.query("SELECT carnet, \"jefeCarnet\" FROM \"p_Usuarios\" WHERE correo = 'ali.rodriguez@claro.com.ni'");
        console.log('ALI_IN_DB:', JSON.stringify(ali[0]));

        // Check subordinates
        const subs = await ds.query("SELECT carnet, \"nombreCompleto\", \"jefeCarnet\" FROM \"p_Usuarios\" WHERE \"jefeCarnet\" = $1", [jefe]);
        console.log(`SUBS_FOUND: ${subs.length}`);
        subs.forEach(s => console.log(` - [${s.carnet}] jefe: [${s.jefeCarnet}]`));

        // Try with TRIM
        const subsTrim = await ds.query("SELECT COUNT(*) FROM \"p_Usuarios\" WHERE TRIM(\"jefeCarnet\") = TRIM($1)", [jefe]);
        console.log(`SUBS_TRIM_COUNT: ${subsTrim[0].count}`);

    } catch (e) {
        console.error(e);
    } finally {
        await ds.destroy();
    }
}

checkSubordinatesRaw();
