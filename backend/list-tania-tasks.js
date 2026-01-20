
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
            SELECT t.titulo, t.estado, t."fechaObjetivo"
            FROM "p_Tareas" t 
            JOIN "p_TareaAsignados" ta ON t."idTarea" = ta."idTarea"
            WHERE ta."idUsuario" = 2
        `);
        for (const row of res.rows) {
            console.log(`TASK: ${row.titulo} | STATUS: ${row.estado} | DATE: ${row.fechaObjetivo ? row.fechaObjetivo.toISOString() : 'NULL'}`);
        }
    } catch (err) { console.error(err); }
    finally { await client.end(); }
}

run();
