const sql = require('mssql');

const config = {
    server: 'database-2.cufqs68ewpdj.us-east-1.rds.amazonaws.com',
    port: 1433,
    user: 'admin',
    password: '92li!ra$Gu2',
    database: 'master',
    options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true
    },
    connectionTimeout: 30000,
    requestTimeout: 30000
};

console.log('Intentando conectar a SQL Server AWS RDS...');
console.log('Host:', config.server);
console.log('User:', config.user);
console.log('Database:', config.database);

sql.connect(config)
    .then(async pool => {
        console.log('✅ CONECTADO EXITOSAMENTE!');

        // Probar query simple
        const result = await pool.request().query('SELECT @@VERSION as version');
        console.log('SQL Server Version:', result.recordset[0].version.substring(0, 80));

        // Listar bases de datos
        const dbs = await pool.request().query('SELECT name FROM sys.databases');
        console.log('Bases de datos:', dbs.recordset.map(d => d.name).join(', '));

        await sql.close();
    })
    .catch(err => {
        console.error('❌ ERROR DE CONEXIÓN:');
        console.error('  Código:', err.code);
        console.error('  Mensaje:', err.message);
        if (err.originalError) {
            console.error('  Original:', err.originalError.message);
        }
    });
