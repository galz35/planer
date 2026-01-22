const sql = require('mssql');
const config = {
    user: 'plan', password: 'admin123',
    server: 'database-2.cufqs68ewpdj.us-east-1.rds.amazonaws.com',
    database: 'Bdplaner', options: { encrypt: true, trustServerCertificate: true }
};
sql.connect(config).then(async () => {
    const r = await sql.query`
        SELECT TOP 5 * FROM p_Tareas ORDER BY idTarea DESC
    `;
    console.log('Últimas 5 tareas:');
    console.log(JSON.stringify(r.recordset, null, 2));
    await sql.close();
}).catch(e => { console.error('ERROR:', e.message); sql.close(); });
