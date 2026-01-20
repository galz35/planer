
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

dotenv.config();

const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
});

async function main() {
    await ds.initialize();

    console.log('--- ROLES ---');
    const roles = await ds.query('SELECT * FROM "p_Roles"');
    console.table(roles);

    console.log('--- USUARIOS (Muestra 5) ---');
    const users = await ds.query('SELECT "idUsuario", nombre, "idRol", correo FROM "p_Usuarios" LIMIT 5');
    console.table(users);

    await ds.destroy();
}

main().catch(console.error);
