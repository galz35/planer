
import { DataSource, Brackets } from 'typeorm';
import { config } from 'dotenv';

config();

async function run() {
    const ds = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT) || 5432,
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    await ds.initialize();
    const TARGET_USER_ID = 271;

    console.log(`\n=== 1. BUSCANDO TAREA PARA PRUEBA (User: ${TARGET_USER_ID}) ===`);
    // Find a task assigned to user that HAS a date (Mi Dia)
    const candidates = await ds.query(`
        SELECT t."idTarea", t.titulo, t."fechaObjetivo" 
        FROM "p_Tareas" t
        JOIN "p_TareaAsignados" ta ON ta."idTarea" = t."idTarea"
        WHERE ta."idUsuario" = $1 
        AND t."fechaObjetivo" IS NOT NULL
        AND t.estado NOT IN ('Hecha', 'Descartada', 'Completada', 'Cancelada')
        LIMIT 1
    `, [TARGET_USER_ID]);

    if (candidates.length === 0) {
        console.log('No se encontraron tareas con fecha para posponer. Creando una...');
        const res = await ds.query(`
            INSERT INTO "p_Tareas" (titulo, estado, prioridad, "fechaObjetivo", "idCreador", "fechaCreacion")
            VALUES ('Tarea Prueba Script', 'Pendiente', 'Media', NOW(), $1, NOW()) RETURNING "idTarea"
        `, [TARGET_USER_ID]);
        const newId = res[0].idTarea;
        await ds.query('INSERT INTO "p_TareaAsignados" ("idTarea", "idUsuario", "tipo") VALUES ($1, $2, $3)', [newId, TARGET_USER_ID, 'Responsable']);
        console.log(`Tarea creada: ${newId}`);
        candidates.push({ idTarea: newId, titulo: 'Tarea Prueba Script' });
    }

    const task = candidates[0];
    console.log(`> Seleccionada Tarea: ${task.idTarea} - "${task.titulo}" (Fecha actual: ${task.fechaObjetivo})`);

    console.log(`\n=== 2. SIMULANDO "POSPONER" (UPDATE fechaObjetivo = NULL) ===`);
    await ds.query('UPDATE "p_Tareas" SET "fechaObjetivo" = NULL, "fechaInicioPlanificada" = NULL WHERE "idTarea" = $1', [task.idTarea]);
    console.log('> Update realizado.');

    console.log(`\n=== 3. VERIFICANDO SI APARECE EN EL BACKLOG (Query del Servicio) ===`);
    // Esta es la traduccion EXACTA de la QueryBuilder de tasks.service.ts
    // .where('t.estado NOT IN (:...estados)', { estados: ['Hecha', 'Descartada', 'Completada', 'Cancelada'] })
    // .andWhere(new Brackets(qb => { qb.where('p.idProyecto IS NULL').orWhere('p.pais = :userPais', { userPais }).orWhere('p.pais IS NULL'); }))

    // Primero obtenemos pais del usuario
    const u = await ds.query('SELECT pais FROM "p_Usuarios" WHERE "idUsuario" = $1', [TARGET_USER_ID]);
    const userPais = u[0]?.pais || 'NI';

    const serviceQuery = `
        SELECT t."idTarea", t.titulo, t."fechaObjetivo", t.estado, p.nombre as proyecto, p.pais
        FROM "p_Tareas" t
        INNER JOIN "p_TareaAsignados" ta ON ta."idTarea" = t."idTarea" AND ta."idUsuario" = ${TARGET_USER_ID}
        LEFT JOIN "p_Proyectos" p ON p."idProyecto" = t."idProyecto"
        WHERE t.estado NOT IN ('Hecha', 'Descartada', 'Completada', 'Cancelada')
        AND (
            p."idProyecto" IS NULL 
            OR p.pais = '${userPais}' 
            OR p.pais IS NULL
        )
    `;

    const results = await ds.query(serviceQuery);

    console.log(`> Resultados Totales encontrados para el usuario: ${results.length}`);

    const found = results.find(r => r.idTarea === task.idTarea);
    if (found) {
        console.log(`\n✅ ÉXITO: La tarea ${found.idTarea} APARECE en la lista.`);
        console.log(`   Datos: Título="${found.titulo}", Fecha="${found.fechaObjetivo}" (Debe ser NULL o vacía)`);

        if (!found.fechaObjetivo) {
            console.log('   Resultado: CORRECTO. La tarea está en el Backlog (sin fecha).');
        } else {
            console.log('   Resultado: RARO. La tarea tiene fecha, no debería estar en backlog visualmente pero sí en la lista.');
        }
    } else {
        console.log(`\n❌ ERROR CRÍTICO: La tarea ${task.idTarea} NO aparece en la lista devuelta por el servicio.`);
        console.log('   Posibles causas: Filtro de estado incorrecto, asignación perdida, o filtro de proyecto/país.');

        // Debugging why
        console.log('\n--- DIAGNÓSTICO PROFUNDO ---');
        const rawTask = await ds.query('SELECT * FROM "p_Tareas" WHERE "idTarea" = $1', [task.idTarea]);
        console.log('Raw Task:', rawTask[0]);
        const assignment = await ds.query('SELECT * FROM "p_TareaAsignados" WHERE "idTarea" = $1', [task.idTarea]);
        console.log('Assignment:', assignment);
    }

    await ds.destroy();
}

run().catch(console.error);
