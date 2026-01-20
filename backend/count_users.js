
const { Client } = require('pg');

async function countUsers() {
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
        const res = await client.query('SELECT COUNT(*) FROM "p_Usuarios"');
        console.log('TOTAL_USERS:' + res.rows[0].count);

        // Check Gustavo's role and carnet specifically
        const g = await client.query('SELECT carnet, "rolGlobal" FROM "p_Usuarios" WHERE correo = \'gustavo.lira@claro.com.ni\'');
        console.log('GUSTAVO:' + JSON.stringify(g.rows[0]));

    } catch (err) {
        console.error('Error', err.stack);
    } finally {
        await client.end();
    }
}

countUsers();
