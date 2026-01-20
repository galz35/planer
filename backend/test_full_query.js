
const { Client } = require('pg');

async function testFullQuery() {
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
        const carnetSolicitante = '500708';

        // We will select IsAdmin directly to see if it has rows
        const sql = `
      WITH 
      Actores AS (
        SELECT $1::text AS carnet
      ),
      IsAdmin AS (
        SELECT 1 FROM "p_Usuarios" u
        JOIN Actores a ON TRIM(u.carnet) = TRIM(a.carnet)
        WHERE u.activo = true 
          AND UPPER(TRIM(u."rolGlobal")) IN ('ADMIN', 'SUPERADMIN', 'ADMINISTRADOR')
        LIMIT 1
      )
      SELECT (SELECT COUNT(*) FROM IsAdmin) as is_admin_count,
             (SELECT COUNT(*) FROM "p_Usuarios" WHERE activo = true) as total_active;
    `;
        const res = await client.query(sql, [carnetSolicitante]);
        console.log('DEBUG_CTE:' + JSON.stringify(res.rows[0]));

    } catch (err) {
        console.error('Error', err.stack);
    } finally {
        await client.end();
    }
}

testFullQuery();
