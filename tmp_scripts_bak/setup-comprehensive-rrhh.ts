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
    console.log('--- Iniciando Configuración de Escenarios Masivos de RRHH ---');

    // Data gathered from CSV analysis
    const people = [
        { carnet: '300042', nombre: 'JUAN CARLOS ORTUÑO PADILLA', correo: 'juan.ortuno@claro.com.ni', cargo: 'GERENTE GENERAL RRHH' },
        { carnet: '772', nombre: 'CANDIDA JAZMINA SANCHEZ LOPEZ', correo: 'candida.sanchez@claro.com.ni', cargo: 'COORDINADOR SOPORTE A LA OPERACION' },
        { carnet: '500708', nombre: 'GUSTAVO ADOLFO LIRA SALAZAR', correo: 'gustavo.lira@claro.com.ni', cargo: 'ANALISTA DE SOPORTE RH' },
        { carnet: '1005898', nombre: 'TANIA AUXILIADORA AGUIRRE AGUILAR', correo: 'taniaa.aguirre@claro.com.ni', cargo: 'ESPECIALISTA RECURSOS HUMANOS B' },
        { carnet: '666', nombre: 'SCARLETH VANESSA VIVAS PEREZ', correo: 'scarleth.vivas@claro.com.ni', cargo: 'ESPECIALISTA RECURSOS HUMANOS A' },
        { carnet: '400850', nombre: 'SERGIO ALEXANDER MARTINEZ ESPINOZA', correo: 'sergio.martinez@claro.com.ni', cargo: 'SUBGERENTE CAPACITACION Y DESARROLLO' }
    ];

    const userMap = new Map();
    for (const p of people) {
        // Ensure user exists
        const u = await ds.query('SELECT "idUsuario" FROM "p_Usuarios" WHERE carnet = $1', [p.carnet]);
        let userId;
        if (u.length > 0) {
            userId = u[0].idUsuario;
            await ds.query('UPDATE "p_Usuarios" SET nombre = $1, correo = $2, activo = true WHERE "idUsuario" = $3', [p.nombre, p.correo, userId]);
        } else {
            const ins = await ds.query('INSERT INTO "p_Usuarios" (nombre, carnet, correo, activo, "rolGlobal") VALUES ($1, $2, $3, true, $4) RETURNING "idUsuario"',
                [p.nombre, p.carnet, p.correo, p.carnet === '300042' ? 'Admin' : 'User']);
            userId = ins[0].idUsuario;
        }
        userMap.set(p.carnet, userId);

        // Clear existing test data for these users
        await ds.query('DELETE FROM "p_Bloqueos" WHERE "idOrigenUsuario" = $1 OR "idDestinoUsuario" = $1', [userId]);
        await ds.query('DELETE FROM "p_SolicitudCambios" WHERE "idUsuarioSolicitante" = $1 OR "idAprobador" = $1', [userId]);

        const plans = await ds.query('SELECT "idPlan" FROM "p_PlanesTrabajo" WHERE "idUsuario" = $1', [userId]);
        for (const pPlan of plans) {
            await ds.query('DELETE FROM "p_Tareas" WHERE "idPlan" = $1', [pPlan.idPlan]);
        }
        await ds.query('DELETE FROM "p_PlanesTrabajo" WHERE "idUsuario" = $1', [userId]);

        // Delete tasks with no plan for these users
        // (Wait, we need to find them first. Tarea doesn't have idUsuario directly usually, 
        // it has asignados. Let's look at p_TareaAsignados)
        const assignments = await ds.query('SELECT "idTarea" FROM "p_TareaAsignados" WHERE "idUsuario" = $1', [userId]);
        for (const a of assignments) {
            // Optional: delete or keep. For clean state, let's delete them if they don't have a plan
            await ds.query('DELETE FROM "p_Tareas" WHERE "idTarea" = $1 AND "idPlan" IS NULL', [a.idTarea]);
        }
        await ds.query('DELETE FROM "p_TareaAsignados" WHERE "idUsuario" = $1', [userId]);
    }

    const oId = userMap.get('300042');
    const cId = userMap.get('772');
    const gId = userMap.get('500708');
    const tId = userMap.get('1005898');
    const sId = userMap.get('666');

    // ---------------------------------------------------------
    // PLAN COMPARTIDO: Ortuño (Boss) + Tania
    // ---------------------------------------------------------
    const planShared = await ds.query(`
        INSERT INTO "p_PlanesTrabajo" (nombre, "idUsuario", mes, anio, estado, "objetivoGeneral", "idCreador")
        VALUES ($1, $2, 1, 2026, 'Confirmado', 'Modernización de Procesos de Selección', $3) RETURNING "idPlan"
    `, ['Plan Estratégico Selección', oId, oId]);
    const psId = planShared[0].idPlan;

    // Tarea Estratégica para Ortuño (Shared Plan)
    const tEstrat = await ds.query(`
        INSERT INTO "p_Tareas" (titulo, estado, "idPlan", "idCreador", progreso, tipo, prioridad, "fechaInicioPlanificada", "fechaObjetivo")
        VALUES ($1, $2, $3, $4, 20, 'Estrategica', 'Alta', '2026-01-01', '2026-01-30') RETURNING "idTarea"
    `, ['Definición de Lineamientos 2026', 'En Curso', psId, oId]);
    await ds.query('INSERT INTO "p_TareaAsignados" ("idTarea", "idUsuario") VALUES ($1, $2)', [tEstrat[0].idTarea, oId]);

    // Tarea para Tania en el mismo plan (Compartido)
    const tTania = await ds.query(`
        INSERT INTO "p_Tareas" (titulo, estado, "idPlan", "idCreador", progreso, tipo, prioridad, "fechaInicioPlanificada", "fechaObjetivo")
        VALUES ($1, $2, $3, $4, 0, 'Administrativa', 'Media', '2026-01-05', '2026-01-15') RETURNING "idTarea"
    `, ['Publicación de vacantes críticas', 'Pendiente', psId, oId]);
    await ds.query('INSERT INTO "p_TareaAsignados" ("idTarea", "idUsuario") VALUES ($1, $2)', [tTania[0].idTarea, tId]);

    // ---------------------------------------------------------
    // PLAN INDIVIDUAL: Candida
    // ---------------------------------------------------------
    const planCandida = await ds.query(`
        INSERT INTO "p_PlanesTrabajo" (nombre, "idUsuario", mes, anio, estado, "objetivoGeneral", "idCreador")
        VALUES ($1, $2, 1, 2026, 'Confirmado', 'Soporte Operativo RH', $3) RETURNING "idPlan"
    `, ['Individual Soporte - Candida', cId, oId]);
    const pcId = planCandida[0].idPlan;

    // Tarea Bloqueada (Candida)
    const tBlock = await ds.query(`
        INSERT INTO "p_Tareas" (titulo, estado, "idPlan", "idCreador", progreso, tipo, "fechaInicioPlanificada", "fechaObjetivo")
        VALUES ($1, $2, $3, $4, 5, 'Administrativa', '2026-01-10', '2026-01-15') RETURNING "idTarea"
    `, ['Actualización de Pólizas Seguros', 'Pendiente', pcId, oId]);
    await ds.query('INSERT INTO "p_TareaAsignados" ("idTarea", "idUsuario") VALUES ($1, $2)', [tBlock[0].idTarea, cId]);
    await ds.query(`
        INSERT INTO "p_Bloqueos" ("idTarea", "idOrigenUsuario", "idDestinoUsuario", motivo, "accionMitigacion", estado)
        VALUES ($1, $2, $3, 'Falta firma del Gerente General', 'Escalar a Gerencia', 'Activo')
    `, [tBlock[0].idTarea, cId, oId]);

    // Tarea Atrasada (Candida)
    const tOver = await ds.query(`
        INSERT INTO "p_Tareas" (titulo, estado, "idPlan", "idCreador", progreso, tipo, "fechaInicioPlanificada", "fechaObjetivo")
        VALUES ($1, $2, $3, $4, 80, 'Logistica', '2026-01-01', '2026-01-13') RETURNING "idTarea"
    `, ['Entrega de Carnets Nuevos', 'En Curso', pcId, oId]);
    await ds.query('INSERT INTO "p_TareaAsignados" ("idTarea", "idUsuario") VALUES ($1, $2)', [tOver[0].idTarea, cId]);

    // ---------------------------------------------------------
    // PLAN BORRADOR: Scarleth
    // ---------------------------------------------------------
    await ds.query(`
        INSERT INTO "p_PlanesTrabajo" (nombre, "idUsuario", mes, anio, estado, "objetivoGeneral", "idCreador")
        VALUES ($1, $2, 1, 2026, 'Borrador', 'Requerimientos Bienestar Laboral', $3)
    `, ['Plan Bienestar - Scarleth', sId, oId]);

    // ---------------------------------------------------------
    // TAREAS SIN PLAN (MI AGENDA): Gustavo
    // ---------------------------------------------------------
    // Tarea AMX
    const tAMX = await ds.query(`
        INSERT INTO "p_Tareas" (titulo, estado, "idPlan", "idCreador", progreso, tipo, prioridad, "fechaInicioPlanificada")
        VALUES ($1, $2, NULL, $3, 10, 'AMX', 'Alta', NOW()) RETURNING "idTarea"
    `, ['Atención Solicitud Corporativa AMX', 'En Curso', gId]);
    await ds.query('INSERT INTO "p_TareaAsignados" ("idTarea", "idUsuario") VALUES ($1, $2)', [tAMX[0].idTarea, gId]);

    // Tarea Logística
    const tLog = await ds.query(`
        INSERT INTO "p_Tareas" (titulo, estado, "idPlan", "idCreador", progreso, tipo, prioridad, "fechaInicioPlanificada")
        VALUES ($1, $2, NULL, $3, 0, 'Logistica', 'Media', NOW()) RETURNING "idTarea"
    `, ['Envío de papelería a sucursales', 'Pendiente', gId]);
    await ds.query('INSERT INTO "p_TareaAsignados" ("idTarea", "idUsuario") VALUES ($1, $2)', [tLog[0].idTarea, gId]);

    // Tarea Importante (en Agenda de Ortuño)
    const tImport = await ds.query(`
        INSERT INTO "p_Tareas" (titulo, estado, "idPlan", "idCreador", progreso, tipo, prioridad, "fechaInicioPlanificada")
        VALUES ($1, $2, NULL, $3, 50, 'Administrativa', 'Urgente', NOW()) RETURNING "idTarea"
    `, ['Revisión Presupuesto Anual (Fuera de Plan)', 'En Curso', oId]);
    await ds.query('INSERT INTO "p_TareaAsignados" ("idTarea", "idUsuario") VALUES ($1, $2)', [tImport[0].idTarea, oId]);

    console.log('--- Configuración Masiva RRHH Finalizada ---');
    console.log('Usuarios listos para login:');
    console.log('- Ortuño (300042): Admin. Tiene: Plan compartido, tareas fuera de plan (Agenda).');
    console.log('- Candida (772): User. Tiene: Plan individual, 1 BLOQUEO, 1 ATRASADA.');
    console.log('- Gustavo (500708): User. Tiene: Tareas SIN PLAN (Agenda): AMX, Logística.');
    console.log('- Tania (1005898): User. Tiene: Tareas Estratégicas en plan compartido con Ortuño.');
    console.log('- Scarleth (666): User. Tiene: Plan en BORRADOR.');
    console.log('- Sergio (400850): User. SIN PLAN (Para prueba de creación manual).');

    await ds.destroy();
}

run().catch(console.error);
