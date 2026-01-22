/**
 * Script para extraer y documentar estructura completa de la BD
 * - Empleados de RRHH
 * - Estructura organizacional
 * - Jerarquías
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

    // 1. Obtener estructura de organización completa
    console.log('🏢 Extrayendo estructura organizacional...');
    const organizacion = await ds.query(`
        WITH RECURSIVE org_tree AS (
            SELECT 
                n."idNodo", 
                n."idPadre", 
                n.tipo, 
                n.nombre,
                n.activo,
                1 as nivel,
                n.nombre::text as ruta
            FROM "p_OrganizacionNodos" n 
            WHERE n."idPadre" IS NULL AND n.activo = true
            
            UNION ALL
            
            SELECT 
                n."idNodo", 
                n."idPadre", 
                n.tipo, 
                n.nombre,
                n.activo,
                ot.nivel + 1,
                ot.ruta || ' > ' || n.nombre
            FROM "p_OrganizacionNodos" n
            JOIN org_tree ot ON n."idPadre" = ot."idNodo"
            WHERE n.activo = true
        )
        SELECT * FROM org_tree ORDER BY nivel, tipo, nombre
    `);
    console.log(`   Encontrados: ${organizacion.length} nodos`);

    // 2. Buscar nodos relacionados con RRHH
    console.log('\n👥 Buscando estructura de RRHH...');
    const rrhhNodos = await ds.query(`
        SELECT n."idNodo", n."idPadre", n.tipo, n.nombre
        FROM "p_OrganizacionNodos" n
        WHERE n.activo = true 
        AND (
            LOWER(n.nombre) LIKE '%recurso%' 
            OR LOWER(n.nombre) LIKE '%humano%'
            OR LOWER(n.nombre) LIKE '%rrhh%'
            OR LOWER(n.nombre) LIKE '%personal%'
            OR LOWER(n.nombre) LIKE '%talento%'
        )
        ORDER BY n.tipo, n.nombre
    `);
    console.log(`   Nodos RRHH encontrados: ${rrhhNodos.length}`);

    // 3. Obtener empleados de RRHH
    console.log('\n📋 Extrayendo empleados de RRHH...');
    let empleadosRRHH: any[] = [];
    if (rrhhNodos.length > 0) {
        const rrhhIds = rrhhNodos.map((n: any) => n.idNodo).join(',');
        empleadosRRHH = await ds.query(`
            SELECT DISTINCT
                u."idUsuario",
                u.nombre,
                u.correo,
                u.activo,
                r.nombre as rol,
                n.nombre as nodo_nombre,
                n.tipo as nodo_tipo,
                uo.rol as rol_en_nodo
            FROM "p_Usuarios" u
            JOIN "p_UsuariosOrganizacion" uo ON uo."idUsuario" = u."idUsuario"
            JOIN "p_OrganizacionNodos" n ON uo."idNodo" = n."idNodo"
            LEFT JOIN "p_Roles" r ON u."idRol" = r."idRol"
            WHERE uo."idNodo" IN (${rrhhIds})
            AND u.activo = true
            ORDER BY n.nombre, uo.rol, u.nombre
        `);
    }
    console.log(`   Empleados RRHH: ${empleadosRRHH.length}`);

    // 4. Gerencias (nivel 1-2)
    console.log('\n🏛️ Extrayendo gerencias...');
    const gerencias = await ds.query(`
        SELECT n."idNodo", n."idPadre", n.tipo, n.nombre, p.nombre as padre_nombre
        FROM "p_OrganizacionNodos" n
        LEFT JOIN "p_OrganizacionNodos" p ON n."idPadre" = p."idNodo"
        WHERE n.activo = true 
        AND (n.tipo = 'Gerencia' OR n.tipo = 'Dirección' OR n.tipo = 'Subgerencia')
        ORDER BY n.tipo DESC, n.nombre
    `);
    console.log(`   Gerencias encontradas: ${gerencias.length}`);

    // 5. Líderes de cada gerencia
    console.log('\n👔 Extrayendo líderes por gerencia...');
    const lideres = await ds.query(`
        SELECT 
            n."idNodo",
            n.nombre as gerencia,
            n.tipo,
            u."idUsuario",
            u.nombre as lider_nombre,
            u.correo as lider_correo,
            uo.rol as rol_en_org
        FROM "p_OrganizacionNodos" n
        JOIN "p_UsuariosOrganizacion" uo ON uo."idNodo" = n."idNodo"
        JOIN "p_Usuarios" u ON uo."idUsuario" = u."idUsuario"
        WHERE n.activo = true 
        AND u.activo = true
        AND uo.rol IN ('Lider', 'Gerente', 'Director', 'Jefe')
        ORDER BY n.tipo DESC, n.nombre, uo.rol
    `);
    console.log(`   Líderes encontrados: ${lideres.length}`);

    // 6. Conteo de empleados por gerencia
    console.log('\n📊 Contando empleados por gerencia...');
    const conteoGerencias = await ds.query(`
        SELECT 
            n.nombre as gerencia,
            n.tipo,
            COUNT(DISTINCT uo."idUsuario") as empleados
        FROM "p_OrganizacionNodos" n
        JOIN "p_UsuariosOrganizacion" uo ON uo."idNodo" = n."idNodo"
        JOIN "p_Usuarios" u ON uo."idUsuario" = u."idUsuario"
        WHERE n.activo = true AND u.activo = true
        GROUP BY n."idNodo", n.nombre, n.tipo
        HAVING COUNT(DISTINCT uo."idUsuario") > 0
        ORDER BY COUNT(DISTINCT uo."idUsuario") DESC
        LIMIT 30
    `);

    // 7. Generar archivos de documentación
    console.log('\n📝 Generando archivos de documentación...');

    // Archivo: ORGANIZACION.md
    let orgMd = `# ESTRUCTURA ORGANIZACIONAL - MOMENTUS
# Actualizado: ${new Date().toLocaleString()}

## 📊 RESUMEN
- Total nodos de organización: ${organizacion.length}
- Gerencias/Direcciones: ${gerencias.length}
- Líderes identificados: ${lideres.length}

---

## 🏛️ GERENCIAS Y DIRECCIONES

| ID | Tipo | Nombre | Padre |
|----|------|--------|-------|
`;
    for (const g of gerencias) {
        orgMd += `| ${g.idNodo} | ${g.tipo} | ${g.nombre} | ${g.padre_nombre || 'Raíz'} |\n`;
    }

    orgMd += `\n---\n\n## 👔 LÍDERES POR GERENCIA\n\n`;
    for (const l of lideres) {
        orgMd += `### ${l.gerencia} (${l.tipo})\n`;
        orgMd += `- **${l.lider_nombre}** (${l.rol_en_org})\n`;
        orgMd += `  - Correo: ${l.lider_correo}\n`;
        orgMd += `  - ID: ${l.idUsuario}\n\n`;
    }

    orgMd += `\n---\n\n## 📊 EMPLEADOS POR ÁREA\n\n`;
    orgMd += `| Área | Tipo | Empleados |\n|------|------|----------|\n`;
    for (const c of conteoGerencias) {
        orgMd += `| ${c.gerencia} | ${c.tipo} | ${c.empleados} |\n`;
    }

    fs.writeFileSync('D:/planificacion/database/ORGANIZACION.md', orgMd);
    console.log('   ✅ ORGANIZACION.md creado');

    // Archivo: EMPLEADOS_RRHH.md
    let rrhhMd = `# EMPLEADOS DE RECURSOS HUMANOS
# Actualizado: ${new Date().toLocaleString()}

## 🏢 NODOS DE RRHH IDENTIFICADOS

| ID | Tipo | Nombre |
|----|------|--------|
`;
    for (const n of rrhhNodos) {
        rrhhMd += `| ${n.idNodo} | ${n.tipo} | ${n.nombre} |\n`;
    }

    rrhhMd += `\n---\n\n## 👥 EMPLEADOS DE RRHH (${empleadosRRHH.length})\n\n`;

    // Agrupar por nodo
    const porNodo: { [key: string]: any[] } = {};
    for (const e of empleadosRRHH) {
        const key = e.nodo_nombre;
        if (!porNodo[key]) porNodo[key] = [];
        porNodo[key].push(e);
    }

    for (const [nodo, emps] of Object.entries(porNodo)) {
        rrhhMd += `### ${nodo}\n\n`;
        rrhhMd += `| ID | Nombre | Correo | Rol en Nodo |\n`;
        rrhhMd += `|----|--------|--------|-------------|\n`;
        for (const e of emps) {
            rrhhMd += `| ${e.idUsuario} | ${e.nombre} | ${e.correo} | ${e.rol_en_nodo} |\n`;
        }
        rrhhMd += `\n`;
    }

    fs.writeFileSync('D:/planificacion/database/EMPLEADOS_RRHH.md', rrhhMd);
    console.log('   ✅ EMPLEADOS_RRHH.md creado');

    // Archivo: DATABASE_REFERENCIA.md (completo)
    let dbRef = `# REFERENCIA COMPLETA DE BASE DE DATOS
# Actualizado: ${new Date().toLocaleString()}

---

## 📂 TABLAS Y SU FUNCIÓN

### 👤 USUARIOS (p_Usuarios)
Almacena todos los empleados/usuarios del sistema.

\`\`\`
Campos principales:
- idUsuario (PK) - Identificador único
- nombre - Nombre completo
- correo - Email único (usado para login)
- activo - boolean (true = empleado activo)
- idRol - FK a p_Roles (permisos del sistema)
- rolGlobal - string legacy
- fechaCreacion - Fecha de alta
\`\`\`

### 🔐 CREDENCIALES (p_UsuariosCredenciales)
Contraseñas hasheadas para autenticación.

\`\`\`
- idCredencial (PK)
- idUsuario - FK
- passwordHash - bcrypt hash
- ultimoLogin - timestamp
- refreshTokenHash - para JWT refresh
\`\`\`

### 👔 ROLES (p_Roles)
Define permisos del sistema.

| ID | Rol | Descripción |
|----|-----|-------------|
| 1 | Admin | Acceso total |
| 2 | Gerente | Reportes y gestión |
| 3 | Coordinador | Gestión de equipos |
| 4 | Empleado | Rol base |
| 5 | Colaborador | Personal base |

---

## 🏢 ORGANIZACIÓN

### NODOS (p_OrganizacionNodos)
Estructura jerárquica del organigrama.

\`\`\`
- idNodo (PK)
- idPadre - FK a sí mismo (jerárquico)
- tipo - Dirección, Gerencia, Subgerencia, Equipo
- nombre - Nombre del nodo
- activo - boolean
\`\`\`

**Jerarquía típica:**
\`\`\`
Dirección (nivel 0)
  └─ Gerencia (nivel 1)
      └─ Subgerencia (nivel 2)
          └─ Equipo (nivel 3)
\`\`\`

### USUARIO-ORGANIZACIÓN (p_UsuariosOrganizacion)
Relaciona usuarios con nodos del organigrama.

\`\`\`
- idRelacion (PK)
- idUsuario - FK
- idNodo - FK
- rol - Lider, Miembro, Gerente, Director
- fechaInicio / fechaFin
\`\`\`

---

## 📋 GESTIÓN DE TRABAJO

### PROYECTOS (p_Proyectos)
\`\`\`
- idProyecto (PK)
- nombre
- descripcion
- idNodoDuenio - FK (qué área es dueña)
- estado - Activo, Cerrado
\`\`\`

### TAREAS (p_Tareas)
\`\`\`
- idTarea (PK, bigint)
- idProyecto - FK
- titulo
- descripcion
- estado - Pendiente, EnCurso, Bloqueada, Revision, Hecha, Descartada
- prioridad - Alta, Media, Baja
- esfuerzo - S, M, L
- fechaObjetivo - date
- progreso - 0-100
- idCreador - quien creó la tarea
- idAsignadoPor - si fue asignada por jefe
\`\`\`

### ASIGNACIONES (p_TareaAsignados)
\`\`\`
- idAsignacion (PK)
- idTarea - FK
- idUsuario - FK
- tipo - Responsable, Colaborador
\`\`\`

---

## ✅ CHECK-INS DIARIOS

### CHECKINS (p_Checkins)
Un registro por usuario por día.

\`\`\`
- idCheckin (PK)
- fecha - date (único por usuario)
- idUsuario - FK
- entregableTexto - Qué entregaste hoy
- estadoAnimo - Tope, Bien, Bajo
- nota - comentarios adicionales
\`\`\`

### CHECKIN-TAREAS (p_CheckinTareas)
Tareas asociadas al checkin del día.

\`\`\`
- idCheckinTarea (PK)
- idCheckin - FK
- idTarea - FK
- tipo - Entrego, Avanzo, Extra
\`\`\`

---

## 🚫 BLOQUEOS

### BLOQUEOS (p_Bloqueos)
Reporta dependencias bloqueantes.

\`\`\`
- idBloqueo (PK)
- idTarea - FK (qué tarea está bloqueada)
- idOrigenUsuario - quien reporta
- idDestinoUsuario - a quién bloquea (puede ser null)
- destinoTexto - si es externo (ej: "TI", "Compras")
- motivo - razón del bloqueo
- accionMitigacion - qué hacer mientras tanto
- estado - Activo, Resuelto
- fechaCreacion / fechaResolucion
\`\`\`

---

## 📌 MI AGENDA (p_FocoDiario)
Rolling tasks - tareas que se arrastran día a día.

\`\`\`
- idFoco (PK)
- fecha - date
- idUsuario - FK
- idTarea - FK
- esEstrategico - boolean (★ objetivo vs tarea)
- diasArrastre - cuántos días lleva sin completar
- completadoEnFecha - date o null
- orden - posición en lista
\`\`\`

---

## 🔗 CONSULTAS SQL ÚTILES

### Empleados de una gerencia específica
\`\`\`sql
SELECT u.*, uo.rol as rol_org
FROM "p_Usuarios" u
JOIN "p_UsuariosOrganizacion" uo ON uo."idUsuario" = u."idUsuario"
WHERE uo."idNodo" = [ID_NODO] AND u.activo = true;
\`\`\`

### Jerarquía de un nodo
\`\`\`sql
WITH RECURSIVE tree AS (
    SELECT * FROM "p_OrganizacionNodos" WHERE "idNodo" = [ID]
    UNION ALL
    SELECT n.* FROM "p_OrganizacionNodos" n
    JOIN tree t ON n."idPadre" = t."idNodo"
)
SELECT * FROM tree;
\`\`\`

### Tareas de un usuario
\`\`\`sql
SELECT t.* FROM "p_Tareas" t
JOIN "p_TareaAsignados" ta ON ta."idTarea" = t."idTarea"
WHERE ta."idUsuario" = [ID_USUARIO];
\`\`\`

### Bloqueos activos
\`\`\`sql
SELECT b.*, u.nombre as quien_bloquea, t.titulo as tarea
FROM "p_Bloqueos" b
JOIN "p_Usuarios" u ON b."idOrigenUsuario" = u."idUsuario"
LEFT JOIN "p_Tareas" t ON b."idTarea" = t."idTarea"
WHERE b.estado = 'Activo';
\`\`\`

---

## 📊 ESTADÍSTICAS ACTUALES

- Usuarios activos: ${await ds.query('SELECT COUNT(*) FROM "p_Usuarios" WHERE activo=true').then(r => r[0].count)}
- Nodos organización: ${organizacion.length}
- Gerencias: ${gerencias.length}
- Líderes identificados: ${lideres.length}
`;

    fs.writeFileSync('D:/planificacion/database/DATABASE_REFERENCIA.md', dbRef);
    console.log('   ✅ DATABASE_REFERENCIA.md creado');

    console.log('\n🎉 ¡Documentación generada exitosamente!');
    console.log('   - ORGANIZACION.md');
    console.log('   - EMPLEADOS_RRHH.md');
    console.log('   - DATABASE_REFERENCIA.md');

    await ds.destroy();
}

main().catch(e => {
    console.error('❌ Error:', e.message);
    console.error(e.stack);
    process.exit(1);
});
