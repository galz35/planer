// Script de prueba directa a SQL Server
const sql = require('mssql');
const bcrypt = require('bcrypt');

const config = {
    server: 'database-2.cufqs68ewpdj.us-east-1.rds.amazonaws.com',
    port: 1433,
    user: 'plan',
    password: 'admin123',
    database: 'Bdplaner',
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

async function test() {
    try {
        console.log('🔌 Conectando a SQL Server...');
        await sql.connect(config);
        console.log('✅ Conectado!');

        // 1. Verificar usuario
        console.log('\n📋 Buscando usuario juan.ortuno@claro.com.ni...');
        const userResult = await sql.query`
            SELECT idUsuario, correo, activo, nombre 
            FROM p_Usuarios 
            WHERE correo = 'juan.ortuno@claro.com.ni'`;
        console.log('Usuario:', userResult.recordset[0]);

        if (userResult.recordset.length > 0) {
            const userId = userResult.recordset[0].idUsuario;

            // 2. Verificar credenciales
            console.log('\n🔐 Buscando credenciales para idUsuario:', userId);
            const credsResult = await sql.query`
                SELECT idCredencial, idUsuario, passwordHash 
                FROM p_UsuariosCredenciales 
                WHERE idUsuario = ${userId}`;
            console.log('Credenciales:', credsResult.recordset[0]);

            if (credsResult.recordset.length > 0) {
                const hash = credsResult.recordset[0].passwordHash;

                // 3. Probar bcrypt
                console.log('\n🔑 Probando contraseña "123456"...');
                const match = await bcrypt.compare('123456', hash);
                console.log('Match:', match);

                if (!match) {
                    console.log('\n⚠️ Hash actual:', hash);
                    console.log('Generando nuevo hash para "123456"...');
                    const newHash = await bcrypt.hash('123456', 10);
                    console.log('Nuevo hash:', newHash);

                    // Actualizar
                    await sql.query`UPDATE p_UsuariosCredenciales SET passwordHash = ${newHash} WHERE idUsuario = ${userId}`;
                    console.log('✅ Contraseña actualizada!');
                }
            }
        }

        // 4. Contar registros en tablas principales
        console.log('\n📊 Conteo de registros:');
        const tables = ['p_Roles', 'p_Usuarios', 'p_UsuariosCredenciales', 'p_Proyectos', 'p_Tareas'];
        for (const t of tables) {
            const r = await sql.query(`SELECT COUNT(*) as cnt FROM ${t}`);
            console.log(`  ${t}: ${r.recordset[0].cnt}`);
        }

        await sql.close();
        console.log('\n✅ Test completado!');
    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

test();
