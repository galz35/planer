
const sql = require('mssql');
require('dotenv').config({ path: '../.env' });

const config = {
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    server: process.env.MSSQL_HOST,
    database: process.env.MSSQL_DATABASE,
    port: parseInt(process.env.MSSQL_PORT || '1433'),
    options: {
        encrypt: process.env.MSSQL_ENCRYPT === 'true',
        trustServerCertificate: process.env.MSSQL_TRUST_CERT === 'true'
    }
};

async function runTest() {
    try {
        console.log('Connecting to DB...');
        const pool = await sql.connect(config);

        const carnet = '500708';
        const page = 1;
        const limit = 50;

        console.log(`Running SP for carnet: ${carnet}`);

        // Simulating AuditRepo.listarAuditLogsPorCarnet
        const result = await pool.request()
            .input('carnetSolicitante', sql.NVarChar, carnet)
            .input('searchTerm', sql.NVarChar, null)
            .input('page', sql.Int, page)
            .input('pageSize', sql.Int, limit)
            .execute('sp_Auditoria_Equipo_PorCarnet');

        console.log('SP Result Recordset Length:', result.recordset.length);

        // Simulating AuditService mapping
        const mappedItems = result.recordset.map(i => ({
            ...i,
            idAudit: i.idAuditLog,
            usuario: i.usuario || 'Desconocido'
        }));

        console.log('Sample Item:', mappedItems[0]);

        // Simulating Final Response Structure
        const response = {
            items: mappedItems, // This is what backend returns
            total: 999,
            page: 1
        };

        console.log('FINAL JSON STRUCTURE TO FRONTEND:');
        console.log(JSON.stringify(response, null, 2).substring(0, 500) + '...');

        process.exit(0);

    } catch (err) {
        console.error('Test Failed:', err);
        process.exit(1);
    }
}

runTest();
