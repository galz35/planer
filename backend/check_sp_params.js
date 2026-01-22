const sql = require('mssql');
const config = {
    user: 'plan', password: 'admin123',
    server: 'database-2.cufqs68ewpdj.us-east-1.rds.amazonaws.com',
    database: 'Bdplaner', options: { encrypt: true, trustServerCertificate: true }
};
sql.connect(config).then(async () => {
    const r = await sql.query`
        SELECT 
            SPECIFIC_NAME as SP,
            PARAMETER_NAME as Param,
            DATA_TYPE as Type
        FROM INFORMATION_SCHEMA.PARAMETERS
        WHERE SPECIFIC_NAME IN ('sp_Tarea_Crear', 'sp_Checkin_Crear')
        ORDER BY SPECIFIC_NAME, ORDINAL_POSITION
    `;
    console.log(JSON.stringify(r.recordset, null, 2));
    await sql.close();
}).catch(e => { console.error('ERROR:', e.message); sql.close(); });
