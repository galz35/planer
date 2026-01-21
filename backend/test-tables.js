const sql = require('mssql');

async function test() {
    try {
        await sql.connect({
            server: 'database-2.cufqs68ewpdj.us-east-1.rds.amazonaws.com',
            port: 1433,
            user: 'plan',
            password: 'admin123',
            database: 'Bdplaner',
            options: { encrypt: true, trustServerCertificate: true }
        });

        console.log('✅ Conectado a SQL Server AWS RDS');

        // Listar tablas
        const tables = await sql.query`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'`;
        console.log('\n📋 TABLAS CREADAS:');
        tables.recordset.forEach(t => console.log('  -', t.TABLE_NAME));

        // Contar registros en p_Usuarios
        const users = await sql.query`SELECT COUNT(*) as total FROM p_Usuarios`;
        console.log('\n👥 Usuarios:', users.recordset[0].total);

        await sql.close();
        console.log('\n✅ Test completado');
    } catch (e) {
        console.error('❌ Error:', e.message);
    }
}

test();
