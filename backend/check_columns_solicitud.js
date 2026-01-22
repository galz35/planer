const sql = require('mssql');

async function run() {
    await sql.connect({
        user: 'plan',
        password: 'admin123',
        server: 'database-2.cufqs68ewpdj.us-east-1.rds.amazonaws.com',
        database: 'Bdplaner',
        options: { encrypt: true, trustServerCertificate: true }
    });

    console.log('--- Columnas de p_SolicitudCambios ---');
    const cols = await sql.query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'p_SolicitudCambios'");
    console.log(JSON.stringify(cols.recordset, null, 2));

    await sql.close();
}

run().catch(e => { console.error(e); sql.close(); });
