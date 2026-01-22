/**
 * Script para exportar datos completos de Empleados y Organización
 * Todos los campos, todos los registros
 */
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
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

    // ========================================
    // 1. EXPORTAR TODOS LOS EMPLEADOS
    // ========================================
    console.log('📊 Exportando empleados...');

    const empleados = await ds.query(`
        SELECT 
            u."idUsuario",
            u.nombre,
            u.correo,
            u.telefono,
            u.activo,
            u."rolGlobal",
            u."idRol",
            r.nombre as "nombreRol",
            u."fechaCreacion",
            uo."idNodo",
            uo.rol as "rolEnOrg",
            n.nombre as "nombreNodo",
            n.tipo as "tipoNodo",
            n."idPadre" as "idNodoPadre"
        FROM "p_Usuarios" u
        LEFT JOIN "p_Roles" r ON r."idRol" = u."idRol"
        LEFT JOIN "p_UsuariosOrganizacion" uo ON uo."idUsuario" = u."idUsuario"
        LEFT JOIN "p_OrganizacionNodos" n ON n."idNodo" = uo."idNodo"
        ORDER BY u."idUsuario"
    `);

    console.log(`   Total empleados: ${empleados.length}`);

    // CSV Empleados
    let csvEmpleados = 'idUsuario,nombre,correo,telefono,activo,rolGlobal,idRol,nombreRol,fechaCreacion,idNodo,rolEnOrg,nombreNodo,tipoNodo,idNodoPadre\n';
    empleados.forEach((e: any) => {
        csvEmpleados += `${e.idUsuario},"${(e.nombre || '').replace(/"/g, '""')}",${e.correo || ''},${e.telefono || ''},${e.activo},${e.rolGlobal || ''},${e.idRol || ''},${e.nombreRol || ''},${e.fechaCreacion || ''},${e.idNodo || ''},${e.rolEnOrg || ''},"${(e.nombreNodo || '').replace(/"/g, '""')}",${e.tipoNodo || ''},${e.idNodoPadre || ''}\n`;
    });
    fs.writeFileSync('D:/planificacion/database/EXPORT_EMPLEADOS_COMPLETO.csv', csvEmpleados);
    console.log('   ✅ CSV empleados guardado');

    // ========================================
    // 2. EXPORTAR TODA LA ORGANIZACIÓN
    // ========================================
    console.log('📊 Exportando organización...');

    const nodos = await ds.query(`
        SELECT 
            n."idNodo",
            n.nombre,
            n.tipo,
            n."idPadre",
            n.activo,
            p.nombre as "nombrePadre",
            p.tipo as "tipoPadre",
            (SELECT COUNT(*) FROM "p_UsuariosOrganizacion" uo WHERE uo."idNodo" = n."idNodo") as "cantidadEmpleados"
        FROM "p_OrganizacionNodos" n
        LEFT JOIN "p_OrganizacionNodos" p ON p."idNodo" = n."idPadre"
        ORDER BY 
            CASE n.tipo 
                WHEN 'Dirección' THEN 1 
                WHEN 'Gerencia' THEN 2 
                WHEN 'Subgerencia' THEN 3 
                WHEN 'Equipo' THEN 4 
                ELSE 5 
            END,
            n.nombre
    `);

    console.log(`   Total nodos: ${nodos.length}`);

    // CSV Organización
    let csvOrg = 'idNodo,nombre,tipo,idPadre,activo,nombrePadre,tipoPadre,cantidadEmpleados\n';
    nodos.forEach((n: any) => {
        csvOrg += `${n.idNodo},"${(n.nombre || '').replace(/"/g, '""')}",${n.tipo || ''},${n.idPadre || ''},${n.activo},"${(n.nombrePadre || '').replace(/"/g, '""')}",${n.tipoPadre || ''},${n.cantidadEmpleados}\n`;
    });
    fs.writeFileSync('D:/planificacion/database/EXPORT_ORGANIZACION_COMPLETO.csv', csvOrg);
    console.log('   ✅ CSV organización guardado');

    // ========================================
    // 3. ESTADÍSTICAS Y RESUMEN
    // ========================================
    console.log('\n📊 Estadísticas:');

    const stats = {
        totalEmpleados: new Set(empleados.map((e: any) => e.idUsuario)).size,
        empleadosActivos: empleados.filter((e: any) => e.activo).length,
        empleadosInactivos: empleados.filter((e: any) => !e.activo).length,
        totalNodos: nodos.length,
        nodosActivos: nodos.filter((n: any) => n.activo).length,
        nodosVacios: nodos.filter((n: any) => n.cantidadEmpleados === 0 || n.cantidadEmpleados === '0').length,
        empleadosSinNodo: empleados.filter((e: any) => !e.idNodo).length,
        empleadosEnDireccion: empleados.filter((e: any) => e.tipoNodo === 'Dirección').length,
        empleadosEnNodosCeros: empleados.filter((e: any) => e.nombreNodo === '0' || e.nombreNodo === '').length,
    };

    console.log(`   Empleados totales únicos: ${stats.totalEmpleados}`);
    console.log(`   Empleados activos: ${stats.empleadosActivos}`);
    console.log(`   Empleados inactivos: ${stats.empleadosInactivos}`);
    console.log(`   Empleados sin nodo asignado: ${stats.empleadosSinNodo}`);
    console.log(`   Empleados en Dirección: ${stats.empleadosEnDireccion}`);
    console.log(`   Empleados en nodos '0': ${stats.empleadosEnNodosCeros}`);
    console.log(`   Nodos totales: ${stats.totalNodos}`);
    console.log(`   Nodos activos: ${stats.nodosActivos}`);
    console.log(`   Nodos vacíos: ${stats.nodosVacios}`);

    // Guardar estadísticas
    fs.writeFileSync('D:/planificacion/database/EXPORT_ESTADISTICAS.json', JSON.stringify(stats, null, 2));

    await ds.destroy();
    console.log('\n✅ Exportación completada');
}

main().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});
