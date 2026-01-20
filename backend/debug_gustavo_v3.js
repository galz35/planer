
const { Client } = require('pg');

async function debugGustavo() {
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
        const res = await client.query('SELECT carnet, "rolGlobal", activo, length(carnet) as carnet_len, length("rolGlobal") as rol_len FROM "p_Usuarios" WHERE correo = \'gustavo.lira@claro.com.ni\'');
        console.log('DEBUG_GUSTAVO:' + JSON.stringify(res.rows[0]));

        // Test the specific IsAdmin condition
        const actor = '500708';
        const testAdmin = await client.query(`
        SELECT u.carnet, u."rolGlobal"
        FROM "p_Usuarios" u
        WHERE TRIM(u.carnet) = $1
          AND u.activo = true 
          AND UPPER(TRIM(u."rolGlobal")) IN ('ADMIN', 'SUPERADMIN', 'ADMINISTRADOR')
    `, [actor]);
        console.log('IS_ADMIN_RESULT:' + JSON.stringify(testAdmin.rows));

    } catch (err) {
        console.error('Error', err.stack);
    } finally {
        await client.end();
    }
}

debugGustavo();
