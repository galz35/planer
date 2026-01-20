
const { DataSource } = require('typeorm');
require('dotenv').config();

async function testVisibility() {
    const ds = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT),
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        synchronize: false,
    });

    try {
        await ds.initialize();
        const carnetAli = '402178';

        console.log('Testing visibility for Ali (' + carnetAli + ')...');

        const sql = `
          WITH RECURSIVE
          Actores AS (
            SELECT $1::text AS carnet
            UNION
            SELECT d.carnet_delegante
            FROM p_delegacion_visibilidad d
            WHERE d.carnet_delegado = $1
              AND d.activo = true
              AND (d.fecha_fin IS NULL OR d.fecha_fin >= CURRENT_DATE)
          ),
          Subordinados AS (
              SELECT u.carnet
              FROM "p_Usuarios" u
              JOIN Actores a ON u."jefeCarnet" = a.carnet
              WHERE u.activo = true
              UNION
              SELECT u.carnet
              FROM "p_Usuarios" u
              JOIN Subordinados s ON u."jefeCarnet" = s.carnet
              WHERE u.activo = true
          ),
          VisiblesPuntual AS (
            SELECT pe.carnet_objetivo AS carnet
            FROM p_permiso_empleado pe
            JOIN Actores a ON a.carnet = pe.carnet_recibe
            WHERE pe.activo = true
              AND (pe.fecha_fin IS NULL OR pe.fecha_fin >= CURRENT_DATE)
              AND (pe.tipo_acceso IS NULL OR pe.tipo_acceso = 'ALLOW')
          ),
          Excluidos AS (
            SELECT pe.carnet_objetivo AS carnet
            FROM p_permiso_empleado pe
            JOIN Actores a ON a.carnet = pe.carnet_recibe
            WHERE pe.activo = true
              AND pe.tipo_acceso = 'DENY'
          )
          SELECT DISTINCT v.carnet
          FROM (
            SELECT carnet FROM Subordinados
            UNION
            SELECT carnet FROM VisiblesPuntual
            UNION
            SELECT carnet FROM Actores
          ) v
          WHERE v.carnet IS NOT NULL AND v.carnet != ''
          AND v.carnet NOT IN (SELECT carnet FROM Excluidos);
        `;

        const rows = await ds.query(sql, [carnetAli]);
        console.log('VISIBLE_CARNETS:', rows.map(r => r.carnet));

        // Now check if those carnets exist in p_Usuarios
        if (rows.length > 0) {
            const carnets = rows.map(r => r.carnet);
            const placeholders = carnets.map((_, i) => '$' + (i + 1)).join(', ');
            const emps = await ds.query(`SELECT carnet, "nombreCompleto" FROM "p_Usuarios" WHERE carnet IN (${placeholders})`, carnets);
            console.log('EMPLOYEES_FOUND:', emps.length);
            emps.forEach(e => console.log(' - ' + e.carnet + ': ' + e.nombreCompleto));
        }

    } catch (e) {
        console.error(e);
    } finally {
        await ds.destroy();
    }
}

testVisibility();
