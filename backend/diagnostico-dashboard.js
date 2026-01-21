// Diagnóstico de Dashboard - Fase 1
const { Client } = require('pg');

async function diagnostico() {
    const client = new Client({
        host: 'aws-0-us-west-2.pooler.supabase.com',
        port: 6543,
        user: 'postgres.ddmeodlpdxgmadduwdas',
        password: '92li!ra$Gu2',
        database: 'postgres',
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Conectado a la base de datos\n');

        // 1. Verificar usuario juan.ortuno
        console.log('═══════════════════════════════════════════════════════════');
        console.log('1. USUARIO JUAN.ORTUNO');
        console.log('═══════════════════════════════════════════════════════════');
        const userJuan = await client.query(`
            SELECT "idUsuario", nombre, correo, carnet, "jefeCarnet", "rolGlobal", cargo, departamento, activo
            FROM "p_Usuarios" 
            WHERE correo = 'juan.ortuno@claro.com.ni'
        `);
        console.table(userJuan.rows);

        // 2. Verificar proyectos activos
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('2. PROYECTOS ACTIVOS');
        console.log('═══════════════════════════════════════════════════════════');
        const proyectos = await client.query(`
            SELECT "idProyecto", nombre, estado, tipo, gerencia, subgerencia
            FROM "p_Proyectos" 
            WHERE estado = 'Activo'
            LIMIT 20
        `);
        console.log(`Total proyectos con estado='Activo': ${proyectos.rowCount}`);
        console.table(proyectos.rows);

        // 3. Verificar todos los estados de proyectos
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('3. DISTRIBUCIÓN DE ESTADOS DE PROYECTOS');
        console.log('═══════════════════════════════════════════════════════════');
        const estadosProyectos = await client.query(`
            SELECT estado, COUNT(*) as cantidad
            FROM "p_Proyectos" 
            GROUP BY estado
        `);
        console.table(estadosProyectos.rows);

        // 4. Verificar tareas en enero 2026
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('4. TAREAS CON FECHA OBJETIVO EN ENERO 2026');
        console.log('═══════════════════════════════════════════════════════════');
        const tareasEnero = await client.query(`
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN estado = 'Hecha' THEN 1 ELSE 0 END) as hechas,
                   SUM(CASE WHEN estado = 'EnCurso' THEN 1 ELSE 0 END) as en_curso,
                   SUM(CASE WHEN estado = 'Pendiente' THEN 1 ELSE 0 END) as pendientes,
                   SUM(CASE WHEN "fechaObjetivo"::date < CURRENT_DATE AND estado NOT IN ('Hecha', 'Descartada') THEN 1 ELSE 0 END) as atrasadas
            FROM "p_Tareas" 
            WHERE "fechaObjetivo" >= '2026-01-01' AND "fechaObjetivo" < '2026-02-01'
        `);
        console.table(tareasEnero.rows);

        // 5. Verificar planes de trabajo enero 2026
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('5. PLANES DE TRABAJO ENERO 2026');
        console.log('═══════════════════════════════════════════════════════════');
        const planes = await client.query(`
            SELECT estado, COUNT(*) as cantidad
            FROM "p_PlanesTrabajo" 
            WHERE mes = 1 AND anio = 2026
            GROUP BY estado
        `);
        console.table(planes.rows);

        // 6. Subordinados de juan.ortuno (si es jefe)
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('6. SUBORDINADOS DIRECTOS DE JUAN.ORTUNO');
        console.log('═══════════════════════════════════════════════════════════');
        const subordinados = await client.query(`
            SELECT "idUsuario", nombre, correo, cargo
            FROM "p_Usuarios" 
            WHERE "jefeCarnet" = (SELECT carnet FROM "p_Usuarios" WHERE correo = 'juan.ortuno@claro.com.ni')
            AND activo = true
        `);
        console.log(`Subordinados directos: ${subordinados.rowCount}`);
        if (subordinados.rowCount > 0) {
            console.table(subordinados.rows);
        }

        // 7. Verificar tareas que vencen HOY
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('7. TAREAS QUE VENCEN HOY');
        console.log('═══════════════════════════════════════════════════════════');
        const tareasHoy = await client.query(`
            SELECT t."idTarea", t.titulo, t.estado, t."fechaObjetivo", p.nombre as proyecto
            FROM "p_Tareas" t
            LEFT JOIN "p_Proyectos" p ON t."idProyecto" = p."idProyecto"
            WHERE t."fechaObjetivo"::date = CURRENT_DATE
            LIMIT 20
        `);
        console.log(`Tareas con vencimiento hoy: ${tareasHoy.rowCount}`);
        if (tareasHoy.rowCount > 0) {
            console.table(tareasHoy.rows);
        }

        // 8. Verificar tareas ATRASADAS
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('8. TAREAS ATRASADAS (Top 20)');
        console.log('═══════════════════════════════════════════════════════════');
        const atrasadas = await client.query(`
            SELECT t."idTarea", t.titulo, t.estado, t."fechaObjetivo", 
                   p.nombre as proyecto,
                   CURRENT_DATE - t."fechaObjetivo"::date as dias_atraso
            FROM "p_Tareas" t
            LEFT JOIN "p_Proyectos" p ON t."idProyecto" = p."idProyecto"
            WHERE t."fechaObjetivo"::date < CURRENT_DATE
            AND t.estado NOT IN ('Hecha', 'Descartada')
            ORDER BY t."fechaObjetivo" ASC
            LIMIT 20
        `);
        console.log(`Total tareas atrasadas: ${atrasadas.rowCount}`);
        if (atrasadas.rowCount > 0) {
            console.table(atrasadas.rows);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
    }
}

diagnostico();
