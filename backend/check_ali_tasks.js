
const { Client } = require('pg');

async function checkAliTasks() {
    const client = new Client({
        host: 'aws-0-us-west-2.pooler.supabase.com',
        port: 6543,
        user: 'postgres.ddmeodlpdxgmadduwdas',
        password: "92li!ra$Gu2",
        database: 'postgres',
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        // Get Ali's ID
        const userRes = await client.query('SELECT "idUsuario" FROM "p_Usuarios" WHERE correo = $1', ['ali.rodriguez@claro.com.ni']);
        if (userRes.rows.length === 0) { console.log('Ali not found'); return; }
        const userId = userRes.rows[0].idUsuario;
        console.log(`Ali ID: ${userId}`);

        // Check Tasks where he is Creator or Assigned
        // Assuming p_tareas or similar table. Let's check table name first if needed, but likely 'p_tareas' or 'Tarea'
        // Based on previous contexts, likely 'p_tareas' or 'tareas'. Let's check entities if needed, but I'll guess 'p_tareas'.
        // Actually, let's list tables if unsure, but standard naming in this project seems to be 'p_...'.
        // Let's look at a previous `view_file` of `planning.service.ts` or similar to confirm table name? 
        // `planning.service.ts` uses `this.tareaRepo.findOne`. Entity is `Tarea`.
        // Let's check `d:\planificacion\backend\src\planning\entities\tarea.entity.ts` if I haven't seen it, 
        // or just assume 'p_tareas' based on 'p_Usuarios'.

        const res = await client.query(`
        SELECT t."idTarea", t.titulo, t.estado, t."fechaObjetivo", t."fechaUltActualizacion", t."idAsignadoPor", t."idCreador"
        FROM "p_Tareas" t
        WHERE t."idCreador" = $1
    `, [userId]);

        console.log(`found ${res.rows.length} tasks for Ali`);
        res.rows.forEach(t => {
            console.log(`[${t.idTarea}] ${t.titulo} | Estado: ${t.estado} | Obj: ${t.fechaObjetivo} | Updated: ${t.fechaUltActualizacion}`);
        });

        await client.end();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkAliTasks();
