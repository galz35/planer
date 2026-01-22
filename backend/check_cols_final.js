const sql = require('mssql');

async function run() {
    try {
        await sql.connect({
            user: 'plan',
            password: 'admin123',
            server: 'database-2.cufqs68ewpdj.us-east-1.rds.amazonaws.com',
            database: 'Bdplaner',
            options: { encrypt: true, trustServerCertificate: true }
        });

        console.log('--- COLUMNAS DE p_SolicitudCambios ---');
        const r = await sql.query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'p_SolicitudCambios'");
        r.recordset.forEach(c => console.log(`${c.COLUMN_NAME} (${c.DATA_TYPE})`));

        await sql.close();
    } catch (err) {
        console.error('Error:', err);
    }
}

run();
