const sql = require('mssql');
const fs = require('fs');

const config = {
    user: 'plan',
    password: 'admin123',
    server: 'database-2.cufqs68ewpdj.us-east-1.rds.amazonaws.com',
    database: 'Bdplaner',
    options: { encrypt: true, trustServerCertificate: true }
};

async function checkAdvances() {
    try {
        await sql.connect(config);
        const result = await sql.query("SELECT * FROM p_TareaAvanceMensual ORDER BY fechaActualizacion DESC");
        fs.writeFileSync('advances_debug.json', JSON.stringify(result.recordset, null, 2));
    } catch (err) {
        fs.writeFileSync('advances_error.txt', err.message);
    } finally {
        await sql.close();
    }
}
checkAdvances();
