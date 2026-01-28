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
        console.log('Connected to DB');

        // Check Table
        const res = await sql.query("SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'p_TareaAvances'");
        console.log('p_TareaAvances Exists:', res.recordset.length > 0);

        if (res.recordset.length > 0) {
            const count = await sql.query("SELECT COUNT(*) as c FROM p_TareaAvances");
            console.log('Record Count:', count.recordset[0].c);

            const cols = await sql.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'p_TareaAvances'");
            console.log('Columns:', cols.recordset.map(x => x.COLUMN_NAME));
        } else {
            console.log('Creating table manually...');
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
            console.log('Table created.');
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await sql.close();
    }
})();
