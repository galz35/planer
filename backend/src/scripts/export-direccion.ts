/**
 * Script para exportar los 966 empleados en el nodo Dirección
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

    // Obtener empleados en nodo 40 (Claro Nicaragua - Dirección)
    const empleados = await ds.query(`
        SELECT 
            u."idUsuario", 
            u.nombre, 
            u.correo, 
            u.telefono,
            uo.rol as "rolEnNodo",
            r.nombre as "rolSistema"
        FROM "p_UsuariosOrganizacion" uo 
        JOIN "p_Usuarios" u ON u."idUsuario" = uo."idUsuario" 
        LEFT JOIN "p_Roles" r ON r."idRol" = u."idRol"
        WHERE uo."idNodo" = 40 AND u.activo = true
        ORDER BY uo.rol DESC, u.nombre
    `);

    console.log(`Total empleados en Dirección: ${empleados.length}\n`);

    // Generar CSV
    let csv = 'ID,Nombre,Correo,Telefono,RolEnNodo,RolSistema\n';
    empleados.forEach((e: any) => {
        csv += `${e.idUsuario},"${e.nombre}",${e.correo},${e.telefono || ''},${e.rolEnNodo},${e.rolSistema || ''}\n`;
    });
    fs.writeFileSync('D:/planificacion/database/EMPLEADOS_EN_DIRECCION.csv', csv);
    console.log('✅ CSV guardado: D:/planificacion/database/EMPLEADOS_EN_DIRECCION.csv');

    // Generar Markdown
    const lideres = empleados.filter((e: any) => e.rolEnNodo === 'Lider');
    const colaboradores = empleados.filter((e: any) => e.rolEnNodo === 'Colaborador');

    let md = `# EMPLEADOS EN NODO DIRECCIÓN (Claro Nicaragua)
## Fecha: ${new Date().toLocaleString('es-NI')}

---

## RESUMEN

| Métrica | Cantidad |
|---------|----------|
| Total Empleados | ${empleados.length} |
| Con rol Lider | ${lideres.length} |
| Con rol Colaborador | ${colaboradores.length} |

---

## ⚠️ NOTA IMPORTANTE

Estos ${empleados.length} empleados están asignados directamente al nodo raíz "Claro Nicaragua" (Dirección).

**Lo correcto sería:**
- Solo Antonio Vega (Director) y Victoria Roman (Asistente) aquí
- El resto debe estar en sus Gerencias/Subgerencias/Equipos correspondientes

---

## 👔 EMPLEADOS CON ROL "LIDER" (${lideres.length})

| # | ID | Nombre | Correo | Rol Sistema |
|---|---|--------|--------|-------------|
`;

    lideres.forEach((e: any, i: number) => {
        md += `| ${i + 1} | ${e.idUsuario} | ${e.nombre} | ${e.correo} | ${e.rolSistema || '-'} |\n`;
    });

    md += `
---

## 👥 EMPLEADOS CON ROL "COLABORADOR" (${colaboradores.length})

| # | ID | Nombre | Correo | Rol Sistema |
|---|---|--------|--------|-------------|
`;

    colaboradores.forEach((e: any, i: number) => {
        md += `| ${i + 1} | ${e.idUsuario} | ${e.nombre} | ${e.correo} | ${e.rolSistema || '-'} |\n`;
    });

    fs.writeFileSync('D:/planificacion/database/EMPLEADOS_EN_DIRECCION.md', md);
    console.log('✅ Markdown guardado: D:/planificacion/database/EMPLEADOS_EN_DIRECCION.md');

    await ds.destroy();
}

main().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});
