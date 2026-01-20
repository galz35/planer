
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
config();
async function main() {
    const ds = new DataSource({
        type: 'postgres', host: process.env.DB_HOST, port: 5432, username: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME
    });
    await ds.initialize();

    const carnet = 'USR-1353'; // Candida

    // Simulating the query logic to see count
    const sql = `
      WITH RECURSIVE
      Actores AS ( SELECT $1::text AS carnet ),
      IsAdmin AS (
        SELECT 1 FROM "p_Usuarios" u
        JOIN Actores a ON (u.carnet = a.carnet OR u.correo = (SELECT correo FROM p_empleados WHERE carnet = a.carnet))
        WHERE u."rolGlobal" = 'Admin'
        LIMIT 1
      )
      SELECT COUNT(DISTINCT e.carnet) as total
      FROM p_empleados e
      WHERE e.activo = true AND EXISTS (SELECT 1 FROM IsAdmin);
    `;
    const res = await ds.query(sql, [carnet]);
    console.log('VISIBLE_COUNT_IF_ADMIN:', res[0]?.total);

    const checkGustavo = await ds.query(`
        SELECT COUNT(*) as found 
        FROM p_empleados e 
        WHERE e.carnet = 'EMP899' AND e.carnet_jefe1 = 'USR-1353'
    `);
    console.log('GUSTAVO_HAS_CANDIDA_AS_BOSS:', checkGustavo[0]?.found > 0);

    await ds.destroy();
}
main();
