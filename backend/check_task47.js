const sql = require('mssql');
const fs = require('fs');

const config = {
    user: 'plan',
    password: 'admin123',
    server: 'database-2.cufqs68ewpdj.us-east-1.rds.amazonaws.com',
    database: 'Bdplaner',
    options: { encrypt: true, trustServerCertificate: true }
};

async function checkTask47() {
    try {
        await sql.connect(config);
        const result = await sql.query("SELECT idTarea, nombre, porcentaje, estado FROM p_Tareas WHERE idTarea = 47");
        fs.writeFileSync('task47_debug.json', JSON.stringify(result.recordset, null, 2));
    } catch (err) {
        fs.writeFileSync('task47_error.txt', err.message);
    } finally {
        await sql.close();
    }
}
checkTask47();
