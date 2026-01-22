
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import * as fs from 'fs';

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
    try {
        await ds.initialize();
        const roles = await ds.query('SELECT "idRol", nombre, descripcion, reglas FROM "p_Roles"');
        fs.writeFileSync('roles_dump.json', JSON.stringify(roles, null, 2));
        console.log('Roles written to roles_dump.json');
        await ds.destroy();
    } catch (error) {
        console.error(error);
    }
}

main();
