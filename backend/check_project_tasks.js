const sql = require('mssql');
const fs = require('fs');

const config = {
    user: 'plan',
    password: 'admin123',
    server: 'database-2.cufqs68ewpdj.us-east-1.rds.amazonaws.com',
    database: 'Bdplaner',
    options: { encrypt: true, trustServerCertificate: true }
};

async function checkProjectTasks() {
    try {
        await sql.connect(config);
        const result = await sql.query(`
            SELECT 
                t.idTarea, t.nombre as titulo, t.porcentaje as progreso, t.comportamiento
            FROM p_Tareas t
            WHERE t.idProyecto = 55
            ORDER BY t.idTarea
        `);
        fs.writeFileSync('project_tasks_check.json', JSON.stringify(result.recordset, null, 2));
    } catch (err) {
        fs.writeFileSync('project_tasks_error.txt', err.message);
    } finally {
        await sql.close();
    }
}
checkProjectTasks();
