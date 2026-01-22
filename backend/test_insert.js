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

async function testInsert() {
    try {
        const pool = await sql.connect(config);
        console.log('Intentando insertar proyecto de prueba...');
        const result = await pool.request()
            .input('nombre', sql.NVarChar, 'Proyecto Test AI')
            .input('descripcion', sql.NVarChar, 'Prueba de insercion sin columna activo')
            .input('idCreador', sql.Int, 1)
            .query(`
                INSERT INTO p_Proyectos (nombre, descripcion, fechaCreacion, idCreador, estado)
                OUTPUT INSERTED.idProyecto
                VALUES (@nombre, @descripcion, GETDATE(), @idCreador, 'Activo')
            `);
        console.log('✅ Proyecto creado con ID:', result.recordset[0].idProyecto);

        // Limpiar
        await pool.request()
            .input('id', sql.Int, result.recordset[0].idProyecto)
            .query('DELETE FROM p_Proyectos WHERE idProyecto = @id');
        console.log('🧹 Limpieza completada');

        await pool.close();
    } catch (err) {
        console.error('❌ Error en insercion:', err.message);
    }
}

testInsert();
