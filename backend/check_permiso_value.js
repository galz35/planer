const sql = require('mssql');

async function run() {
    await sql.connect({
        user: 'plan',
        password: 'admin123',
        server: 'database-2.cufqs68ewpdj.us-east-1.rds.amazonaws.com',
        database: 'Bdplaner',
        options: { encrypt: true, trustServerCertificate: true }
    });

    const res = await sql.query("SELECT id, carnet_recibe, nombre_area, len(nombre_area) as length FROM p_permiso_area WHERE carnet_recibe='300042'");
    console.log(JSON.stringify(res.recordset, null, 2));

    await sql.close();
}

run().catch(e => { console.error(e); sql.close(); });
