const sql = require('mssql');

async function run() {
    await sql.connect({
        user: 'plan',
        password: 'admin123',
        server: 'database-2.cufqs68ewpdj.us-east-1.rds.amazonaws.com',
        database: 'Bdplaner',
        options: { encrypt: true, trustServerCertificate: true }
    });

    console.log('=== USERS IN RRHH ACCORDING TO LIKE %RECURSOS% ===');
    const rrhh = await sql.query("SELECT carnet, nombreCompleto, ogerencia, gerencia, subgerencia FROM p_Usuarios WHERE (ogerencia LIKE '%RECURSOS%' OR gerencia LIKE '%RECURSOS%') AND activo=1");
    console.log('Total in DB:', rrhh.recordset.length);

    console.log('\n=== VISIBILITY TEST FOR JUAN ===');
    const req = new sql.Request();
    req.input('carnetSolicitante', '300042'); // Juan's carnet
    const vis = await req.execute('sp_Visibilidad_ObtenerCarnets');
    const visCarnets = new Set(vis.recordset.map(r => r.carnet));
    console.log('Total visible for Juan:', visCarnets.size);

    const matches = rrhh.recordset.filter(u => visCarnets.has(u.carnet));
    const nonMatches = rrhh.recordset.filter(u => !visCarnets.has(u.carnet));

    console.log('RRHH users VISIBLE:', matches.length);
    console.log('RRHH users NOT VISIBLE:', nonMatches.length);

    if (nonMatches.length > 0) {
        console.log('\nSample NOT VISIBLE items (first 5):');
        nonMatches.slice(0, 5).forEach(u => {
            console.log(`- ${u.nombreCompleto} | OG:[${u.ogerencia}] | G:[${u.gerencia}]`);
        });
    }

    await sql.close();
}

run().catch(e => { console.error(e); sql.close(); });
