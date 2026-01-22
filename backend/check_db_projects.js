
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

async function checkProjects() {
    try {
        let pool = await sql.connect(config);
        const result = await pool.request().query("SELECT idProyecto, nombre, estado FROM p_Proyectos");
        console.log('Proyectos en la base de datos:');
        console.dir(result.recordset);
        await sql.close();
    } catch (err) {
        console.error(err);
    }
}

checkProjects();
