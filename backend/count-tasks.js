
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
        const r = await client.query('SELECT count(*) FROM "p_Tareas"');
        console.log("Total tasks in DB: " + r.rows[0].count);

        const r2 = await client.query('SELECT count(*) FROM "p_TareaAsignados" WHERE "idUsuario" = 2');
        console.log("Tasks assigned to Tania (ID 2): " + r2.rows[0].count);

        const r3 = await client.query('SELECT "idTarea", titulo, "fechaObjetivo" FROM "p_Tareas" WHERE "idCreador" = 2 ORDER BY "idTarea" DESC LIMIT 5');
        console.log("Last 5 tasks created by Tania:");
        r3.rows.forEach(row => console.log(`- ${row.idTarea}: ${row.titulo} | ${row.fechaObjetivo}`));

    } catch (err) { console.error(err); }
    finally { await client.end(); }
}

run();
