
const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    server: process.env.MSSQL_HOST,
    database: process.env.MSSQL_DATABASE || 'Bdplaner',
    options: {
        encrypt: true,
        trustServerCertificate: true,
    },
};

async function listCols() {
    try {
        let pool = await sql.connect(config);
        const result = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'p_Bloqueos'");
        console.log('Columnas en p_Bloqueos:');
        result.recordset.forEach(col => console.log(`- ${col.COLUMN_NAME}`));
        await sql.close();
    } catch (err) {
        console.error(err);
    }
}

listCols();
