const sql = require('mssql');
const config = {
    user: 'plan', password: 'admin123',
    server: 'database-2.cufqs68ewpdj.us-east-1.rds.amazonaws.com',
    database: 'Bdplaner', options: { encrypt: true, trustServerCertificate: true }
};
sql.connect(config).then(async () => {
    const r = await sql.query`
        SELECT TOP 5 * FROM p_Checkins ORDER BY idCheckin DESC
    `;
    console.log('Últimos 5 check-ins:');
    console.log(JSON.stringify(r.recordset, null, 2));
    await sql.close();
}).catch(e => { console.error('ERROR:', e.message); sql.close(); });
