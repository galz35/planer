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

        // Limpiar tareas anteriores de Tania (orden correcto para FK)
        const tasksToDelete = await client.query('SELECT "idTarea" FROM "p_Tareas" WHERE "idCreador" = 2');
        for (const row of tasksToDelete.rows) {
            await client.query('DELETE FROM "p_TareaAsignados" WHERE "idTarea" = $1', [row.idTarea]);
        }
        await client.query('DELETE FROM "p_Tareas" WHERE "idCreador" = 2');
        console.log('Cleaned old tasks');

        // Insertar 5 tareas simples (una por día del 12 al 16 de enero)
        const tasks = [
            { fecha: '2026-01-12', titulo: 'Revisión de documentos (12 Ene)' },
            { fecha: '2026-01-13', titulo: 'Reunión de equipo (13 Ene)' },
            { fecha: '2026-01-14', titulo: 'Actualización de sistema (14 Ene)' },
            { fecha: '2026-01-15', titulo: 'Capacitación interna (15 Ene)' },
            { fecha: '2026-01-16', titulo: 'Reporte mensual (16 Ene)' }
        ];

        for (const task of tasks) {
            // Insertar tarea
            const res = await client.query(`
                INSERT INTO "p_Tareas" 
                ("idProyecto", "titulo", "descripcion", "estado", "prioridad", "esfuerzo", 
                 "fechaObjetivo", "idCreador", "progreso", "orden", "fechaCreacion", "fechaUltActualizacion")
                VALUES 
                (8, $1, 'Tarea de prueba', 'EnCurso', 'Media', 'M', 
                 $2, 2, 50, 1, NOW(), NOW())
                RETURNING "idTarea"
            `, [task.titulo, task.fecha]);

            const idTarea = res.rows[0].idTarea;

            // Asignar a Tania como responsable
            await client.query(`
                INSERT INTO "p_TareaAsignados" ("idTarea", "idUsuario", "tipo")
                VALUES ($1, 2, 'Responsable')
            `, [idTarea]);

            console.log(`✓ Created task: ${task.titulo} (ID: ${idTarea})`);
        }

        console.log('\n✅ Successfully created 5 tasks for Tania (Jan 12-16, 2026)');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
