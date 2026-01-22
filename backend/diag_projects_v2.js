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

        const projectsQuery = `
            SELECT 
                p.idProyecto,
                p.nombre,
                p.estado,
                p.subgerencia,
                COUNT(t.idTarea) as allTasksInProject,
                COUNT(ta.idUsuario) as teamTasksInProject
            FROM p_Proyectos p
            LEFT JOIN p_Tareas t ON p.idProyecto = t.idProyecto
            LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea AND ta.idUsuario IN (${idsStr})
            GROUP BY p.idProyecto, p.nombre, p.estado, p.subgerencia
            ORDER BY teamTasksInProject DESC, p.nombre ASC
        `;

        const res = await pool.request().query(projectsQuery);
        console.log('--- START DATA ---');
        console.log(JSON.stringify(res.recordset, null, 2));
        console.log('--- END DATA ---');

    } catch (err) {
        console.error('ERROR:', err.message);
    } finally {
        if (pool) await pool.close();
    }
}

test();
