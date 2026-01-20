/**
 * Script para exportar empleados en nodos corruptos (nombre "0" o vacío)
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

    const empleados = await ds.query(`
        SELECT 
            u."idUsuario", 
            u.nombre, 
            u.correo, 
            u.telefono,
            uo.rol as "rolEnNodo",
            n."idNodo",
            n.nombre as "nodoNombre"
        FROM "p_UsuariosOrganizacion" uo 
        JOIN "p_Usuarios" u ON u."idUsuario" = uo."idUsuario" 
        JOIN "p_OrganizacionNodos" n ON n."idNodo" = uo."idNodo"
        WHERE u.activo = true AND (n.nombre = '0' OR n.nombre = '' OR n.nombre IS NULL)
        ORDER BY uo.rol DESC, u.nombre
    `);

    console.log(`Total empleados en nodos corruptos: ${empleados.length}\n`);

    // CSV
    let csv = 'ID,Nombre,Correo,Telefono,RolEnNodo,IdNodo,NombreNodo\n';
    empleados.forEach((e: any) => {
        csv += `${e.idUsuario},"${e.nombre}",${e.correo},${e.telefono || ''},${e.rolEnNodo},${e.idNodo},"${e.nodoNombre}"\n`;
    });
    fs.writeFileSync('D:/planificacion/database/EMPLEADOS_NODOS_CORRUPTOS.csv', csv);
    console.log('✅ CSV guardado');

    // Markdown
    const lideres = empleados.filter((e: any) => e.rolEnNodo === 'Lider');
    const colaboradores = empleados.filter((e: any) => e.rolEnNodo === 'Colaborador');

    let md = `# EMPLEADOS EN NODOS CORRUPTOS (nombre "0" o vacío)
## Fecha: ${new Date().toLocaleString('es-NI')}

---

## RESUMEN

| Métrica | Cantidad |
|---------|----------|
| Total Empleados | ${empleados.length} |
| Con rol Lider | ${lideres.length} |
| Con rol Colaborador | ${colaboradores.length} |

---

## ⚠️ PROBLEMA

Estos empleados están asignados a nodos cuyo nombre es "0" o está vacío.
Esto indica datos corruptos de la migración original.

**Solución:** Reasignar estos empleados a nodos válidos.

---

## 👔 EMPLEADOS CON ROL "LIDER" (${lideres.length})

| # | ID | Nombre | Correo | ID Nodo |
|---|---|--------|--------|---------|
`;

    lideres.forEach((e: any, i: number) => {
        md += `| ${i + 1} | ${e.idUsuario} | ${e.nombre} | ${e.correo} | ${e.idNodo} |\n`;
    });

    md += `
---

## 👥 EMPLEADOS CON ROL "COLABORADOR" (${colaboradores.length})

| # | ID | Nombre | Correo | ID Nodo |
|---|---|--------|--------|---------|
`;

    colaboradores.forEach((e: any, i: number) => {
        md += `| ${i + 1} | ${e.idUsuario} | ${e.nombre} | ${e.correo} | ${e.idNodo} |\n`;
    });

    fs.writeFileSync('D:/planificacion/database/EMPLEADOS_NODOS_CORRUPTOS.md', md);
    console.log('✅ Markdown guardado');

    await ds.destroy();
}

main().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});
