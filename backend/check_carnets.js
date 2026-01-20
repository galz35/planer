
const { Client } = require('pg');

async function checkCarnets() {
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

        const res = await client.query('SELECT carnet, "nombreCompleto", correo FROM "p_Usuarios" WHERE carnet IN (\'300042\', \'500708\')');
        console.log('CARNETS_FOUND:' + JSON.stringify(res.rows));

    } catch (err) {
        console.error('Error', err.stack);
    } finally {
        await client.end();
    }
}

checkCarnets();
