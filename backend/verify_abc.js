const sql = require('mssql');
const config = {
    user: 'plan',
    password: 'admin123',
    server: 'database-2.cufqs68ewpdj.us-east-1.rds.amazonaws.com',
    database: 'Bdplaner',
    options: { encrypt: true, trustServerCertificate: true }
};

async function verify() {
    await sql.connect(config);

    // Verificar tablas
    const tablas = await sql.query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME LIKE 'p_Tarea%' 
        ORDER BY TABLE_NAME
    `);
    console.log('TABLAS:', tablas.recordset.map(t => t.TABLE_NAME));

    // Verificar columnas nuevas en p_Tareas
    const columnas = await sql.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'p_Tareas' 
        AND COLUMN_NAME IN ('comportamiento', 'idGrupo', 'numeroParte')
    `);
    console.log('COLUMNAS NUEVAS:', columnas.recordset.map(x => x.COLUMN_NAME));

    // Verificar SPs
    const sps = await sql.query(`
        SELECT name FROM sys.procedures 
        WHERE name LIKE 'sp_%Avance%' OR name LIKE 'sp_%Grupo%' OR name LIKE 'sp_%Fase%'
    `);
    console.log('STORED PROCEDURES:', sps.recordset.map(x => x.name));

    await sql.close();
}

verify().catch(console.error);
