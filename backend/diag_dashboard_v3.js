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

        const visRes = await pool.request()
            .input('carnetSolicitante', NVarChar, carnet)
            .execute('sp_Visibilidad_ObtenerCarnets');

        const carnets = visRes.recordset.map(r => r.carnet);
        const idsRes = await pool.request()
            .query(`SELECT idUsuario FROM p_Usuarios WHERE carnet IN ('${carnets.join("','")}')`);

        const ids = idsRes.recordset.map(u => u.idUsuario);
        const idsStr = ids.join(',');

        if (ids.length === 0) return;

        console.log('--- TESTING PROJECTS QUERY ---');
        const queryProy = `
                SELECT 
                    p.idProyecto,
                    p.nombre,
                    p.estado,
                    (SELECT ISNULL(AVG(CAST(st.porcentaje AS FLOAT)), 0) FROM p_Tareas st WHERE st.idProyecto = p.idProyecto AND st.estado NOT IN ('Eliminada', 'Archivada')) as globalProgress,
                    COUNT(DISTINCT ta.idTarea) as totalTasks
                FROM p_Proyectos p
                LEFT JOIN p_Tareas t ON p.idProyecto = t.idProyecto
                LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea AND ta.idUsuario IN (${idsStr})
                GROUP BY p.idProyecto, p.nombre, p.estado, p.subgerencia, p.area, p.gerencia, p.fechaInicio, p.fechaFin
        `;
        const resProy = await pool.request().query(queryProy);
        console.log(`Proyectos: ${resProy.recordset.length}`);

        console.log('--- TESTING ALL TASKS QUERY ---');
        const queryTasks = `
                SELECT 
                    t.idTarea,
                    ISNULL(t.idProyecto, 0) as idProyecto,
                    t.nombre as titulo,
                    t.estado,
                    ISNULL(t.porcentaje, 0) as progreso,
                    u.nombre as asignado
                FROM p_Tareas t
                INNER JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea
                INNER JOIN p_Usuarios u ON ta.idUsuario = u.idUsuario
                WHERE ta.idUsuario IN (${idsStr})
                  AND t.estado NOT IN ('Eliminada', 'Archivada')
        `;
        const resTasks = await pool.request().query(queryTasks);
        console.log(`Tareas: ${resTasks.recordset.length}`);

        console.log('Summary of first 3 tasks:');
        resTasks.recordset.slice(0, 3).forEach(t => {
            console.log(`- ${t.titulo} (Proj: ${t.idProyecto}) Asignado: ${t.asignado}`);
        });

    } catch (err) {
        console.error('ERROR:', err.message);
    } finally {
        if (pool) await pool.close();
    }
}

test();
