const sql = require('mssql');
const bcrypt = require('bcrypt');

const config = {
    user: 'plan',
    password: 'admin123',
    server: 'database-2.cufqs68ewpdj.us-east-1.rds.amazonaws.com',
    database: 'Bdplaner',
    options: { encrypt: true, trustServerCertificate: true }
};

async function createTestUser() {
    try {
        await sql.connect(config);

        // 1. Delete previous test user
        const testEmail = 'apitest@test.com';
        await sql.query(`DELETE FROM p_UsuariosCredenciales WHERE idUsuario IN (SELECT idUsuario FROM p_Usuarios WHERE correo = '${testEmail}')`);
        await sql.query(`DELETE FROM p_Usuarios WHERE correo = '${testEmail}'`);

        // 2. Insert User
        const insertUser = await sql.query(`
            INSERT INTO p_Usuarios (nombre, correo, carnet, activo, rolGlobal)
            OUTPUT INSERTED.idUsuario
            VALUES ('API Tester', '${testEmail}', 'TEST001', 1, 'Admin')
        `);
        const idUsuario = insertUser.recordset[0].idUsuario;
        console.log('Created User ID:', idUsuario);

        // 3. Hash Password
        const hash = await bcrypt.hash('admin123', 10);

        // 4. Insert Credentials
        await sql.query(`
            INSERT INTO p_UsuariosCredenciales (idUsuario, passwordHash)
            VALUES (${idUsuario}, '${hash}')
        `);
        console.log('Created Credentials.');

    } catch (err) {
        console.error(err);
    } finally {
        await sql.close();
    }
}
createTestUser();
