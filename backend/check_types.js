
const { Client } = require('pg');

async function checkTypes() {
    const client = new Client({
        host: 'aws-0-us-west-2.pooler.supabase.com',
        port: 6543,
        user: 'postgres.ddmeodlpdxgmadduwdas',
        password: "92li!ra$Gu2",
        database: 'postgres',
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        const res = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'p_Usuarios' AND column_name IN ('carnet', 'rolGlobal')
    `);
        console.log('TYPES:' + JSON.stringify(res.rows));

    } catch (err) {
        console.error('Error', err.stack);
    } finally {
        await client.end();
    }
}

checkTypes();
