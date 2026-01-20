
const { Client } = require('pg');
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
        const res = await client.query('SELECT "idUsuario", nombre, correo FROM "p_Usuarios" WHERE correo LIKE \'%tania%\'');
        res.rows.forEach(r => console.log(`USER: ${r.idUsuario} | ${r.correo} | ${r.nombre}`));

        if (res.rows.length > 0) {
            const ids = res.rows.map(r => r.idUsuario);
            const creds = await client.query('SELECT "idUsuario", "passwordHash" FROM "p_UsuariosCredenciales" WHERE "idUsuario" = ANY($1)', [ids]);
            creds.rows.forEach(c => console.log(`CRED: ${c.idUsuario} | ${c.passwordHash.substring(0, 10)}...`));
        }
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

run();
