
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
            SELECT count(*) as total, 
                   count(*) filter (where t."fechaObjetivo" < '2026-01-20') as readable
            FROM "p_Tareas" t 
            JOIN "p_TareaAsignados" ta ON t."idTarea" = ta."idTarea"
            WHERE ta."idUsuario" = 2
        `);
        console.log(JSON.stringify(res.rows[0]));

        const res2 = await client.query(`
            SELECT t.titulo, t."fechaObjetivo"
            FROM "p_Tareas" t 
            JOIN "p_TareaAsignados" ta ON t."idTarea" = ta."idTarea"
            WHERE ta."idUsuario" = 2 AND t."fechaObjetivo" < '2026-01-22'
            LIMIT 10
        `);
        console.log('--- RECENT TASKS ---');
        res2.rows.forEach(r => console.log(`${r.titulo} | ${r.fechaObjetivo}`));
    } catch (err) { console.error(err); }
    finally { await client.end(); }
}

run();
