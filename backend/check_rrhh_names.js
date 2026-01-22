const sql = require('mssql');

async function run() {
    await sql.connect({
        user: 'plan',
        password: 'admin123',
        server: 'database-2.cufqs68ewpdj.us-east-1.rds.amazonaws.com',
        database: 'Bdplaner',
        options: { encrypt: true, trustServerCertificate: true }
    });

    const res = await sql.query("SELECT DISTINCT ogerencia, gerencia, subgerencia, area FROM p_Usuarios WHERE ogerencia LIKE '%RECURSOS%' OR gerencia LIKE '%RECURSOS%' OR subgerencia LIKE '%RECURSOS%' OR area LIKE '%RECURSOS%'");
    res.recordset.forEach(r => {
        console.log(`OG: [${r.ogerencia}] (len: ${r.ogerencia?.length})`);
    });

    await sql.close();
}

run().catch(e => { console.error(e); sql.close(); });
