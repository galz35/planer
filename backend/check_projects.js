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

async function checkLatest() {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query('SELECT TOP 5 * FROM p_Proyectos ORDER BY fechaCreacion DESC');
        console.log(JSON.stringify(result.recordset, null, 2));
        await pool.close();
    } catch (err) {
        console.error(err);
    }
}

checkLatest();
