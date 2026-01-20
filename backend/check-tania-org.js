require('dotenv').config();
const { Client } = require('pg');

async function main() {
    const c = new Client({
        host: process.env.DB_HOST,
        port: 5432,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: { rejectUnauthorized: false }
    });

    await c.connect();

    // Check Tania's org fields
    const res = await c.query(`
        SELECT "idUsuario", nombre, correo, ogerencia, subgerencia, primer_nivel, carnet
        FROM "p_Usuarios" 
        WHERE correo ILIKE '%aguirre%' OR "idUsuario" = 2
        LIMIT 5
    `);

    console.log('=== USUARIOS ENCONTRADOS ===');
    console.log(JSON.stringify(res.rows, null, 2));

    // Also check if ANY user has ogerencia populated
    const res2 = await c.query(`
        SELECT COUNT(*) as total, 
               COUNT(ogerencia) as con_ogerencia,
               COUNT(subgerencia) as con_subgerencia,
               COUNT(primer_nivel) as con_primer_nivel
        FROM "p_Usuarios"
    `);
    console.log('\n=== ESTADISTICAS DE CAMPOS ORG ===');
    console.log(JSON.stringify(res2.rows[0], null, 2));

    await c.end();
}

main().catch(console.error);
