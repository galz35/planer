/**
 * Script para analizar nodos y empleados de Recursos Humanos
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
    // 1. NODOS DE RECURSOS HUMANOS
    // ========================================
    console.log('=== NODOS DE RECURSOS HUMANOS ===\n');

    const nodosRRHH = await ds.query(`
        SELECT n."idNodo", n.nombre, n.tipo, n."idPadre", n.activo,
               p.nombre as "nombrePadre",
               (SELECT COUNT(*) FROM "p_UsuariosOrganizacion" uo WHERE uo."idNodo" = n."idNodo") as empleados
        FROM "p_OrganizacionNodos" n
        LEFT JOIN "p_OrganizacionNodos" p ON p."idNodo" = n."idPadre"
        WHERE LOWER(n.nombre) LIKE '%recurso%' 
           OR LOWER(n.nombre) LIKE '%rrhh%'
           OR LOWER(n.nombre) LIKE '%humano%'
           OR LOWER(n.nombre) LIKE '%compensacion%'
           OR LOWER(n.nombre) LIKE '%capacitacion%'
           OR LOWER(n.nombre) LIKE '%relaciones laborales%'
           OR LOWER(n.nombre) LIKE '%nomina%'
           OR LOWER(n.nombre) LIKE '%seguridad industrial%'
        ORDER BY n.tipo, n.nombre
    `);

    console.log(`Total nodos RRHH: ${nodosRRHH.length}\n`);

    for (const n of nodosRRHH) {
        console.log(`ID: ${n.idNodo} | ${n.tipo} | ${n.nombre}`);
        console.log(`   Padre: ${n.nombrePadre || 'RAIZ'} | Empleados: ${n.empleados}`);
        console.log('');
    }

    // ========================================
    // 2. EMPLEADOS EN NODOS RRHH
    // ========================================
    console.log('\n=== EMPLEADOS EN NODOS RRHH ===\n');

    const empleadosRRHH = await ds.query(`
        SELECT u."idUsuario", u.nombre, u.correo, u.telefono, uo.rol, 
               n."idNodo", n.nombre as nodo, n.tipo
        FROM "p_UsuariosOrganizacion" uo
        JOIN "p_Usuarios" u ON u."idUsuario" = uo."idUsuario"
        JOIN "p_OrganizacionNodos" n ON n."idNodo" = uo."idNodo"
        WHERE u.activo = true
          AND (LOWER(n.nombre) LIKE '%recurso%' 
               OR LOWER(n.nombre) LIKE '%rrhh%'
               OR LOWER(n.nombre) LIKE '%humano%'
               OR LOWER(n.nombre) LIKE '%compensacion%'
               OR LOWER(n.nombre) LIKE '%relaciones laborales%'
               OR LOWER(n.nombre) LIKE '%seguridad industrial%')
        ORDER BY n.tipo, n.nombre, uo.rol DESC, u.nombre
    `);

    console.log(`Total empleados en RRHH: ${empleadosRRHH.length}\n`);

    let currentNodo = '';
    for (const e of empleadosRRHH) {
        if (e.nodo !== currentNodo) {
            currentNodo = e.nodo;
            console.log(`\n--- ${e.nodo} (${e.tipo}) ---`);
        }
        console.log(`  [${e.rol}] ${e.nombre} | ${e.correo}`);
    }

    // ========================================
    // 3. GUARDAR EN ARCHIVO
    // ========================================
    let md = `# NODOS Y EMPLEADOS DE RECURSOS HUMANOS
## Fecha: ${new Date().toLocaleString('es-NI')}

---

## NODOS DE RRHH (${nodosRRHH.length})

| ID | Tipo | Nombre | Padre | Empleados |
|----|------|--------|-------|-----------|
`;

    for (const n of nodosRRHH) {
        md += `| ${n.idNodo} | ${n.tipo} | ${n.nombre} | ${n.nombrePadre || 'RAIZ'} | ${n.empleados} |\n`;
    }

    md += `\n---\n\n## EMPLEADOS EN RRHH (${empleadosRRHH.length})\n\n`;

    currentNodo = '';
    for (const e of empleadosRRHH) {
        if (e.nodo !== currentNodo) {
            currentNodo = e.nodo;
            md += `\n### ${e.nodo} (${e.tipo})\n\n`;
            md += `| Rol | Nombre | Correo | Teléfono |\n`;
            md += `|-----|--------|--------|----------|\n`;
        }
        md += `| ${e.rol} | ${e.nombre} | ${e.correo} | ${e.telefono || '-'} |\n`;
    }

    fs.writeFileSync('D:/planificacion/database/RRHH_ANALISIS.md', md);
    console.log('\n\n✅ Archivo guardado: D:/planificacion/database/RRHH_ANALISIS.md');

    await ds.destroy();
}

main().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});
