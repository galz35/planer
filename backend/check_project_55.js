const sql = require('mssql');
const fs = require('fs');

const config = {
    user: 'plan',
    password: 'admin123',
    server: 'database-2.cufqs68ewpdj.us-east-1.rds.amazonaws.com',
    database: 'Bdplaner',
    options: { encrypt: true, trustServerCertificate: true }
};

async function checkProject55() {
    try {
        await sql.connect(config);
        const result = await sql.query("SELECT idTarea, nombre, comportamiento, estado, porcentaje, idProyecto FROM p_Tareas WHERE idProyecto = 55");
        fs.writeFileSync('project_55_tasks.json', JSON.stringify(result.recordset, null, 2));
    } catch (err) {
        fs.writeFileSync('error_55.txt', err.message);
    } finally {
        await sql.close();
    }
}
checkProject55();
