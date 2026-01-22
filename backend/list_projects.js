const { ConnectionPool } = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    server: process.env.MSSQL_HOST,
    database: process.env.MSSQL_DATABASE,
    port: parseInt(process.env.MSSQL_PORT),
    options: {
        encrypt: process.env.MSSQL_ENCRYPT === 'true',
        trustServerCertificate: process.env.MSSQL_TRUST_CERT === 'true'
    }
};

async function test() {
    let pool;
    try {
        pool = await new ConnectionPool(config).connect();
        const res = await pool.request().query('SELECT idProyecto, nombre, estado, subgerencia FROM p_Proyectos');
        console.log(JSON.stringify(res.recordset, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        if (pool) await pool.close();
    }
}

test();
