/**
 * Script para listar usuarios activos de la base de datos
 */
import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { DataSource } from 'typeorm';

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
    console.log('🔌 Conectado a la base de datos\n');

    const usuarios = await ds.query(`
        SELECT 
            u."idUsuario",
            u.nombre,
            u.correo,
            u.activo,
            r.nombre as rol,
            (SELECT COUNT(*) FROM "p_TareaAsignados" ta WHERE ta."idUsuario" = u."idUsuario") as tareas_asignadas
        FROM "p_Usuarios" u 
        LEFT JOIN "p_Roles" r ON u."idRol" = r."idRol" 
        WHERE u.activo = true 
        ORDER BY r.nombre, u.nombre
        LIMIT 30
    `);

    console.log('📋 USUARIOS ACTIVOS EN LA BASE DE DATOS:');
    console.log('=========================================\n');

    for (const u of usuarios) {
        console.log(`🧑 ${u.nombre}`);
        console.log(`   📧 Correo: ${u.correo}`);
        console.log(`   👔 Rol: ${u.rol || 'Sin rol'}`);
        console.log(`   📌 Tareas asignadas: ${u.tareas_asignadas}`);
        console.log('');
    }

    console.log(`\n📊 Total usuarios activos: ${usuarios.length}`);

    await ds.destroy();
}

main().catch(e => {
    console.error('❌ Error:', e.message);
    process.exit(1);
});
