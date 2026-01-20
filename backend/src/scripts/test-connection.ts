
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Usuario, Rol, UsuarioCredenciales, OrganizacionNodo, UsuarioOrganizacion, Proyecto, Tarea, TareaAsignado, Checkin, CheckinTarea, Bloqueo, TareaAvance, UsuarioConfig } from '../entities';

// Force load from root
const envPath = path.resolve(__dirname, '../../.env');
const result = dotenv.config({ path: envPath });

async function testConnection() {
    console.log(`--- Iniciando Prueba de Conexión ---`);
    console.log(`Leyendo variables de: ${envPath}`);
    if (result.error) {
        console.error('Error cargando .env:', result.error.message);
    } else {
        console.log('.env cargado correctamente.');
    }

    const sslConfig = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false;

    console.log(`Host: ${process.env.DB_HOST}`);
    console.log(`User: ${process.env.DB_USER}`);
    console.log(`DB:   ${process.env.DB_NAME}`);
    console.log(`SSL:  ${process.env.DB_SSL} (Interpretado como: ${JSON.stringify(sslConfig)})`);

    if (!process.env.DB_HOST) {
        console.error('❌ ERROR: DB_HOST no está definido. Revisa el archivo .env');
        process.exit(1);
    }

    const AppDataSource = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: sslConfig,
        entities: [Usuario, Rol, UsuarioCredenciales, OrganizacionNodo, UsuarioOrganizacion, Proyecto, Tarea, TareaAsignado, Checkin, CheckinTarea, Bloqueo, TareaAvance, UsuarioConfig],
        synchronize: true,
        logging: false
    });

    try {
        console.log('Conectando...');
        await AppDataSource.initialize();
        console.log('✅ Conexión EXITOSA!');

        // Listar Tablas Reales
        console.log('\n--- Tablas Existentes en la BD ---');
        const tables = await AppDataSource.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `);

        if (tables.length === 0) {
            console.log('⚠️ No se encontraron tablas en el esquema public.');
        } else {
            tables.forEach((t: any) => console.log(` - ${t.table_name}`));
        }

        console.log('\n--- Verificando Datos ---');
        const userRepo = AppDataSource.getRepository(Usuario);
        const count = await userRepo.count();
        console.log(`✅ Usuarios registrados: ${count}`);

        await AppDataSource.destroy();
        console.log('--- Prueba Finalizada Correctamente ---');
        process.exit(0);
    } catch (error: any) {
        console.error('❌ Error en la prueba de conexión:');
        console.error(error.message || error);
        process.exit(1);
    }
}

testConnection();
