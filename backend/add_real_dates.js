const sql = require('mssql');
const config = {
    user: 'plan',
    password: 'admin123',
    server: 'database-2.cufqs68ewpdj.us-east-1.rds.amazonaws.com',
    database: 'Bdplaner',
    options: { encrypt: true, trustServerCertificate: true }
};

async function run() {
    await sql.connect(config);

    // Agregar columnas fechaInicioReal y fechaFinReal si no existen
    await sql.query(`
        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('p_Tareas') AND name = 'fechaInicioReal')
            ALTER TABLE p_Tareas ADD fechaInicioReal DATETIME NULL;
        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('p_Tareas') AND name = 'fechaFinReal')
            ALTER TABLE p_Tareas ADD fechaFinReal DATETIME NULL;
    `);

    console.log('Columnas fechaInicioReal y fechaFinReal agregadas a p_Tareas');
    await sql.close();
}

run().catch(e => { console.error(e); process.exit(1); });
