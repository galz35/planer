
const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.MSSQL_USER || process.env.DB_USER,
    password: process.env.MSSQL_PASSWORD || process.env.DB_PASSWORD,
    server: process.env.MSSQL_HOST || process.env.DB_HOST || 'localhost',
    database: process.env.MSSQL_DATABASE || process.env.DB_NAME,
    port: parseInt(process.env.MSSQL_PORT || process.env.DB_PORT || '1433'),
    options: {
        encrypt: true, // SQL provider uses true
        trustServerCertificate: true,
        connectTimeout: 5000,
        requestTimeout: 5000
    },
};

async function test() {
    console.log('Connecting...');
    try {
        await sql.connect(config);
        console.log('Connected. Querying p_Proyectos...');
        const result = await sql.query('SELECT TOP 5 * FROM p_Proyectos');
        console.log('Projects:', result.recordset);
        await sql.close();
    } catch (err) {
        console.error('Error:', err.message);
    }
}

test();
