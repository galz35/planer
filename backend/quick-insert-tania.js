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
        console.log('Connected to database');

        // Insertar 5 tareas simples (una por día del 12 al 16 de enero)
        const tasks = [
            { fecha: '2026-01-12', titulo: 'Tarea AAA - 12 Enero' },
            { fecha: '2026-01-13', titulo: 'Tarea BBB - 13 Enero' },
            { fecha: '2026-01-14', titulo: 'Tarea CCC - 14 Enero' },
            { fecha: '2026-01-15', titulo: 'Tarea DDD - 15 Enero' },
            { fecha: '2026-01-16', titulo: 'Tarea EEE - 16 Enero' }
        ];

        for (const task of tasks) {
            // Insertar tarea
            const res = await client.query(`
                INSERT INTO "p_Tareas" 
                ("idProyecto", "titulo", "descripcion", "estado", "prioridad", "esfuerzo", 
                 "fechaObjetivo", "idCreador", "progreso", "orden", "fechaCreacion", "fechaUltActualizacion")
                VALUES 
                (8, $1, 'Tarea rápida de prueba', 'EnCurso', 'Media', 'S', 
                 $2, 2, 30, 1, NOW(), NOW())
                RETURNING "idTarea"
            `, [task.titulo, task.fecha]);

            const idTarea = res.rows[0].idTarea;

            // Asignar a Tania como responsable
            await client.query(`
                INSERT INTO "p_TareaAsignados" ("idTarea", "idUsuario", "tipo")
                VALUES ($1, 2, 'Responsable')
            `, [idTarea]);

            console.log(`✓ Created: ${task.titulo} (ID: ${idTarea})`);
        }

        console.log('\n✅ Successfully created 5 simple tasks for Tania!');
        console.log('📅 Dates: Jan 12-16, 2026');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
