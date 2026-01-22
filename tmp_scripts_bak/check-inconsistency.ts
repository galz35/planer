
import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

async function main() {
    const ds = new DataSource({
        type: 'postgres', host: process.env.DB_HOST, port: 5432, username: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME
    });
    await ds.initialize();

    const users = await ds.query('SELECT correo, carnet, "rolGlobal" FROM "p_Usuarios" WHERE carnet IS NULL');
    console.log('Users with missing carnet in p_Usuarios:', users.length);
    console.table(users.slice(0, 10));

    const missingInEmp = await ds.query('SELECT u.correo, u.nombre FROM "p_Usuarios" u LEFT JOIN p_empleados e ON LOWER(u.correo) = LOWER(e.correo) WHERE e.carnet IS NULL');
    console.log('Users missing in p_empleados table:', missingInEmp.length);
    console.table(missingInEmp.slice(0, 10));

    await ds.destroy();
}
main().catch(console.error);
