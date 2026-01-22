const sql = require('mssql');
const config = {
    user: 'plan',
    password: 'admin123',
    server: 'database-2.cufqs68ewpdj.us-east-1.rds.amazonaws.com',
    database: 'Bdplaner',
    options: { encrypt: true, trustServerCertificate: true }
};

async function check() {
    await sql.connect(config);
    const r = await sql.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME='p_Tareas' AND COLUMN_NAME='idCreador'
    `);
    console.log('idCreador in p_Tareas:', r.recordset.length > 0 ? 'YES' : 'NO');

    // También verificar la columna nombre
    const r2 = await sql.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME='p_Tareas'
        ORDER BY ORDINAL_POSITION
    `);
    console.log('\\nColumnas de p_Tareas:', r2.recordset.map(c => c.COLUMN_NAME).join(', '));

    await sql.close();
}
check().catch(e => { console.error(e.message); sql.close(); });
