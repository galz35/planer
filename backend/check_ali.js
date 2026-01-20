
const { DataSource } = require('typeorm');
require('dotenv').config();

async function checkUser() {
    console.log('Connecting to ' + process.env.DB_HOST + '...');
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
        console.log('Connected.');
        const rows = await ds.query("SELECT * FROM \"p_Usuarios\" WHERE correo = 'ali.rodriguez@claro.com.ni'");
        if (rows.length > 0) {
            const user = rows[0];
            console.log('USER_DETAILS:');
            console.log(JSON.stringify(user, null, 2));

            const subs = await ds.query("SELECT carnet, \"nombreCompleto\" FROM \"p_Usuarios\" WHERE \"jefeCarnet\" = $1", [user.carnet]);
            console.log('SUBORDINATES_COUNT: ' + subs.length);
            subs.forEach(s => console.log(' - ' + s.carnet + ': ' + s.nombreCompleto));

            // Also check for specific permissions
            const perms = await ds.query("SELECT pe.*, obj.nombre as nombre_objetivo FROM p_permiso_empleado pe JOIN \"p_Usuarios\" obj ON pe.carnet_objetivo = obj.carnet WHERE pe.carnet_recibe = $1 AND pe.activo = true", [user.carnet]);
            console.log('PERMISSIONS_COUNT: ' + perms.length);
            perms.forEach(p => console.log(' - ' + p.tipo_acceso + ' to ' + p.carnet_objetivo + ' (' + p.nombre_objetivo + ')'));

        } else {
            console.log('USER_NOT_FOUND');
        }
    } catch (e) {
        console.error('ERROR during operation:');
        console.error(e);
    } finally {
        await ds.destroy();
    }
}

checkUser();
