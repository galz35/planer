
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
        const email = 'taniaa.aguirre@claro.com.ni';
        const res = await client.query('SELECT "idUsuario" FROM "p_Usuarios" WHERE correo = $1', [email]);
        const idUsuario = res.rows[0].idUsuario;

        const tasks = await client.query(`
            SELECT t."idTarea", t.titulo, t.estado, t."fechaObjetivo", t."fechaInicioPlanificada", t."fechaHecha"
            FROM "p_Tareas" t 
            JOIN "p_TareaAsignados" ta ON t."idTarea" = ta."idTarea"
            WHERE ta."idUsuario" = $1
            ORDER BY t."fechaObjetivo" ASC
        `, [idUsuario]);

        console.log(`User ${email} (ID: ${idUsuario}) has ${tasks.rows.length} tasks.`);
        console.table(tasks.rows.map(t => ({
            id: t.idTarea,
            titulo: t.titulo.substring(0, 30),
            estado: t.estado,
            objetivo: t.fechaObjetivo ? t.fechaObjetivo.toISOString().split('T')[0] : 'N/A',
            inicio: t.fechaInicioPlanificada ? t.fechaInicioPlanificada : 'N/A'
        })));

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

run();
