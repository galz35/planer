
const { Client } = require('pg');

async function testVisibility() {
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
        const carnet = '500708';

        const sql = `
      WITH RECURSIVE
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
      SELECT COUNT(*) as total
      FROM (
        SELECT carnet FROM "p_Usuarios" WHERE activo = true AND EXISTS (SELECT 1 FROM IsAdmin)
        UNION
        SELECT carnet FROM Actores
      ) v
    `;
        const res = await client.query(sql, [carnet]);
        console.log('VISIBLE_COUNT_AFTER_FIX:' + res.rows[0].total);

    } catch (err) {
        console.error('Error', err.stack);
    } finally {
        await client.end();
    }
}

testVisibility();
