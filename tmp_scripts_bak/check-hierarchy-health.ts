
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
            COUNT(carnet_jefe1) as con_jefe_directo,
            COUNT(idorg) as con_nodo_org,
            COUNT(*) FILTER (WHERE carnet_jefe1 IS NULL AND idorg IS NULL) as huerfanos_totales
        FROM p_empleados
        WHERE activo = true
    `);

    console.log('--- ESTADÍSTICAS DE JERARQUÍA ---');
    console.table(stats);

    const jefesTop = await ds.query(`
        SELECT carnet_jefe1, COUNT(*) as subordinados
        FROM p_empleados
        WHERE carnet_jefe1 IS NOT NULL
        GROUP BY carnet_jefe1
        ORDER BY subordinados DESC
        LIMIT 10
    `);
    console.log('--- TOP JEFES POR SUBORDINADOS ---');
    console.table(jefesTop);

    await ds.destroy();
}
main();
