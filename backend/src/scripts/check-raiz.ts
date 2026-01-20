/**
 * Script para verificar quién está en el nodo raíz
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
    console.log('Conectado\n');

    // 1. Ver el nodo raíz
    console.log('=== NODO RAIZ ===');
    const raiz = await ds.query(`
        SELECT "idNodo", nombre, tipo, "idPadre" 
        FROM "p_OrganizacionNodos" 
        WHERE "idPadre" IS NULL OR tipo = 'Dirección'
    `);
    console.log(JSON.stringify(raiz, null, 2));

    // 2. Empleados directamente en el nodo raíz (id 40 = Claro Nicaragua)
    console.log('\n=== EMPLEADOS EN NODO 40 (Claro Nicaragua) ===');
    const empRaiz = await ds.query(`
        SELECT u.nombre, u.correo, uo.rol 
        FROM "p_UsuariosOrganizacion" uo 
        JOIN "p_Usuarios" u ON u."idUsuario" = uo."idUsuario" 
        WHERE uo."idNodo" = 40 AND u.activo = true
        ORDER BY uo.rol, u.nombre
    `);
    console.log(`Total empleados en nodo 40: ${empRaiz.length}`);
    empRaiz.forEach((e: any) => console.log(`  - ${e.nombre} | Rol: ${e.rol}`));

    // 3. Buscar a Antonio Vega y Victoria Roman
    console.log('\n=== BUSCANDO ANTONIO VEGA Y VICTORIA ROMAN ===');
    const especiales = await ds.query(`
        SELECT u."idUsuario", u.nombre, u.correo, uo."idNodo", n.nombre as nodo, uo.rol
        FROM "p_Usuarios" u
        LEFT JOIN "p_UsuariosOrganizacion" uo ON uo."idUsuario" = u."idUsuario"
        LEFT JOIN "p_OrganizacionNodos" n ON n."idNodo" = uo."idNodo"
        WHERE u.activo = true 
        AND (LOWER(u.nombre) LIKE '%vega%' OR LOWER(u.nombre) LIKE '%roman%' OR LOWER(u.nombre) LIKE '%victoria%')
    `);
    console.log(JSON.stringify(especiales, null, 2));

    // 4. Estadísticas de asignaciones por nodo
    console.log('\n=== TOP 10 NODOS CON MÁS EMPLEADOS ===');
    const topNodos = await ds.query(`
        SELECT n.nombre, n.tipo, COUNT(uo."idUsuario") as empleados
        FROM "p_OrganizacionNodos" n
        LEFT JOIN "p_UsuariosOrganizacion" uo ON uo."idNodo" = n."idNodo"
        WHERE n.activo = true
        GROUP BY n."idNodo", n.nombre, n.tipo
        ORDER BY empleados DESC
        LIMIT 15
    `);
    topNodos.forEach((n: any) => console.log(`  ${n.empleados} empleados - ${n.nombre} (${n.tipo})`));

    await ds.destroy();
}

main().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});
