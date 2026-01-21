// Diagnóstico de Asignaciones de Tareas
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
        console.log('✅ Conectado\n');

        // 1. Total de asignaciones
        console.log('═══════════════════════════════════════════════════════════');
        console.log('1. TOTAL ASIGNACIONES EN p_TareasAsignados');
        console.log('═══════════════════════════════════════════════════════════');
        const totalAsig = await client.query('SELECT COUNT(*) as total FROM "p_TareaAsignados"');
        console.log('Total asignaciones:', totalAsig.rows[0].total);

        // 2. Proyectos y sus tareas
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('2. PROYECTOS ACTIVOS Y SUS TAREAS');
        console.log('═══════════════════════════════════════════════════════════');
        const proyTareas = await client.query(`
            SELECT p."idProyecto", p.nombre, COUNT(t."idTarea") as total_tareas
            FROM "p_Proyectos" p
            LEFT JOIN "p_Tareas" t ON t."idProyecto" = p."idProyecto"
            WHERE p.estado = 'Activo'
            GROUP BY p."idProyecto", p.nombre
        `);
        console.table(proyTareas.rows);

        // 3. Tareas con asignados
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('3. TAREAS CON ASIGNADOS (primeras 20)');
        console.log('═══════════════════════════════════════════════════════════');
        const tareasAsig = await client.query(`
            SELECT t."idTarea", SUBSTRING(t.titulo, 1, 40) as titulo, 
                   ta."idUsuario", u.nombre as asignado_a
            FROM "p_Tareas" t
            JOIN "p_TareaAsignados" ta ON ta."idTarea" = t."idTarea"
            JOIN "p_Usuarios" u ON u."idUsuario" = ta."idUsuario"
            LIMIT 20
        `);
        if (tareasAsig.rowCount > 0) {
            console.table(tareasAsig.rows);
        } else {
            console.log('⚠️ NO HAY TAREAS ASIGNADAS - Esto explica el problema');
        }

        // 4. Gerencias de proyectos
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('4. GERENCIAS/SUBGERENCIAS DE PROYECTOS ACTIVOS');
        console.log('═══════════════════════════════════════════════════════════');
        const gerencias = await client.query(`
            SELECT DISTINCT gerencia, subgerencia
            FROM "p_Proyectos" 
            WHERE estado = 'Activo'
        `);
        console.table(gerencias.rows);

        // 5. Departamentos de usuarios visibles para Juan
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('5. DEPARTAMENTOS DE SUBORDINADOS DE JUAN');
        console.log('═══════════════════════════════════════════════════════════');
        const deptSubord = await client.query(`
            SELECT DISTINCT departamento, cargo
            FROM "p_Usuarios" 
            WHERE "jefeCarnet" = '300042'
            AND activo = true
        `);
        console.table(deptSubord.rows);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
    }
}

diagnostico();
