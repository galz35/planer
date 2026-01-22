const sql = require('mssql');

async function run() {
    await sql.connect({
        user: 'plan',
        password: 'admin123',
        server: 'database-2.cufqs68ewpdj.us-east-1.rds.amazonaws.com',
        database: 'Bdplaner',
        options: { encrypt: true, trustServerCertificate: true }
    });

    const res = await sql.query("SELECT * FROM p_permiso_area");
    console.log('Total permisos area:', res.recordset.length);
    res.recordset.forEach(r => {
        console.log(`ID:${r.id} | Recibe:${r.carnet_recibe} | Area:[${r.nombre_area}] | Activo:${r.activo}`);
    });

    const resU = await sql.query("SELECT idUsuario, carnet, correo FROM p_Usuarios WHERE correo = 'juan.ortuno@claro.com.ni'");
    console.log('\nUser Juan:', JSON.stringify(resU.recordset, null, 2));

    await sql.close();
}

run().catch(e => { console.error(e); sql.close(); });
