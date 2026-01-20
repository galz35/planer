
require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();
        const resUser = await client.query('SELECT "idUsuario" FROM "p_Usuarios" WHERE correo = $1', ['taniaa.aguirre@claro.com.ni']);
        if (resUser.rows.length === 0) return;
        const uid = resUser.rows[0].idUsuario;

        const rangeStart = '2026-01-01';
        const rangeEnd = '2026-01-31';

        const res = await client.query(`
            SELECT COUNT(*) 
            FROM "p_Tareas" t
            JOIN "p_TareaAsignados" ta ON t."idTarea" = ta."idTarea"
            WHERE ta."idUsuario" = $1 
            AND (t."fechaObjetivo" BETWEEN $2 AND $3 OR t."fechaHecha" BETWEEN $2 AND $3)
        `, [uid, rangeStart, rangeEnd]);

        console.log(`COUNT:${res.rows[0].count}`);
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await client.end();
    }
}
run();
