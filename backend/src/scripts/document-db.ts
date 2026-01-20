/**
 * Script para buscar y documentar usuarios y estructura de la BD
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
    console.log('🔌 Conectado a la base de datos\n');

    // 1. Buscar usuario Gustavo
    console.log('🔍 Buscando usuario Gustavo...');
    const gustavo = await ds.query(`
        SELECT u."idUsuario", u.nombre, u.correo, u.activo, r.nombre as rol
        FROM "p_Usuarios" u 
        LEFT JOIN "p_Roles" r ON u."idRol" = r."idRol" 
        WHERE LOWER(u.nombre) LIKE '%gustavo%' OR LOWER(u.correo) LIKE '%gustavo%'
    `);
    console.log('Encontrados:', gustavo.length);
    console.log(JSON.stringify(gustavo, null, 2));

    // 2. Obtener estadísticas generales
    const stats = await ds.query(`
        SELECT 
            (SELECT COUNT(*) FROM "p_Usuarios" WHERE activo = true) as usuarios_activos,
            (SELECT COUNT(*) FROM "p_Usuarios" WHERE activo = false) as usuarios_inactivos,
            (SELECT COUNT(*) FROM "p_Roles") as roles,
            (SELECT COUNT(*) FROM "p_OrganizacionNodos" WHERE activo = true) as nodos_org,
            (SELECT COUNT(*) FROM "p_Proyectos") as proyectos,
            (SELECT COUNT(*) FROM "p_Tareas") as tareas,
            (SELECT COUNT(*) FROM "p_Checkins") as checkins,
            (SELECT COUNT(*) FROM "p_Bloqueos") as bloqueos
    `);
    console.log('\n📊 Estadísticas de la BD:');
    console.log(JSON.stringify(stats[0], null, 2));

    // 3. Obtener roles disponibles
    const roles = await ds.query(`SELECT "idRol", nombre, descripcion FROM "p_Roles" ORDER BY "idRol"`);
    console.log('\n👔 Roles disponibles:');
    console.log(JSON.stringify(roles, null, 2));

    // 4. Usuarios con tareas asignadas (activos)
    const conTareas = await ds.query(`
        SELECT u."idUsuario", u.nombre, u.correo, r.nombre as rol, COUNT(ta."idAsignacion") as tareas
        FROM "p_Usuarios" u
        LEFT JOIN "p_Roles" r ON u."idRol" = r."idRol"
        LEFT JOIN "p_TareaAsignados" ta ON ta."idUsuario" = u."idUsuario"
        WHERE u.activo = true
        GROUP BY u."idUsuario", u.nombre, u.correo, r.nombre
        HAVING COUNT(ta."idAsignacion") > 0
        ORDER BY COUNT(ta."idAsignacion") DESC
        LIMIT 20
    `);
    console.log('\n📌 Usuarios con tareas asignadas:');
    console.log(JSON.stringify(conTareas, null, 2));

    // 5. Estructura de organización
    const org = await ds.query(`
        SELECT "idNodo", "idPadre", tipo, nombre, activo
        FROM "p_OrganizacionNodos" 
        WHERE activo = true
        ORDER BY tipo, nombre
        LIMIT 30
    `);
    console.log('\n🏢 Estructura organizacional:');
    console.log(JSON.stringify(org, null, 2));

    // 6. Generar archivo de estructura
    const estructura = {
        generado: new Date().toISOString(),
        estadisticas: stats[0],
        roles,
        usuariosConTareas: conTareas,
        organizacion: org,
        buscadorGustavo: gustavo
    };

    fs.writeFileSync('../../ESTRUCTURA_BD.json', JSON.stringify(estructura, null, 2));
    console.log('\n✅ Archivo ESTRUCTURA_BD.json creado');

    // 7. Crear archivo cuentas.txt actualizado
    let cuentasTxt = `# CUENTAS DE USUARIO - MOMENTUS
# Actualizado: ${new Date().toLocaleString()}
# Contraseña para todos: 123456

## USUARIOS CON TAREAS ASIGNADAS (Recomendados para pruebas):
`;

    for (const u of conTareas.slice(0, 10)) {
        cuentasTxt += `\n- ${u.nombre}\n  Correo: ${u.correo}\n  Rol: ${u.rol || 'Sin rol'}\n  Tareas: ${u.tareas}\n`;
    }

    cuentasTxt += `\n## ESTADÍSTICAS:
- Usuarios activos: ${stats[0].usuarios_activos}
- Proyectos: ${stats[0].proyectos}
- Tareas: ${stats[0].tareas}
- Check-ins: ${stats[0].checkins}

## ROLES DISPONIBLES:
`;
    for (const r of roles) {
        cuentasTxt += `- ${r.nombre}: ${r.descripcion || 'Sin descripción'}\n`;
    }

    fs.writeFileSync('../../cuentas.txt', cuentasTxt);
    console.log('✅ Archivo cuentas.txt actualizado');

    await ds.destroy();
}

main().catch(e => {
    console.error('❌ Error:', e.message);
    process.exit(1);
});
