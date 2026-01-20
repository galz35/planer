
const { DataSource } = require('typeorm');
require('dotenv').config();

async function verifyBoss() {
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
        // Verifiquemos a uno de los subordinados de Ali (carnet 402178)
        const carnetSub = '222627'; // PABLO JOSE CRUZ BERMUDEZ

        console.log(`Buscando datos del carnet ${carnetSub}...`);
        const rows = await ds.query("SELECT carnet, \"nombreCompleto\", \"jefeCarnet\", \"jefeNombre\", \"jefeCorreo\" FROM \"p_Usuarios\" WHERE carnet = $1", [carnetSub]);

        if (rows.length > 0) {
            console.log('DATOS DEL EMPLEADO:');
            console.log(JSON.stringify(rows[0], null, 2));
        } else {
            console.log('No se encontró el carnet.');
        }

    } catch (e) {
        console.error(e);
    } finally {
        await ds.destroy();
    }
}

verifyBoss();
