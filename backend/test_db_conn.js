const sql = require('mssql');
require('dotenv').config();

const config = {
    server: process.env.MSSQL_HOST || 'database-2.cufqs68ewpdj.us-east-1.rds.amazonaws.com',
    port: parseInt(process.env.MSSQL_PORT || '1433'),
    user: process.env.MSSQL_USER || 'plan',
    password: process.env.MSSQL_PASSWORD || 'admin123',
    database: process.env.MSSQL_DATABASE || 'Bdplaner',
    options: {
        encrypt: true,
        trustServerCertificate: true,
    },
    connectionTimeout: 10000,
};

async function testConnection() {
    console.log('Probando conexión a:', config.server);
    try {
        const pool = await sql.connect(config);
        console.log('✅ Conexión exitosa!');
        const result = await pool.request().query('SELECT TOP 1 * FROM p_Proyectos');
        console.log('Muestra de datos:', result.recordset);
        await pool.close();
    } catch (err) {
        console.error('❌ Error de conexión:', err);
    }
}

testConnection();
