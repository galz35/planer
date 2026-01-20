
const { Client } = require('pg');

async function fixUser() {
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
        console.log('Connected');

        // Update carnet to 500708 and name to 'Gustavo Lira'
        await client.query('UPDATE "p_Usuarios" SET carnet = \'500708\', "nombreCompleto" = \'Gustavo Lira\' WHERE correo = $1', ['gustavo.lira@claro.com.ni']);
        console.log('Updated Gustavo: carnet 500708, name Gustavo Lira');

    } catch (err) {
        console.error('Error', err.stack);
    } finally {
        await client.end();
    }
}

fixUser();
