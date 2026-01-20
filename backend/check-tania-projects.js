
const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: { rejectUnauthorized: false },
    });

    try {
        await client.connect();
        const r = await client.query(`
            SELECT t.titulo, t."idProyecto", p.nombre as p_nombre
            FROM "p_Tareas" t 
            LEFT JOIN "p_Proyectos" p ON t."idProyecto" = p."idProyecto" 
            WHERE t."idCreador" = 2
        `);
        console.log(JSON.stringify(r.rows, null, 2));
    } catch (err) { console.error(err); }
    finally { await client.end(); }
}

run();
