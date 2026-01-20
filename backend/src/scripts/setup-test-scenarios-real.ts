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
    console.log('--- Configurando Escenarios con Empleados Reales ---');

    const bossCarnet = 'USR-1353'; // Candida

    // Obtener subordinados reales de Candida
    const realSubs = await ds.query(`
        SELECT carnet, nombre_completo 
        FROM p_empleados 
        WHERE carnet_jefe1 = $1 
        ORDER BY carnet ASC 
        LIMIT 4
    `, [bossCarnet]);

    if (realSubs.length < 1) {
        console.error('No se encontraron subordinados para Candida en la tabla p_empleados.');
        await ds.destroy();
        return;
    }

    console.log(`Encontrados ${realSubs.length} subordinados reales para Candida.`);

    const userMap = new Map<string, number>();

    // Asegurar que tengan cuenta de usuario y obtener sus IDs
    for (const sub of realSubs) {
        const u = await ds.query('SELECT "idUsuario" FROM "p_Usuarios" WHERE carnet = $1', [sub.carnet]);
        if (u.length > 0) {
            userMap.set(sub.carnet, u[0].idUsuario);
        } else {
            console.log(`Creando cuenta de usuario faltante para: ${sub.nombre_completo}`);
            const insert = await ds.query(`
                INSERT INTO "p_Usuarios" (nombre, carnet, correo, activo, "rolGlobal") 
                VALUES ($1, $2, $3, true, 'User') RETURNING "idUsuario"
            `, [sub.nombre_completo, sub.carnet, `${sub.carnet.toLowerCase()}@claro.com.ni`]);
            userMap.set(sub.carnet, insert[0].idUsuario);
        }
    }

    // Boss User ID
    const bossQuery = await ds.query('SELECT "idUsuario" FROM "p_Usuarios" WHERE carnet = $1', [bossCarnet]);
    const bossId = bossQuery[0].idUsuario;

    // Limpiar datos previos de estos 4 usuarios para los escenarios
    console.log('Limpiando datos de prueba anteriores...');
    for (const sub of realSubs) {
        const userId = userMap.get(sub.carnet)!;
        await ds.query('DELETE FROM "p_Bloqueos" WHERE "idOrigenUsuario" = $1', [userId]);
        await ds.query('DELETE FROM "p_SolicitudCambios" WHERE "idUsuarioSolicitante" = $1', [userId]);
        const plans = await ds.query('SELECT "idPlan" FROM "p_PlanesTrabajo" WHERE "idUsuario" = $1', [userId]);
        for (const p of plans) {
            await ds.query('DELETE FROM "p_Tareas" WHERE "idPlan" = $1', [p.idPlan]);
        }
        await ds.query('DELETE FROM "p_PlanesTrabajo" WHERE "idUsuario" = $1', [userId]);
    }

    // --- ASIGNACIÓN DE ESCENARIOS ---

    // 1. GUSTAVO (o el primero) -> TRABAJANDO Y BLOQUEADO
    if (realSubs[0]) {
        const sub = realSubs[0];
        const userId = userMap.get(sub.carnet)!;
        console.log(`Escenario 1 (Trabajo/Bloqueo) -> ${sub.nombre_completo}`);

        const plan = await ds.query(`
            INSERT INTO "p_PlanesTrabajo" (nombre, "idUsuario", mes, anio, estado, "objetivoGeneral", "idCreador")
            VALUES ($1, $2, $3, $4, 'Confirmado', 'Optimización de Infraestructura', $5) RETURNING "idPlan"
        `, [`Plan Enero - ${sub.nombre_completo}`, userId, 1, 2026, bossId]);
        const pId = plan[0].idPlan;

        await ds.query(`INSERT INTO "p_Tareas" (titulo, estado, "idPlan", "idCreador", progreso, "fechaInicioPlanificada", "fechaObjetivo", "fechaHecha")
            VALUES ('Revisión de Inventario Hardware', 'Hecha', $1, $2, 100, '2026-01-01', '2026-01-05', NOW())`, [pId, bossId]);

        const tWorking = await ds.query(`INSERT INTO "p_Tareas" (titulo, estado, "idPlan", "idCreador", progreso, "fechaInicioPlanificada", "fechaObjetivo", "fechaEnCurso")
            VALUES ('Mantenimiento de Servidores Core', 'En Curso', $1, $2, 60, '2026-01-10', '2026-01-20', NOW()) RETURNING "idTarea"`, [pId, bossId]);

        const tBlocked = await ds.query(`INSERT INTO "p_Tareas" (titulo, estado, "idPlan", "idCreador", progreso, "fechaInicioPlanificada", "fechaObjetivo")
            VALUES ('Migración de Base de Datos SQL', 'Pendiente', $1, $2, 5, '2026-01-15', '2026-01-25') RETURNING "idTarea"`, [pId, bossId]);

        await ds.query(`INSERT INTO "p_Bloqueos" ("idTarea", "idOrigenUsuario", "idDestinoUsuario", motivo, "accionMitigacion", estado)
            VALUES ($1, $2, $3, 'Falta de espacio en el Storage central', 'Aprobar compra de discos', 'Activo')`,
            [tBlocked[0].idTarea, userId, bossId]);
    }

    // 2. SEGUNDO SUB -> TAREA ATRASADA Y SOLICITUD DE CAMBIO
    if (realSubs[1]) {
        const sub = realSubs[1];
        const userId = userMap.get(sub.carnet)!;
        console.log(`Escenario 2 (Atraso/Cambio) -> ${sub.nombre_completo}`);

        const plan = await ds.query(`
            INSERT INTO "p_PlanesTrabajo" (nombre, "idUsuario", mes, anio, estado, "objetivoGeneral", "idCreador")
            VALUES ($1, $2, $3, $4, 'Confirmado', 'Gestión de Mesa de Ayuda', $5) RETURNING "idPlan"
        `, [`Plan Soporte - ${sub.nombre_completo}`, userId, 1, 2026, bossId]);
        const pId = plan[0].idPlan;

        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 3);
        const yStr = yesterday.toISOString().split('T')[0];

        const tOverdue = await ds.query(`INSERT INTO "p_Tareas" (titulo, estado, "idPlan", "idCreador", progreso, "fechaInicioPlanificada", "fechaObjetivo")
            VALUES ('Cierre de Tickets Pendientes Diciembre', 'En Curso', $1, $2, 85, '2026-01-01', $3) RETURNING "idTarea"`,
            [pId, bossId, yStr]);

        await ds.query(`INSERT INTO "p_SolicitudCambios" ("idTarea", "idUsuarioSolicitante", "campoAfectado", "valorAnterior", "valorNuevo", motivo, estado)
            VALUES ($1, $2, 'fechaObjetivo', $3, '2026-01-30', 'Hubo un incremento inesperado de reportes por falla eléctrica', 'Pendiente')`,
            [tOverdue[0].idTarea, userId, yStr]);
    }

    // 3. TERCER SUB -> PLAN EN BORRADOR
    if (realSubs[2]) {
        const sub = realSubs[2];
        const userId = userMap.get(sub.carnet)!;
        console.log(`Escenario 3 (Borrador) -> ${sub.nombre_completo}`);

        await ds.query(`
            INSERT INTO "p_PlanesTrabajo" (nombre, "idUsuario", mes, anio, estado, "objetivoGeneral", "idCreador")
            VALUES ($1, $2, 1, 2026, 'Borrador', 'Capacitación a nuevos ingresos', $3)
        `, [`Plan Capacitación - ${sub.nombre_completo}`, userId, bossId]);
    }

    // 4. CUARTO SUB -> SIN PLAN (Solo limpiar si existe)
    if (realSubs[3]) {
        const sub = realSubs[3];
        console.log(`Escenario 4 (Sin Plan) -> ${sub.nombre_completo}`);
    }

    console.log('\n--- ESCENARIOS LISTOS CON EMPLEADOS REALES ---');
    console.table(realSubs.map((s, i) => ({
        Empleado: s.nombre_completo,
        Carnet: s.carnet,
        Escenario: i === 0 ? 'Trabajando/Bloqueado' : i === 1 ? 'Atraso/Cambio Pend.' : i === 2 ? 'Plan Borrador' : 'Sin Plan'
    })));

    await ds.destroy();
}

run().catch(console.error);
