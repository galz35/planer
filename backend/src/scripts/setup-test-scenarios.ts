import { DataSource } from 'typeorm';
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
    console.log('--- Configurando Escenarios de Prueba RRHH ---');

    const usersToProcess = [
        { carnet: 'EMP001', scenario: 'Working & Blocked' },
        { carnet: 'EMP002', scenario: 'Overdue & Change Request' },
        { carnet: 'USR-337', scenario: 'Plan Created (Draft)' },
        { carnet: 'USR-1991', scenario: 'No Plan' }
    ];

    const bossCarnet = 'USR-1353'; // Candida

    // 1. Get user IDs
    const userMap = new Map<string, number>();
    const allCarnets = [...usersToProcess.map(u => u.carnet), bossCarnet];

    for (const carnet of allCarnets) {
        const u = await ds.query('SELECT "idUsuario" FROM "p_Usuarios" WHERE carnet = $1', [carnet]);
        if (u.length > 0) {
            userMap.set(carnet, u[0].idUsuario);
        } else {
            console.error(`ERROR: Usuario con carnet ${carnet} no encontrado.`);
            // Create user if it doesn't exist (emergency)
            await ds.query('INSERT INTO "p_Usuarios" (nombre, carnet, correo, activo, "rolGlobal") VALUES ($1, $2, $3, true, $4)',
                [carnet, carnet, `${carnet}@example.com`, 'User']);
            const u2 = await ds.query('SELECT "idUsuario" FROM "p_Usuarios" WHERE carnet = $1', [carnet]);
            userMap.set(carnet, u2[0].idUsuario);
        }
    }

    const bossId = userMap.get(bossCarnet)!;

    // 2. Clear old test data for these users to have a clean start
    console.log('Limpiando datos antiguos...');
    for (const { carnet } of usersToProcess) {
        const userId = userMap.get(carnet)!;
        await ds.query('DELETE FROM "p_Bloqueos" WHERE "idOrigenUsuario" = $1', [userId]);
        await ds.query('DELETE FROM "p_SolicitudCambios" WHERE "idUsuarioSolicitante" = $1', [userId]);

        // Get planes to delete tasks first
        const plans = await ds.query('SELECT "idPlan" FROM "p_PlanesTrabajo" WHERE "idUsuario" = $1', [userId]);
        for (const p of plans) {
            await ds.query('DELETE FROM "p_Tareas" WHERE "idPlan" = $1', [p.idPlan]);
        }
        await ds.query('DELETE FROM "p_PlanesTrabajo" WHERE "idUsuario" = $1', [userId]);
    }

    // ---------------------------------------------------------
    // SCENARIO 1: Juan (EMP001) - Working & Blocked
    // ---------------------------------------------------------
    const juanId = userMap.get('EMP001')!;
    const planJuan = await ds.query(`
        INSERT INTO "p_PlanesTrabajo" (nombre, "idUsuario", mes, anio, estado, "objetivoGeneral", "idCreador")
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING "idPlan"
    `, ['Plan Q1 - Juan', juanId, 1, 2026, 'Confirmado', 'Finalizar integraciones críticas', bossId]);
    const p1Id = planJuan[0].idPlan;

    // Task 1: Finished
    await ds.query(`
        INSERT INTO "p_Tareas" (titulo, estado, "idPlan", "idCreador", progreso, "fechaInicioPlanificada", "fechaObjetivo", "fechaHecha")
        VALUES ($1, $2, $3, $4, 100, '2026-01-10', '2026-01-12', NOW())
    `, ['Setup Proyecto Core', 'Hecha', p1Id, bossId]);

    // Task 2: Working
    const t2 = await ds.query(`
        INSERT INTO "p_Tareas" (titulo, estado, "idPlan", "idCreador", progreso, "fechaInicioPlanificada", "fechaObjetivo", "fechaEnCurso")
        VALUES ($1, $2, $3, $4, 45, '2026-01-13', '2026-01-20', NOW()) RETURNING "idTarea"
    `, ['Desarrollo de API ERP', 'En Curso', p1Id, bossId]);

    // Task 3: Blocked
    const t3 = await ds.query(`
        INSERT INTO "p_Tareas" (titulo, estado, "idPlan", "idCreador", progreso, "fechaInicioPlanificada", "fechaObjetivo")
        VALUES ($1, $2, $3, $4, 10, '2026-01-15', '2026-01-18') RETURNING "idTarea"
    `, ['Despliegue Producción', 'Pendiente', p1Id, bossId]);

    await ds.query(`
        INSERT INTO "p_Bloqueos" ("idTarea", "idOrigenUsuario", "idDestinoUsuario", motivo, "accionMitigacion", estado)
        VALUES ($1, $2, $3, $4, $5, $6)
    `, [t3[0].idTarea, juanId, bossId, 'Falta de credenciales de AWS', 'Solicitar al equipo de DevOps', 'Activo']);

    // ---------------------------------------------------------
    // SCENARIO 2: Maria (EMP002) - Overdue & Change Request
    // ---------------------------------------------------------
    const mariaId = userMap.get('EMP002')!;
    const planMaria = await ds.query(`
        INSERT INTO "p_PlanesTrabajo" (nombre, "idUsuario", mes, anio, estado, "objetivoGeneral", "idCreador")
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING "idPlan"
    `, ['Plan Enero - Maria', mariaId, 1, 2026, 'Confirmado', 'Análisis de procesos', bossId]);
    const p2Id = planMaria[0].idPlan;

    // Task 1: Overdue (End date was yesterday)
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 2);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const t4 = await ds.query(`
        INSERT INTO "p_Tareas" (titulo, estado, "idPlan", "idCreador", progreso, "fechaInicioPlanificada", "fechaObjetivo")
        VALUES ($1, $2, $3, $4, 80, '2026-01-01', $5) RETURNING "idTarea"
    `, ['Levantamiento de Requerimientos', 'En Curso', p2Id, bossId, yesterdayStr]);

    // Pending Change Request for Task 4
    await ds.query(`
        INSERT INTO "p_SolicitudCambios" ("idTarea", "idUsuarioSolicitante", "campoAfectado", "valorAnterior", "valorNuevo", motivo, estado)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [t4[0].idTarea, mariaId, 'fechaObjetivo', yesterdayStr, '2026-01-25', 'Se requiere más tiempo para entrevistar a Ventas', 'Pendiente']);

    // ---------------------------------------------------------
    // SCENARIO 3: Bradley (USR-337) - Plan in Draft (Borrador)
    // ---------------------------------------------------------
    const bradleyId = userMap.get('USR-337')!;
    await ds.query(`
        INSERT INTO "p_PlanesTrabajo" (nombre, "idUsuario", mes, anio, estado, "objetivoGeneral", "idCreador")
        VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, ['Plan Optimización DB', bradleyId, 1, 2026, 'Borrador', 'Mejorar tiempos de respuesta', bossId]);

    // ---------------------------------------------------------
    // SCENARIO 4: Ms. Brooke (USR-1991) - No Plan
    // ---------------------------------------------------------
    // (Already cleared in step 2)

    console.log('--- Configuración Finalizada ---');
    console.log('Resumen de escenarios creados para Candida (Boss):');
    console.log('1. Juan Perez (EMP001): 1 Finalizada, 1 En Curso, 1 BLOQUEADA (Ver en Dashboard/Mi Equipo)');
    console.log('2. Maria Lopez (EMP002): 1 TAREA ATRASADA, 1 Solicitud de Cambio PENDIENTE');
    console.log('3. Bradley Aldair (USR-337): Plan en BORRADOR (Pendiente de confirmar)');
    console.log('4. Ms. Brooke (USR-1991): SIN PLAN (Test de creación manual)');

    await ds.destroy();
}

run().catch(console.error);
