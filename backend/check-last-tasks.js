
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
        const res = await client.query(`
            SELECT t."idTarea", t.titulo, t."fechaObjetivo"
            FROM "p_Tareas" t 
            JOIN "p_TareaAsignados" ta ON t."idTarea" = ta."idTarea"
            WHERE ta."idUsuario" = 2
            ORDER BY t."idTarea" DESC
            LIMIT 20
        `);
        console.log('--- LAST 20 TASKS FOR TANIA ---');
        res.rows.forEach(r => console.log(`ID: ${r.idTarea} | DATE: ${r.fechaObjetivo ? r.fechaObjetivo.toISOString().split('T')[0] : 'NULL'} | TITLE: ${r.titulo}`));
    } catch (err) { console.error(err); }
    finally { await client.end(); }
}

run();
