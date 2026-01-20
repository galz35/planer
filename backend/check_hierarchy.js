
const { DataSource } = require('typeorm');
require('dotenv').config();

async function checkHierarchy() {
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
        const carnetAli = '402178';

        const sql = `
            WITH RECURSIVE
            Subordinados AS (
                SELECT carnet, "nombreCompleto", cargo
                FROM "p_Usuarios"
                WHERE "jefeCarnet" = $1 AND activo = true
                UNION
                SELECT u.carnet, u."nombreCompleto", u.cargo
                FROM "p_Usuarios" u
                JOIN Subordinados s ON u."jefeCarnet" = s.carnet
                WHERE u.activo = true
            )
            SELECT carnet, "nombreCompleto", cargo FROM Subordinados;
        `;

        const subs = await ds.query(sql, [carnetAli]);
        console.log('HIERARCHY_RESULTS:');
        subs.forEach(s => console.log(' - ' + s.carnet + ': ' + s.nombreCompleto + ' (' + s.cargo + ')'));

    } catch (e) {
        console.error(e);
    } finally {
        await ds.destroy();
    }
}

checkHierarchy();
