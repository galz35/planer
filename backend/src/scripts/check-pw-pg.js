const { Client } = require('pg');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

async function check() {
    const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    });

    try {
        await client.connect();
        const res = await client.query('SELECT uc."passwordHash" FROM "p_UsuariosCredenciales" uc JOIN "p_Usuarios" u ON u."idUsuario" = uc."idUsuario" WHERE u.correo = $1', ['gustavo@claro.com.ni']);

        if (res.rows.length === 0) {
            console.log('User not found in DB');
        } else {
            const hash = res.rows[0].passwordHash;
            const isMatch = await bcrypt.compare('password123', hash);
            console.log('Gustavo password matches "password123":', isMatch);
            console.log('Hash:', hash);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}
check();
