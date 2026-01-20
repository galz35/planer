
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
            SELECT count(*) FROM "p_TareaAsignados" WHERE "idUsuario" = $1
        `, [idUsuario]);

        console.log(`User ${email} (ID: ${idUsuario}) has ${tasks.rows[0].count} assigned tasks.`);

        if (tasks.rows[0].count > 0) {
            const sample = await client.query(`
                SELECT t.titulo, t.estado, t."fechaObjetivo" 
                FROM "p_Tareas" t 
                JOIN "p_TareaAsignados" ta ON t."idTarea" = ta."idTarea"
                WHERE ta."idUsuario" = $1
                LIMIT 5
            `, [idUsuario]);
            console.log(JSON.stringify(sample.rows, null, 2));
        }
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

run();
