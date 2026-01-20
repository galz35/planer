
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
config();

async function checkHistory() {
    const ds = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT) || 5432,
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: { rejectUnauthorized: false },
    });

    await ds.initialize();

    // Pick a random user
    const users = await ds.query(`SELECT "idUsuario", nombre FROM "p_Usuarios" WHERE activo = true LIMIT 1`);
    if (!users.length) return;
    const user = users[0];

    console.log(`\n📅 Historial de Tareas para: ${user.nombre}`);

    const tasks = await ds.query(`
        SELECT t.titulo, t.estado, t.progreso, t."fechaInicioPlanificada", b.motivo as bloqueo
        FROM "p_Tareas" t
        LEFT JOIN "p_Bloqueos" b ON b."idTarea" = t."idTarea"
        WHERE t."idCreador" = $1
        ORDER BY t."fechaInicioPlanificada" ASC
    `, [user.idUsuario]);

    console.log(JSON.stringify(tasks, null, 2));
    await ds.destroy();
}

checkHistory();
