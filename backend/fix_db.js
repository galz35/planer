const sql = require('mssql');

const config = {
    user: 'plan',
    password: 'admin123',
    server: '54.146.235.205',
    database: 'Bdplaner',
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

(async () => {
    try {
        console.log('Connecting to DB...');
        await sql.connect(config);

        // DROP TABLE IF EXISTS AND HAS 0 RECORDS Or Just Drop because user wants it to work
        console.log('Dropping incorrect table...');
        await sql.query("IF OBJECT_ID('p_TareaAvances', 'U') IS NOT NULL DROP TABLE p_TareaAvances");

        console.log('Creating table with CORRECT schema...');
        await sql.query(`
            CREATE TABLE dbo.p_TareaAvances(
                idLog int IDENTITY(1,1) PRIMARY KEY,
                idTarea int NOT NULL,
                idUsuario int NOT NULL,
                progreso int NULL,
                comentario nvarchar(max) NULL,
                fecha datetime DEFAULT GETDATE()
            );
        `);
        console.log('Table recreated successfully.');

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await sql.close();
    }
})();
