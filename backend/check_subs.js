
const { DataSource } = require('typeorm');
require('dotenv').config();

async function checkSubordinates() {
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
        const res = await ds.query("SELECT carnet, \"nombreCompleto\" FROM \"p_Usuarios\" WHERE \"jefeCarnet\" = $1", [jefe]);
        console.log(`Subordinates for ${jefe}: ${res.length}`);
        res.forEach(r => console.log(`- ${r.carnet}: ${r.nombreCompleto}`));

        // Check for special permissions again
        const perms = await ds.query("SELECT * FROM p_permiso_empleado WHERE carnet_recibe = $1", [jefe]);
        console.log(`Special permissions for ${jefe}: ${perms.length}`);
        perms.forEach(p => console.log(`- ${p.tipo_acceso} to ${p.carnet_objetivo}`));

    } catch (e) {
        console.error(e);
    } finally {
        await ds.destroy();
    }
}

checkSubordinates();
