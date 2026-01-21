const { Client } = require('pg');

async function check() {
    const client = new Client({
        host: 'aws-0-us-west-2.pooler.supabase.com',
        port: 6543,
        user: 'postgres.ddmeodlpdxgmadduwdas',
        password: '92li!ra$Gu2',
        database: 'postgres',
        ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    const r = await client.query(`
        SELECT "idUsuario", nombre, "jefeCarnet" 
        FROM "p_Usuarios" 
        WHERE "idUsuario" IN (16, 6, 34)
    `);
    console.table(r.rows);
    await client.end();
}
check();
