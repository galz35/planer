
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
        const res = await client.query('SELECT correo FROM "p_Usuarios" WHERE correo LIKE \'%tania%\'');
        console.log('--- EMAILS IN DB ---');
        res.rows.forEach(r => console.log(`- ${r.correo}`));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

run();
