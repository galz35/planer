
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
        // Corrected query using quotes for case sensitivity
        const res = await client.query(`
            SELECT t."idTarea", t.titulo, t."fechaObjetivo", t."fechaHecha", ta."idUsuario"
            FROM "p_Tareas" t
            JOIN "p_TareaAsignados" ta ON t."idTarea" = ta."idTarea"
            WHERE ta."idUsuario" = 2
            ORDER BY t."fechaObjetivo" DESC
        `);
        console.log("Total tasks found:", res.rowCount);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) { console.error(err); }
    finally { await client.end(); }
}

run();
