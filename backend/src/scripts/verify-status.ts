
import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

async function main() {
    const ds = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'clarity',
    });

    await ds.initialize();

    const email = 'candida.sanchez@claro.com.ni';

    console.log('--- BUSCANDO USUARIO ---');
    const user = await ds.query('SELECT "idUsuario", nombre, carnet, correo FROM "p_Usuarios" WHERE LOWER(correo) = LOWER($1)', [email]);
    console.log(user);

    console.log('\n--- BUSCANDO EMPLEADO ---');
    const emp = await ds.query('SELECT carnet, nombre_completo, correo, cargo, fuente FROM p_empleados WHERE LOWER(correo) = LOWER($1)', [email]);
    console.log(emp);

    await ds.destroy();
}

main().catch(console.error);
