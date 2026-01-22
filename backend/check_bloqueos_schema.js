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

        console.log('--- Tables like %Bloqueo% ---');
        const q1 = await sql.query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE '%Bloqueo%'");
        q1.recordset.forEach(r => console.log(r.TABLE_NAME));

        console.log('\n--- Columns in p_Bloqueos ---');
        const q2 = await sql.query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'p_Bloqueos'");
        q2.recordset.forEach(r => console.log(`${r.COLUMN_NAME} (${r.DATA_TYPE})`));

        await sql.close();
    } catch (err) {
        console.error('Error:', err);
    }
}

run();
