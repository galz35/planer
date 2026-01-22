const sql = require('mssql');
require('dotenv').config();

const config = {
    server: process.env.MSSQL_HOST,
    port: parseInt(process.env.MSSQL_PORT),
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    database: process.env.MSSQL_DATABASE,
    options: {
        encrypt: true,
        trustServerCertificate: true,
    },
};

async function checkNullable() {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query("SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'p_Proyectos'");
        console.log('Detalles de p_Proyectos:');
        result.recordset.forEach(col => console.log(`- ${col.COLUMN_NAME}: Nullable=${col.IS_NULLABLE}, Default=${col.COLUMN_DEFAULT}`));
        await pool.close();
    } catch (err) {
        console.error(err);
    }
}

checkNullable();
