
const { Client } = require('pg');

async function debugHierarchy() {
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

        const aliEmail = 'ali.rodriguez@claro.com.ni';
        const aliRes = await client.query('SELECT * FROM "p_Usuarios" WHERE correo = $1', [aliEmail]);
        const ali = aliRes.rows[0];

        if (!ali) {
            console.log('ALI NOT FOUND');
            return;
        }

        console.log('--- ALI DATA ---');
        console.log(`ID: ${ali.idUsuario}, Carnet: ${ali.carnet}, Name: ${ali.nombreCompleto}`);
        console.log(`Boss Carnet (Current in DB): ${ali.jefeCarnet}`);

        // Check if his reported subordinates have him as boss
        const subCarnets = ['222627', '233269', '1009828', '249859'];
        console.log('\n--- CHECKING SUBORDINATES FROM CSV ---');
        for (const sc of subCarnets) {
            const subRes = await client.query('SELECT carnet, "nombreCompleto", "jefeCarnet" FROM "p_Usuarios" WHERE carnet = $1', [sc]);
            if (subRes.rows.length > 0) {
                const sub = subRes.rows[0];
                console.log(`Sub: ${sub.nombreCompleto} (${sub.carnet}) -> Boss in DB: ${sub.jefeCarnet}`);
            } else {
                console.log(`Sub carnet ${sc} NOT FOUND in DB`);
            }
        }

        // Check ALL users that have Ali's carnet as boss
        const allSubs = await client.query('SELECT carnet, "nombreCompleto", correo FROM "p_Usuarios" WHERE "jefeCarnet" = $1', [ali.carnet]);
        console.log(`\nActually found ${allSubs.rows.length} users with jefeCarnet = ${ali.carnet}`);
        allSubs.rows.forEach(s => console.log(` - ${s.nombreCompleto} (${s.carnet})`));

        await client.end();
    } catch (err) {
        console.error('Error:', err);
    }
}

debugHierarchy();
