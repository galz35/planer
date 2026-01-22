const sql = require('mssql');

const config = {
    user: 'plan',
    password: 'admin123',
    server: 'database-2.cufqs68ewpdj.us-east-1.rds.amazonaws.com',
    database: 'Bdplaner',
    options: { encrypt: true, trustServerCertificate: true }
};

async function diagnose() {
    try {
        await sql.connect(config);
        console.log('✅ Conectado.');

        const triggers = await sql.query(`
            SELECT 
                t.name AS TriggerName,
                OBJECT_NAME(t.parent_id) AS TableName,
                te.type_desc AS TriggerType
            FROM sys.triggers t
            JOIN sys.trigger_events te ON t.object_id = te.object_id
            WHERE OBJECT_NAME(t.parent_id) IN ('p_Tareas', 'p_OrganizacionNodos', 'p_Usuarios')
        `);

        console.table(triggers.recordset);

        // Ver si existen foreign keys que referencien columnas inexistentes o algo raro

    } catch (err) {
        console.error(err);
    } finally {
        await sql.close();
    }
}
diagnose();
