
const { Client } = require('pg');

async function checkSubordinateData() {
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

        // Check Pablo Cruz (222627)
        console.log('--- CHECKING PABLO CRUZ (222627) ---');
        const res = await client.query('SELECT carnet, "nombreCompleto", "primer_nivel", gerencia, "orgGerencia" FROM "p_Usuarios" WHERE carnet = $1', ['222627']);

        if (res.rows.length > 0) {
            console.log(JSON.stringify(res.rows[0], null, 2));
        } else {
            console.log('User not found');
        }

        await client.end();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkSubordinateData();
