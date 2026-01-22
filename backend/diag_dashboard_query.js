const { ConnectionPool, Int, NVarChar } = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    server: process.env.MSSQL_HOST,
    database: process.env.MSSQL_DATABASE,
    port: parseInt(process.env.MSSQL_PORT),
    options: {
        encrypt: process.env.MSSQL_ENCRYPT === 'true',
        trustServerCertificate: process.env.MSSQL_TRUST_CERT === 'true'
    }
};

async function test() {
    let pool;
    try {
        pool = await new ConnectionPool(config).connect();
        const carnet = '300042';

        console.log('1. Obteniendo carnets visibles...');
        const visRes = await pool.request()
            .input('carnetSolicitante', NVarChar, carnet)
            .execute('sp_Visibilidad_ObtenerCarnets');

        const carnets = visRes.recordset.map(r => r.carnet);
        console.log(`Carnets encontrados: ${carnets.length}`);

        console.log('2. Obteniendo IDs de usuarios...');
        const idsRes = await pool.request()
            .query(`SELECT idUsuario FROM p_Usuarios WHERE carnet IN ('${carnets.join("','")}')`);

        const ids = idsRes.recordset.map(u => u.idUsuario);
        const idsStr = ids.join(',');
        console.log(`IDs encontrados: ${ids.length}`);

        if (ids.length === 0) {
            console.error('ERROR: No se encontraron IDs de usuario para los carnets.');
            return;
        }

        console.log('3. Ejecutando query de proyectos del AnalyticsService...');
        const queryRaw = `
                -- First part: All formal projects
                SELECT 
                    p.idProyecto,
                    p.nombre,
                    p.estado,
                    (SELECT ISNULL(AVG(CAST(st.porcentaje AS FLOAT)), 0) FROM p_Tareas st WHERE st.idProyecto = p.idProyecto AND st.estado NOT IN ('Eliminada', 'Archivada')) as globalProgress,
                    ISNULL(p.subgerencia, 'General') as subgerencia,
                    ISNULL(p.area, '') as area,
                    ISNULL(p.gerencia, '') as gerencia,
                    p.fechaInicio,
                    p.fechaFin,
                    -- Count only tasks assigned to our team
                    COUNT(DISTINCT ta.idTarea) as totalTasks,
                    ISNULL(SUM(CASE WHEN t.estado = 'Hecha' AND ta.idUsuario IS NOT NULL THEN 1 ELSE 0 END), 0) as hechas,
                    ISNULL(SUM(CASE WHEN t.estado = 'EnCurso' AND ta.idUsuario IS NOT NULL THEN 1 ELSE 0 END), 0) as enCurso,
                    ISNULL(SUM(CASE WHEN t.estado = 'Pendiente' AND ta.idUsuario IS NOT NULL THEN 1 ELSE 0 END), 0) as pendientes,
                    ISNULL(SUM(CASE WHEN t.estado = 'Bloqueada' AND ta.idUsuario IS NOT NULL THEN 1 ELSE 0 END), 0) as bloqueadas,
                    ISNULL(SUM(CASE WHEN t.estado IN ('Pendiente', 'EnCurso') AND ta.idUsuario IS NOT NULL AND CAST(t.fechaObjetivo AS DATE) < CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END), 0) as atrasadas
                FROM p_Proyectos p
                LEFT JOIN p_Tareas t ON p.idProyecto = t.idProyecto
                LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea AND ta.idUsuario IN (${idsStr})
                GROUP BY p.idProyecto, p.nombre, p.estado, p.subgerencia, p.area, p.gerencia, p.fechaInicio, p.fechaFin

                UNION ALL

                -- Second part: Tasks without project (managed as a pseudo-project)
                SELECT 
                    0 as idProyecto,
                    'Tareas Sin Proyecto' as nombre,
                    'Activo' as estado,
                    0 as globalProgress,
                    'General' as subgerencia,
                    '' as area,
                    '' as gerencia,
                    NULL as fechaInicio,
                    NULL as fechaFin,
                    COUNT(DISTINCT t.idTarea) as totalTasks,
                    ISNULL(SUM(CASE WHEN t.estado = 'Hecha' THEN 1 ELSE 0 END), 0) as hechas,
                    ISNULL(SUM(CASE WHEN t.estado = 'EnCurso' THEN 1 ELSE 0 END), 0) as enCurso,
                    ISNULL(SUM(CASE WHEN t.estado = 'Pendiente' THEN 1 ELSE 0 END), 0) as pendientes,
                    ISNULL(SUM(CASE WHEN t.estado = 'Bloqueada' THEN 1 ELSE 0 END), 0) as bloqueadas,
                    ISNULL(SUM(CASE WHEN t.estado IN ('Pendiente', 'EnCurso') AND CAST(t.fechaObjetivo AS DATE) < CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END), 0) as atrasadas
                FROM p_Tareas t
                INNER JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea
                WHERE (t.idProyecto IS NULL OR t.idProyecto = 0)
                  AND ta.idUsuario IN (${idsStr})
                  AND t.estado NOT IN ('Eliminada', 'Archivada')
                HAVING COUNT(t.idTarea) > 0

                ORDER BY nombre
        `;

        const res = await pool.request().query(queryRaw);
        console.log(`Proyectos encontrados: ${res.recordset.length}`);
        console.table(res.recordset);

    } catch (err) {
        console.error('ERROR:', err.message);
    } finally {
        if (pool) await pool.close();
    }
}

test();
