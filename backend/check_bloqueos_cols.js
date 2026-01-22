const sql = require('mssql');
const fs = require('fs');

const config = {
    user: 'plan',
    password: 'admin123',
    server: 'database-2.cufqs68ewpdj.us-east-1.rds.amazonaws.com',
    database: 'Bdplaner',
    options: { encrypt: true, trustServerCertificate: true }
};

async function checkBloqueosCols() {
    try {
        await sql.connect(config);
        const result = await sql.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'p_Bloqueos'");
        fs.writeFileSync('bloqueos_cols.json', JSON.stringify(result.recordset, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await sql.close();
    }
}
checkBloqueosCols();
