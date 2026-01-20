
const { Client } = require('pg');

async function checkPermissions() {
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

        const aliCarnet = '402178';
        console.log(`Checking permissions for carnet: ${aliCarnet}`);

        // Check Permiso Empleado
        const perms = await client.query('SELECT * FROM "p_permiso_empleado" WHERE "carnet_recibe" = $1', [aliCarnet]);
        console.log(`Individual Permissions (p_permiso_empleado): ${perms.rows.length}`);
        perms.rows.forEach(p => console.log(JSON.stringify(p, null, 2)));

        // Check Permiso Area
        const areas = await client.query('SELECT * FROM "p_permiso_area" WHERE "carnet_recibe" = $1', [aliCarnet]);
        console.log(`Area Permissions (p_permiso_area): ${areas.rows.length}`);
        areas.rows.forEach(a => console.log(JSON.stringify(a, null, 2)));

        await client.end();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkPermissions();
