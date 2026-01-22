const sql = require('mssql');

async function run() {
    await sql.connect({
        user: 'plan',
        password: 'admin123',
        server: 'database-2.cufqs68ewpdj.us-east-1.rds.amazonaws.com',
        database: 'Bdplaner',
        options: { encrypt: true, trustServerCertificate: true }
    });

    // 1. Ver permisos
    console.log('=== PERMISOS DE AREA ===');
    const p = await sql.query("SELECT id, carnet_recibe, nombre_area, tipo_nivel FROM p_permiso_area WHERE activo=1");
    p.recordset.forEach(r => console.log(`ID:${r.id} | ${r.carnet_recibe} => ${r.nombre_area} (${r.tipo_nivel})`));

    // 2. Carnet de juan
    const ju = await sql.query("SELECT carnet FROM p_Usuarios WHERE correo='juan.ortuno@claro.com.ni'");
    const carnet = ju.recordset[0]?.carnet;
    console.log('\n=== JUAN ORTUNO ===');
    console.log('Carnet:', carnet);

    if (carnet) {
        // 3. Test SP
        const req = new sql.Request();
        req.input('carnetSolicitante', carnet);
        const vis = await req.execute('sp_Visibilidad_ObtenerCarnets');
        console.log('Carnets visibles:', vis.recordset.length);

        // 4. Cuantos de RRHH
        const rrhh = await sql.query("SELECT COUNT(*) as cnt FROM p_Usuarios WHERE ogerencia='NI GERENCIA DE RECURSOS HUMANOS' AND activo=1");
        console.log('Total empleados RRHH:', rrhh.recordset[0].cnt);

        // 5. Cuantos de RRHH estan en la lista visible
        const visCarnets = vis.recordset.map(r => `'${r.carnet}'`).join(',');
        if (visCarnets) {
            const match = await sql.query(`SELECT COUNT(*) as cnt FROM p_Usuarios WHERE ogerencia='NI GERENCIA DE RECURSOS HUMANOS' AND carnet IN (${visCarnets})`);
            console.log('Empleados RRHH visibles para Juan:', match.recordset[0].cnt);
        }
    }

    await sql.close();
}

run().catch(e => { console.error(e.message); sql.close(); });
