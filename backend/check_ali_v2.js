
const { Client } = require('pg');

async function checkAli() {
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

        console.log('--- BUSCANDO POR EMAIL ---');
        const res = await client.query('SELECT "idUsuario", carnet, "nombreCompleto", correo, "jefeCarnet" FROM "p_Usuarios" WHERE correo = $1', ['ali.rodriguez@claro.com.ni']);
        console.log(`Found ${res.rows.length} records`);
        res.rows.forEach(r => console.log(JSON.stringify(r, null, 2)));

        console.log('\n--- BUSCANDO POR CARNET 402178 ---');
        const res2 = await client.query('SELECT "idUsuario", carnet, "nombreCompleto", correo, "jefeCarnet" FROM "p_Usuarios" WHERE carnet = $1', ['402178']);
        console.log(`Found ${res2.rows.length} records`);
        res2.rows.forEach(r => console.log(JSON.stringify(r, null, 2)));

        await client.end();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkAli();
