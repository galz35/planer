const sql = require('mssql');
const config = {
    user: 'plan', password: 'admin123',
    server: 'database-2.cufqs68ewpdj.us-east-1.rds.amazonaws.com',
    database: 'Bdplaner', options: { encrypt: true, trustServerCertificate: true }
};
sql.connect(config).then(async () => {
    const r = await sql.query`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='p_UsuariosConfig'`;
    console.log('Columns in p_UsuariosConfig:', r.recordset.map(c => c.COLUMN_NAME));
    await sql.close();
}).catch(e => { console.error('ERROR:', e.message); sql.close(); });
