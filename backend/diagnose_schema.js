const sql = require('mssql');
const fs = require('fs');

const config = {
    user: 'plan',
    password: 'admin123',
    server: 'database-2.cufqs68ewpdj.us-east-1.rds.amazonaws.com',
    database: 'Bdplaner',
    options: { encrypt: true, trustServerCertificate: true, connectTimeout: 30000 }
};

async function log(msg) {
    console.log(msg);
    fs.appendFileSync('schema_report.txt', msg + '\n');
}

async function logTable(data) {
    const str = JSON.stringify(data, null, 2);
    console.log(str);
    fs.appendFileSync('schema_report.txt', str + '\n');
}

async function diagnose() {
    try {
        fs.writeFileSync('schema_report.txt', 'SCHEMA REPORT\n');
        log('🔌 Conectando a SQL Server...');
        await sql.connect(config);
        log('✅ Conectado.');

        log('\n🔍 Verificando Tablas Críticas:');
        const tables = await sql.query(`
            SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE'
            AND TABLE_NAME IN ('p_Tareas', 'p_Checkins', 'p_OrganizacionNodos', 'p_organizacion_nodos', 'p_Usuarios')
        `);
        logTable(tables.recordset);

        log('\n🔍 Columnas en p_Tareas:');
        const colsTareas = await sql.query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
            FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'p_Tareas'
        `);
        logTable(colsTareas.recordset);

        log('\n🔍 Columnas en p_Checkins:');
        const colsCheckins = await sql.query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
            FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'p_Checkins'
        `);
        logTable(colsCheckins.recordset);

        log('\n🔍 Columnas en p_organizacion_nodos:');
        const colsOrg = await sql.query(`
            SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME LIKE 'p_%OrganizacionNodos'
        `);
        logTable(colsOrg.recordset);

    } catch (err) {
        log('❌ Error: ' + err.message);
    } finally {
        await sql.close();
    }
}

diagnose();
