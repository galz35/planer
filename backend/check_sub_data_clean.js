
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

        const res = await client.query('SELECT carnet, "primer_nivel", gerencia FROM "p_Usuarios" WHERE carnet = $1', ['222627']);

        if (res.rows.length > 0) {
            const u = res.rows[0];
            console.log(`Carnet: ${u.carnet}`);
            console.log(`Primer Nivel (DB): '${u.primer_nivel}'`);
            console.log(`Gerencia (DB): '${u.gerencia}'`);
        } else {
            console.log('User not found');
        }

        await client.end();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkSubordinateData();
