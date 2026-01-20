
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
config();
async function main() {
    const ds = new DataSource({
        type: 'postgres', host: process.env.DB_HOST, port: 5432, username: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME
    });
    await ds.initialize();

    // Count how many people have jefe1
    const [count] = await ds.query('SELECT COUNT(*) as count FROM p_empleados WHERE carnet_jefe1 IS NOT NULL');
    console.log('Total with boss:', count.count);

    // List top 5 bosses and their subordinate counts
    const topBosses = await ds.query(`
        SELECT j.nombre_completo, COUNT(e.carnet) as subordinates
        FROM p_empleados e
        JOIN p_empleados j ON e.carnet_jefe1 = j.carnet
        GROUP BY j.nombre_completo
        ORDER BY subordinates DESC
        LIMIT 5
    `);
    console.log('Top Bosses:', JSON.stringify(topBosses, null, 2));

    await ds.destroy();
}
main();
