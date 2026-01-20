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
        console.log('Connected to database');

        // Agregar columnas organizacionales a p_PlanesTrabajo
        await client.query(`
            ALTER TABLE "p_PlanesTrabajo" 
            ADD COLUMN IF NOT EXISTS "area" VARCHAR(200),
            ADD COLUMN IF NOT EXISTS "subgerencia" VARCHAR(200),
            ADD COLUMN IF NOT EXISTS "gerencia" VARCHAR(200)
        `);

        console.log('✅ Columnas organizacionales agregadas a p_PlanesTrabajo');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
