/**
 * Script de Análisis Exhaustivo de Estructura Organizacional
 * Genera un informe completo para entender la situación actual
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

interface DatoCompleto {
    nodos: any[];
    asignaciones: any[];
    usuariosSinNodo: any[];
    nodosVacios: any[];
    jerarquia: any;
    problemas: string[];
    estadisticas: any;
}

async function main() {
    await ds.initialize();
    console.log('🔌 Conectado\n');
    console.log('📊 Analizando estructura completa...\n');

    const datos: DatoCompleto = {
        nodos: [],
        asignaciones: [],
        usuariosSinNodo: [],
        nodosVacios: [],
        jerarquia: {},
        problemas: [],
        estadisticas: {}
    };

    // 1. OBTENER TODOS LOS NODOS
    console.log('1️⃣ Obteniendo nodos...');
    datos.nodos = await ds.query(`
        SELECT "idNodo", nombre, tipo, "idPadre", activo
        FROM "p_OrganizacionNodos"
        ORDER BY 
            CASE tipo 
                WHEN 'Dirección' THEN 1 
                WHEN 'Gerencia' THEN 2 
                WHEN 'Subgerencia' THEN 3 
                WHEN 'Equipo' THEN 4 
                ELSE 5 
            END,
            nombre
    `);
    console.log(`   ✅ ${datos.nodos.length} nodos encontrados`);

    // 2. OBTENER TODAS LAS ASIGNACIONES USUARIO-NODO
    console.log('2️⃣ Obteniendo asignaciones usuario-nodo...');
    datos.asignaciones = await ds.query(`
        SELECT 
            uo."idUsuario", 
            uo."idNodo", 
            uo.rol as "rolEnNodo",
            u.nombre as "nombreUsuario",
            u.correo,
            u.activo as "usuarioActivo",
            n.nombre as "nombreNodo",
            n.tipo as "tipoNodo",
            n."idPadre",
            r.nombre as "rolSistema"
        FROM "p_UsuariosOrganizacion" uo
        JOIN "p_Usuarios" u ON u."idUsuario" = uo."idUsuario"
        JOIN "p_OrganizacionNodos" n ON n."idNodo" = uo."idNodo"
        LEFT JOIN "p_Roles" r ON r."idRol" = u."idRol"
        WHERE u.activo = true
        ORDER BY n.tipo, n.nombre, uo.rol, u.nombre
    `);
    console.log(`   ✅ ${datos.asignaciones.length} asignaciones encontradas`);

    // 3. USUARIOS SIN NODO ASIGNADO
    console.log('3️⃣ Buscando usuarios sin nodo...');
    datos.usuariosSinNodo = await ds.query(`
        SELECT u."idUsuario", u.nombre, u.correo
        FROM "p_Usuarios" u
        LEFT JOIN "p_UsuariosOrganizacion" uo ON uo."idUsuario" = u."idUsuario"
        WHERE u.activo = true AND uo."idRelacion" IS NULL
    `);
    console.log(`   ✅ ${datos.usuariosSinNodo.length} usuarios sin nodo`);

    // 4. NODOS VACÍOS
    console.log('4️⃣ Buscando nodos vacíos...');
    datos.nodosVacios = await ds.query(`
        SELECT n."idNodo", n.nombre, n.tipo
        FROM "p_OrganizacionNodos" n
        LEFT JOIN "p_UsuariosOrganizacion" uo ON uo."idNodo" = n."idNodo"
        WHERE n.activo = true
        GROUP BY n."idNodo", n.nombre, n.tipo
        HAVING COUNT(uo."idRelacion") = 0
    `);
    console.log(`   ✅ ${datos.nodosVacios.length} nodos sin empleados`);

    // 5. ESTADÍSTICAS POR TIPO DE NODO
    console.log('5️⃣ Calculando estadísticas...');
    const statsPorTipo = await ds.query(`
        SELECT n.tipo, COUNT(DISTINCT n."idNodo") as nodos, COUNT(DISTINCT uo."idUsuario") as empleados
        FROM "p_OrganizacionNodos" n
        LEFT JOIN "p_UsuariosOrganizacion" uo ON uo."idNodo" = n."idNodo"
        WHERE n.activo = true
        GROUP BY n.tipo
        ORDER BY 
            CASE n.tipo 
                WHEN 'Dirección' THEN 1 
                WHEN 'Gerencia' THEN 2 
                WHEN 'Subgerencia' THEN 3 
                WHEN 'Equipo' THEN 4 
                ELSE 5 
            END
    `);

    const statsRoles = await ds.query(`
        SELECT uo.rol, COUNT(*) as cantidad
        FROM "p_UsuariosOrganizacion" uo
        JOIN "p_Usuarios" u ON u."idUsuario" = uo."idUsuario"
        WHERE u.activo = true
        GROUP BY uo.rol
        ORDER BY cantidad DESC
    `);

    const topNodos = await ds.query(`
        SELECT n.nombre, n.tipo, COUNT(uo."idUsuario") as empleados
        FROM "p_OrganizacionNodos" n
        JOIN "p_UsuariosOrganizacion" uo ON uo."idNodo" = n."idNodo"
        WHERE n.activo = true
        GROUP BY n."idNodo", n.nombre, n.tipo
        ORDER BY empleados DESC
        LIMIT 20
    `);

    datos.estadisticas = { statsPorTipo, statsRoles, topNodos };
    console.log('   ✅ Estadísticas calculadas');

    // 6. IDENTIFICAR PROBLEMAS
    console.log('6️⃣ Identificando problemas...');

    // Problema: Demasiados en nodo raíz
    const enRaiz = datos.asignaciones.filter(a => a.tipoNodo === 'Dirección').length;
    if (enRaiz > 10) {
        datos.problemas.push(`⚠️ ${enRaiz} empleados asignados directamente a la Dirección (debería ser ~2-5 max)`);
    }

    // Problema: Nodos con nombre "0"
    const nodosCero = datos.nodos.filter(n => n.nombre === '0' || n.nombre === '');
    if (nodosCero.length > 0) {
        datos.problemas.push(`⚠️ ${nodosCero.length} nodos con nombre vacío o "0" (datos corruptos)`);
    }

    // Problema: Empleados en nodos corruptos
    const enNodosCero = datos.asignaciones.filter(a => a.nombreNodo === '0' || a.nombreNodo === '').length;
    if (enNodosCero > 0) {
        datos.problemas.push(`⚠️ ${enNodosCero} empleados asignados a nodos con nombre "0" o vacío`);
    }

    // Problema: Líderes sin subordinados reales
    const lideresEnEquipo = datos.asignaciones.filter(a =>
        a.rolEnNodo === 'Lider' && a.tipoNodo === 'Equipo'
    );

    console.log(`   ✅ ${datos.problemas.length} problemas detectados`);

    // 7. CONSTRUIR JERARQUÍA
    console.log('7️⃣ Construyendo jerarquía...');
    const nodoMap: { [id: number]: any } = {};
    for (const n of datos.nodos) {
        nodoMap[n.idNodo] = {
            ...n,
            empleados: datos.asignaciones
                .filter(a => a.idNodo === n.idNodo)
                .map(a => ({ nombre: a.nombreUsuario, rol: a.rolEnNodo, correo: a.correo })),
            hijos: []
        };
    }
    for (const n of datos.nodos) {
        if (n.idPadre && nodoMap[n.idPadre]) {
            nodoMap[n.idPadre].hijos.push(nodoMap[n.idNodo]);
        }
    }
    datos.jerarquia = nodoMap;

    // 8. GENERAR DOCUMENTO
    console.log('\n📝 Generando documento de análisis...\n');

    let doc = `# ANÁLISIS COMPLETO DE ESTRUCTURA ORGANIZACIONAL Y PERMISOS
## Fecha de Análisis: ${new Date().toLocaleString('es-NI')}

---

# PARTE 1: ESTADO ACTUAL DE LA BASE DE DATOS

## 1.1 Resumen General

| Concepto | Cantidad |
|----------|----------|
| Total Nodos Organizacionales | ${datos.nodos.filter(n => n.activo).length} |
| Nodos Activos con Empleados | ${datos.nodos.length - datos.nodosVacios.length} |
| Nodos Vacíos (sin empleados) | ${datos.nodosVacios.length} |
| Total Empleados Activos | ${new Set(datos.asignaciones.map(a => a.idUsuario)).size} |
| Empleados sin Nodo Asignado | ${datos.usuariosSinNodo.length} |

## 1.2 Distribución por Tipo de Nodo

| Tipo | Nodos | Empleados Asignados |
|------|-------|---------------------|
`;

    statsPorTipo.forEach((s: any) => {
        doc += `| ${s.tipo || 'Sin Tipo'} | ${s.nodos} | ${s.empleados} |\n`;
    });

    doc += `
## 1.3 Distribución por Rol en Organización

| Rol | Cantidad |
|-----|----------|
`;

    statsRoles.forEach((s: any) => {
        doc += `| ${s.rol || 'Sin Rol'} | ${s.cantidad} |\n`;
    });

    doc += `
## 1.4 Top 20 Nodos con Más Empleados

| # | Nodo | Tipo | Empleados |
|---|------|------|-----------|
`;

    topNodos.forEach((n: any, i: number) => {
        doc += `| ${i + 1} | ${n.nombre.substring(0, 45)} | ${n.tipo} | ${n.empleados} |\n`;
    });

    doc += `
---

# PARTE 2: PROBLEMAS DETECTADOS

`;

    if (datos.problemas.length === 0) {
        doc += `✅ No se detectaron problemas críticos.\n`;
    } else {
        datos.problemas.forEach((p, i) => {
            doc += `${i + 1}. ${p}\n`;
        });
    }

    doc += `
## 2.1 Problema Principal: Empleados en Nodo Raíz

Actualmente hay **${enRaiz} empleados** asignados directamente al nodo "Claro Nicaragua" (Dirección).

**Lo correcto sería:**
- Solo el Director General (Antonio Vega) y su asistente (Victoria Roman) en la Dirección
- El resto de empleados asignados a sus Gerencias/Subgerencias/Equipos correspondientes

**Impacto:**
- El sistema calcula que cualquier persona en el nodo Dirección tiene TODOS los empleados como subordinados
- Esto distorsiona los reportes y la lógica de liderazgo

## 2.2 Nodos Corruptos (nombre "0")

Hay ${nodosCero.length} nodos con nombre vacío o "0", con ${enNodosCero} empleados asignados.

---

# PARTE 3: ESTRUCTURA JERÁRQUICA CORRECTA

## 3.1 Jerarquía Esperada

\`\`\`
📂 CLARO NICARAGUA (Dirección)
    └── Antonio Vega (Director General, rol: Lider/Director)
    └── Victoria Roman (Asistente, rol: Colaborador)
    │
    ├── 📁 GERENCIA DE RECURSOS HUMANOS
    │   ├── [Gerente RRHH] (rol: Lider)
    │   ├── 📁 SUBGERENCIA DE RECURSOS HUMANOS
    │   │   ├── [Subgerente] (rol: Lider)
    │   │   └── 📁 COORD. DE RECURSOS HUMANOS
    │   │       ├── [Coordinador] (rol: Lider)
    │   │       └── [Colaboradores] (rol: Colaborador/Miembro)
    │   └── 📁 SUBGERENCIA DE COMPENSACIONES
    │       └── ...
    │
    ├── 📁 GERENCIA COMERCIAL
    │   └── ...
    │
    └── 📁 GERENCIA TÉCNICA
        └── ...
\`\`\`

## 3.2 Lógica de Liderazgo

Un empleado es **LÍDER REAL** si:
1. Tiene rol "Lider", "Gerente" o "Director" en su nodo
2. El nodo donde está tiene nodos hijos
3. Los nodos hijos tienen empleados asignados

Ejemplo:
- Gerente de RRHH → Es líder porque su gerencia tiene subgerencias con empleados
- Coordinador de Reclutamiento → Es líder si tiene colaboradores en su equipo
- Colaborador en equipo sin hijos → NO es líder

---

# PARTE 4: SISTEMA DE PERMISOS PROPUESTO

## 4.1 Permisos Actuales (Basados en Jerarquía)

Actualmente el sistema usa la **jerarquía organizacional** para determinar quién ve a quién:

\`\`\`
┌─────────────────────────────────────────────────────────────────┐
│                     PERMISOS POR JERARQUÍA                      │
├─────────────────────────────────────────────────────────────────┤
│ Usuario → Ve empleados de su nodo + todos los nodos hijos      │
│                                                                 │
│ Gerente RRHH → Ve todos en RRHH (Subgerencias, Equipos)         │
│ Coordinador → Ve solo su equipo                                 │
│ Colaborador → Ve solo sus propias tareas                        │
└─────────────────────────────────────────────────────────────────┘
\`\`\`

## 4.2 PROPUESTA: Permisos Especiales

Para manejar los **casos especiales** que mencionas (secretarias, accesos cruzados, etc.), propongo crear una nueva tabla de permisos:

### Tabla: \`p_PermisosEspeciales\`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| idPermiso | SERIAL PK | Identificador único |
| idUsuario | INT FK | Usuario que recibe el permiso |
| tipoPermiso | ENUM | 'VER_USUARIO', 'VER_NODO', 'VER_PROYECTO', 'NEGAR_NODO' |
| idObjetivo | INT | ID del usuario/nodo/proyecto afectado |
| permisoNivel | ENUM | 'LECTURA', 'ESCRITURA', 'COMPLETO' |
| otorgadoPor | INT FK | Quién dio el permiso |
| fechaInicio | DATE | Cuándo inicia el permiso |
| fechaFin | DATE NULL | Cuándo expira (NULL = permanente) |
| motivo | TEXT | Razón del permiso especial |
| activo | BOOLEAN | Si está activo |

### Tipos de Permisos Especiales:

#### 1. VER_USUARIO
Permite ver las tareas/agenda de un usuario específico, aunque no sea subordinado.

\`\`\`
Ejemplo: Secretaria de Gerente puede ver tareas de empleados específicos
┌────────────────────────────────────────────┐
│ idPermiso: 1                               │
│ idUsuario: Victoria Roman (secretaria)     │
│ tipoPermiso: VER_USUARIO                   │
│ idObjetivo: 456 (Juan Pérez - Comercial)   │
│ permisoNivel: LECTURA                      │
│ otorgadoPor: Antonio Vega                  │
│ motivo: "Seguimiento de proyectos clave"   │
└────────────────────────────────────────────┘
\`\`\`

#### 2. VER_NODO
Permite ver todos los empleados de un nodo (área/gerencia), aunque no sea su jefe.

\`\`\`
Ejemplo: Jefe de Proyecto de TI ve a personal de Comercial para coordinación
┌────────────────────────────────────────────┐
│ idPermiso: 2                               │
│ idUsuario: María López (Jefe Proyectos TI) │
│ tipoPermiso: VER_NODO                      │
│ idObjetivo: 129 (Gerencia Comercial)       │
│ permisoNivel: LECTURA                      │
│ otorgadoPor: Antonio Vega                  │
│ motivo: "Proyecto integración CRM"         │
└────────────────────────────────────────────┘
\`\`\`

#### 3. VER_PROYECTO
Permite ver tareas de un proyecto específico, aunque no sea participante directo.

\`\`\`
Ejemplo: Auditor interno ve tareas del proyecto de Compliance
┌────────────────────────────────────────────┐
│ idPermiso: 3                               │
│ idUsuario: Carlos Ruiz (Auditor)           │
│ tipoPermiso: VER_PROYECTO                  │
│ idObjetivo: 45 (Proyecto Compliance 2024)  │
│ permisoNivel: LECTURA                      │
│ otorgadoPor: Antonio Vega                  │
│ motivo: "Auditoría trimestral"             │
└────────────────────────────────────────────┘
\`\`\`

#### 4. NEGAR_NODO (Excepción negativa)
Bloquea acceso a un nodo que normalmente vería por jerarquía.

\`\`\`
Ejemplo: Gerente General no debe ver información de Auditoría Interna
┌────────────────────────────────────────────┐
│ idPermiso: 4                               │
│ idUsuario: Director Comercial              │
│ tipoPermiso: NEGAR_NODO                    │
│ idObjetivo: 999 (Auditoría Interna)        │
│ permisoNivel: COMPLETO (bloquea todo)      │
│ otorgadoPor: Directorio                    │
│ motivo: "Independencia de auditoría"       │
└────────────────────────────────────────────┘
\`\`\`

## 4.3 Lógica de Evaluación de Permisos

\`\`\`
función puedeVerUsuario(solicitante, objetivo):
    
    // 1. NEGAR primero (máxima prioridad)
    si existe NEGAR_NODO donde solicitante tiene negado el nodo del objetivo:
        return FALSO
    
    // 2. Permisos especiales (segunda prioridad)
    si existe VER_USUARIO donde solicitante tiene permiso para objetivo:
        return nivel_permiso
    
    si existe VER_NODO donde solicitante tiene permiso para nodo del objetivo:
        return nivel_permiso
    
    // 3. Jerarquía organizacional (fallback)
    si objetivo está en subárbol de solicitante:
        return VERDADERO (por jerarquía)
    
    // 4. Default: sin acceso
    return FALSO
\`\`\`

## 4.4 Niveles de Permiso

| Nivel | Puede Ver | Puede Editar | Puede Asignar |
|-------|-----------|--------------|---------------|
| LECTURA | ✅ Tareas, Check-ins, Bloqueos | ❌ | ❌ |
| ESCRITURA | ✅ Todo | ✅ Comentarios, Estados | ❌ |
| COMPLETO | ✅ Todo | ✅ Todo | ✅ Puede asignar tareas |

---

# PARTE 5: IMPLEMENTACIÓN SUGERIDA

## 5.1 Paso 1: Crear Tabla de Permisos

\`\`\`sql
CREATE TABLE "p_PermisosEspeciales" (
    "idPermiso" SERIAL PRIMARY KEY,
    "idUsuario" INTEGER NOT NULL REFERENCES "p_Usuarios"("idUsuario"),
    "tipoPermiso" VARCHAR(20) NOT NULL CHECK ("tipoPermiso" IN ('VER_USUARIO', 'VER_NODO', 'VER_PROYECTO', 'NEGAR_NODO')),
    "idObjetivo" INTEGER NOT NULL,
    "permisoNivel" VARCHAR(15) NOT NULL DEFAULT 'LECTURA' CHECK ("permisoNivel" IN ('LECTURA', 'ESCRITURA', 'COMPLETO')),
    "otorgadoPor" INTEGER REFERENCES "p_Usuarios"("idUsuario"),
    "fechaInicio" DATE NOT NULL DEFAULT CURRENT_DATE,
    "fechaFin" DATE NULL,
    "motivo" TEXT,
    "activo" BOOLEAN DEFAULT TRUE,
    "fechaCreacion" TIMESTAMP DEFAULT NOW(),
    UNIQUE("idUsuario", "tipoPermiso", "idObjetivo")
);

CREATE INDEX idx_permisos_usuario ON "p_PermisosEspeciales"("idUsuario", "activo");
CREATE INDEX idx_permisos_objetivo ON "p_PermisosEspeciales"("tipoPermiso", "idObjetivo");
\`\`\`

## 5.2 Paso 2: Actualizar Servicio de Permisos

El servicio actual (tasks.service.ts) usa \`getSubtreeUserIds\` para obtener subordinados.
Se debe modificar para:

1. Llamar a \`getSubtreeUserIds\` (jerarquía normal)
2. Agregar usuarios de \`VER_USUARIO\` especiales
3. Agregar usuarios de nodos en \`VER_NODO\` especiales
4. Restar usuarios cuyo nodo esté en \`NEGAR_NODO\`

## 5.3 Paso 3: UI de Administración

Crear pantalla en /admin para:
- Ver permisos especiales existentes
- Agregar nuevos permisos
- Revocar permisos
- Historial de cambios

---

# PARTE 6: ACCIONES INMEDIATAS RECOMENDADAS

## 6.1 Corregir Datos Actuales

1. **Reasignar empleados del nodo raíz** a sus nodos correctos
   - Mantener solo Antonio Vega y Victoria Roman en Dirección
   - Mover el resto a sus Gerencias/Equipos correspondientes

2. **Limpiar nodos corruptos** (nombre "0")
   - Reasignar empleados a nodos válidos
   - Desactivar o eliminar nodos corruptos

3. **Validar líderes**
   - Revisar que el rol "Lider" coincida con tener subordinados reales

## 6.2 Para el Módulo de Importación Excel

Columnas necesarias en el Excel:
| Columna | Descripción | Ejemplo |
|---------|-------------|---------|
| Nombre | Nombre completo | JUAN CARLOS PEREZ |
| Correo | Email corporativo | juan.perez@claro.com.ni |
| Teléfono | Opcional | 8888-1234 |
| Área | Nombre del nodo | NI GERENCIA DE RECURSOS HUMANOS |
| Cargo | Rol en el nodo | Lider / Colaborador / Miembro |
| Jefe Directo | Correo del jefe | maria.lopez@claro.com.ni |

## 6.3 Prioridad de Tareas

| # | Tarea | Prioridad | Esfuerzo |
|---|-------|-----------|----------|
| 1 | Obtener Excel con estructura correcta | 🔴 Alta | Depende de RRHH |
| 2 | Crear módulo de importación | 🔴 Alta | 2-3 días |
| 3 | Ejecutar migración correctiva | 🔴 Alta | 1 día |
| 4 | Crear tabla p_PermisosEspeciales | 🟡 Media | 1 hora |
| 5 | Modificar lógica de permisos | 🟡 Media | 1 día |
| 6 | UI de administración de permisos | 🟢 Baja | 2 días |

---

# RESUMEN

La estructura actual tiene un **problema de migración**: la mayoría de empleados están asignados al nodo raíz "Claro Nicaragua" en lugar de sus áreas específicas. Esto causa que el sistema calcule incorrectamente quién es jefe de quién.

**Solución:**
1. Obtener datos correctos desde Excel/RRHH
2. Reasignar empleados a nodos correctos
3. Implementar tabla de permisos especiales para casos excepcionales

**El sistema de permisos propuesto** permite:
- ✅ Mantener la jerarquía natural como base
- ✅ Agregar excepciones positivas (secretarias, auditoría, proyectos cruzados)
- ✅ Agregar excepciones negativas (áreas confidenciales)
- ✅ Auditar quién dio cada permiso y por qué

---

*Documento generado automáticamente - ${new Date().toLocaleString('es-NI')}*
`;

    // Guardar documento
    fs.writeFileSync('D:/planificacion/aprendizaje/02_ESTRUCTURA_PERMISOS.md', doc);
    console.log('✅ Documento guardado en: D:/planificacion/aprendizaje/02_ESTRUCTURA_PERMISOS.md');

    // También guardar datos JSON para referencia
    fs.writeFileSync('D:/planificacion/database/analisis_completo.json', JSON.stringify({
        fecha: new Date().toISOString(),
        estadisticas: datos.estadisticas,
        problemas: datos.problemas,
        usuariosSinNodo: datos.usuariosSinNodo.slice(0, 50),
        nodosVacios: datos.nodosVacios,
        empleadosEnDireccion: datos.asignaciones
            .filter(a => a.tipoNodo === 'Dirección')
            .map(a => ({ nombre: a.nombreUsuario, rol: a.rolEnNodo, correo: a.correo }))
    }, null, 2));
    console.log('✅ Datos JSON guardados en: D:/planificacion/database/analisis_completo.json');

    await ds.destroy();
    console.log('\n🎉 Análisis completado');
}

main().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});
