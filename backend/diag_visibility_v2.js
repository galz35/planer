
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
        const userRes = await client.query('SELECT carnet, "rolGlobal" FROM "p_Usuarios" WHERE correo = $1', ['gustavo.lira@claro.com.ni']);
        const carnet = userRes.rows[0].carnet;
        console.log('Testing for carnet:', carnet, 'with role:', userRes.rows[0].rolGlobal);

        const sql = `
      WITH RECURSIVE
      Actores AS (
        SELECT $1::text AS carnet
      ),
      IsAdmin AS (
        SELECT 1 FROM "p_Usuarios" u
        JOIN Actores a ON u.carnet = a.carnet
        WHERE UPPER(u."rolGlobal") IN ('ADMIN', 'SUPERADMIN', 'ADMINISTRADOR')
        LIMIT 1
      )
      SELECT COUNT(*) as total
      FROM (
        SELECT carnet FROM "p_Usuarios" WHERE EXISTS (SELECT 1 FROM IsAdmin)
        UNION
        SELECT carnet FROM Actores
      ) v
    `;
        const fullRes = await client.query(sql, [carnet]);
        console.log('VISIBLE_COUNT:' + fullRes.rows[0].total);

    } catch (err) {
        console.error('Error', err.stack);
    } finally {
        await client.end();
    }
}

testVisibility();
