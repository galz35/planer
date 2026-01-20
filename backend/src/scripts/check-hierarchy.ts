
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
    const candidaUser = await ds.query('SELECT "rolGlobal" FROM "p_Usuarios" WHERE LOWER(correo) = LOWER($1)', [candidaEmail]);

    console.log('--- Candida (Empleado) ---');
    console.table(candida);
    console.log('--- Gustavo (Empleado) ---');
    console.table(gustavo);
    console.log('--- Candida (Usuario) ---');
    console.table(candidaUser);

    await ds.destroy();
}
main().catch(console.error);
