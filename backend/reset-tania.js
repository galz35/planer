
const { Client } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function run() {
    const client = new Client({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: { rejectUnauthorized: false },
    });

    try {
        await client.connect();
        const email = 'taniaa.aguirre@claro.com.ni';
        const newPassword = 'password123';
        const hash = await bcrypt.hash(newPassword, 10);

        const res = await client.query('SELECT "idUsuario" FROM "p_Usuarios" WHERE correo = $1', [email]);
        if (res.rows.length === 0) {
            console.error('User not found');
            return;
        }

        const idUsuario = res.rows[0].idUsuario;
        await client.query('UPDATE "p_UsuariosCredenciales" SET "passwordHash" = $1 WHERE "idUsuario" = $2', [hash, idUsuario]);

        console.log(`Password for ${email} reset to: ${newPassword}`);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

run();
