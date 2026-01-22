const sql = require('mssql');
const fs = require('fs');

const config = {
    user: 'plan',
    password: 'admin123',
    server: 'database-2.cufqs68ewpdj.us-east-1.rds.amazonaws.com',
    database: 'Bdplaner',
    options: { encrypt: true, trustServerCertificate: true }
};

async function checkUsers() {
    try {
        await sql.connect(config);
        const result = await sql.query("SELECT idUsuario, correo FROM p_Usuarios");
        fs.writeFileSync('users_debug.json', JSON.stringify(result.recordset, null, 2));
    } catch (err) {
        fs.writeFileSync('users_error.txt', err.message);
    } finally {
        await sql.close();
    }
}
checkUsers();
