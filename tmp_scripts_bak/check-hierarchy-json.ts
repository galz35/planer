
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
config();
async function main() {
    const ds = new DataSource({
        type: 'postgres', host: process.env.DB_HOST, port: 5432, username: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME
    });
    await ds.initialize();

    const stats = await ds.query(`
        SELECT 
            COUNT(*) as total,
            COUNT(carnet_jefe1) as con_jefe,
            COUNT(idorg) as con_nodo
        FROM p_empleados
        WHERE activo = true
    `);

    const sample = await ds.query(`
        SELECT e.carnet, e.nombre_completo, e.carnet_jefe1, j.nombre_completo as nombre_jefe
        FROM p_empleados e
        LEFT JOIN p_empleados j ON e.carnet_jefe1 = j.carnet
        WHERE e.carnet_jefe1 IS NOT NULL
        LIMIT 10
    `);

    console.log('RESULT_START');
    console.log(JSON.stringify({ stats, sample }, null, 2));
    console.log('RESULT_END');

    await ds.destroy();
}
main();
