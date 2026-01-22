
import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function run() {
    await AppDataSource.initialize();
    console.log('Database connected.');

    try {
        console.log('Adding tipo_acceso column to p_permiso_empleado...');
        await AppDataSource.query(`
            ALTER TABLE p_permiso_empleado 
            ADD COLUMN IF NOT EXISTS tipo_acceso VARCHAR(20) DEFAULT 'ALLOW';
        `);
        console.log('Column added successfully.');
    } catch (err) {
        console.error('Error executing query:', err);
    } finally {
        await AppDataSource.destroy();
    }
}

run();
