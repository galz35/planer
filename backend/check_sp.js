const sql = require('mssql');
const config = {
    user: 'plan',
    password: 'admin123',
    server: 'database-2.cufqs68ewpdj.us-east-1.rds.amazonaws.com',
    database: 'Bdplaner',
    options: { encrypt: true, trustServerCertificate: true }
};

async function check() {
    try {
        await sql.connect(config);

        // Ver si SP existe
        const sp = await sql.query(`SELECT OBJECT_ID('sp_Tarea_Crear') as id`);
        console.log('SP Exists:', sp.recordset[0].id ? 'YES' : 'NO');

        // Probar SP directamente
        console.log('\nTesting SP...');
        const req = new sql.Request();
        req.input('nombre', 'TestSP_Direct');
        req.input('idUsuario', 999);
        const res = await req.execute('sp_Tarea_Crear');
        console.log('SP Result:', res.recordset[0]);

    } catch (e) {
        console.error('ERROR:', e.message);
    } finally {
        await sql.close();
    }
}
check();
