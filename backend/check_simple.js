const sql = require('mssql');
const fs = require('fs');

const config = {
    user: 'plan',
    password: 'admin123',
    server: 'database-2.cufqs68ewpdj.us-east-1.rds.amazonaws.com',
    database: 'Bdplaner',
    options: { encrypt: true, trustServerCertificate: true }
};

async function checkLongTasks() {
    try {
        await sql.connect(config);
        const result = await sql.query("SELECT idTarea, nombre, comportamiento, estado, porcentaje FROM p_Tareas WHERE comportamiento = 'LARGA'");
        fs.writeFileSync('long_tasks.json', JSON.stringify(result.recordset, null, 2));
    } catch (err) {
        fs.writeFileSync('long_tasks_error.txt', err.message);
    } finally {
        await sql.close();
    }
}
checkLongTasks();
