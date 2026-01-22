const sql = require('mssql');

async function run() {
    await sql.connect({
        user: 'plan',
        password: 'admin123',
        server: 'database-2.cufqs68ewpdj.us-east-1.rds.amazonaws.com',
        database: 'Bdplaner',
        options: { encrypt: true, trustServerCertificate: true }
    });

    const carnetJuan = '300042';

    // Simular sp_Visibilidad_ObtenerCarnets
    const req = new sql.Request();
    req.input('carnetSolicitante', carnetJuan);
    const vis = await req.execute('sp_Visibilidad_ObtenerCarnets');
    const carnets = vis.recordset.map(r => r.carnet);

    console.log('Total carnets returned by SP:', carnets.length);

    // Simular obtenerDetallesUsuarios
    const csv = carnets.join(',');
    const details = await sql.query(`
        SELECT u.idUsuario, u.carnet, u.nombreCompleto
        FROM p_Usuarios u
        WHERE u.carnet IN (SELECT value FROM STRING_SPLIT('${csv}', ','))
    `);

    console.log('Total users with details:', details.recordset.length);

    // Contar cuantos son de RRHH
    const rrhhCount = await sql.query(`
        SELECT COUNT(*) as cnt FROM p_Usuarios 
        WHERE ogerencia = 'NI GERENCIA DE RECURSOS HUMANOS' 
        AND carnet IN (SELECT value FROM STRING_SPLIT('${csv}', ','))
    `);
    console.log('RRHH users in details:', rrhhCount.recordset[0].cnt);

    await sql.close();
}

run().catch(e => { console.error(e); sql.close(); });
