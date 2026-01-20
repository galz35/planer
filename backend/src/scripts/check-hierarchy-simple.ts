
import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

async function main() {
    const ds = new DataSource({
        type: 'postgres', host: process.env.DB_HOST, port: 5432, username: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME
    });
    await ds.initialize();

    const candidaEmail = 'candida.sanchez@claro.com.ni';
    const gustavoEmail = 'gustavo.lira@claro.com.ni';

    const candida = await ds.query('SELECT carnet, nombre_completo, idorg FROM p_empleados WHERE LOWER(correo) = LOWER($1)', [candidaEmail]);
    const gustavo = await ds.query('SELECT carnet, nombre_completo, carnet_jefe1, carnet_jefe2, idorg FROM p_empleados WHERE LOWER(correo) = LOWER($1)', [gustavoEmail]);

    console.log('CANDIDA_CARNET:', candida[0]?.carnet);
    console.log('GUSTAVO_JEFE1:', gustavo[0]?.carnet_jefe1);
    console.log('GUSTAVO_JEFE2:', gustavo[0]?.carnet_jefe2);

    await ds.destroy();
}
main().catch(console.error);
