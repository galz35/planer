/**
 * Script de Análisis de Jerarquía y Liderazgo
 * Detecta automáticamente:
 * - Líderes reales (tienen subordinados)
 * - Colaboradores simples
 * - Anomalías y casos especiales
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

interface NodoInfo {
    idNodo: number;
    nombre: string;
    tipo: string;
    idPadre: number | null;
    empleados: { id: number, nombre: string, rol: string }[];
    nodosHijos: number[];
}

interface AnalisisEmpleado {
    idUsuario: number;
    nombre: string;
    correo: string;
    esLiderReal: boolean;
    razon: string;
    nodo: string;
    tipoNodo: string;
    cantidadSubordinados: number;
    subordinadosDirectos: string[];
}

async function main() {
    await ds.initialize();
    console.log('🔌 Conectado\n');

    // 1. Obtener todos los nodos activos
    console.log('📊 Analizando estructura organizacional...\n');

    const nodos = await ds.query(`
        SELECT "idNodo", nombre, tipo, "idPadre"
        FROM "p_OrganizacionNodos"
        WHERE activo = true
        ORDER BY tipo, nombre
    `);

    // 2. Obtener todas las asignaciones usuario-nodo
    const asignaciones = await ds.query(`
        SELECT uo."idUsuario", uo."idNodo", uo.rol, 
               u.nombre, u.correo, u.activo
        FROM "p_UsuariosOrganizacion" uo
        JOIN "p_Usuarios" u ON u."idUsuario" = uo."idUsuario"
        WHERE u.activo = true
    `);

    // 3. Construir mapa de nodos
    const nodoMap: { [id: number]: NodoInfo } = {};
    for (const n of nodos) {
        nodoMap[n.idNodo] = {
            idNodo: n.idNodo,
            nombre: n.nombre,
            tipo: n.tipo,
            idPadre: n.idPadre,
            empleados: [],
            nodosHijos: []
        };
    }

    // Calcular hijos de cada nodo
    for (const n of nodos) {
        if (n.idPadre && nodoMap[n.idPadre]) {
            nodoMap[n.idPadre].nodosHijos.push(n.idNodo);
        }
    }

    // Asignar empleados a nodos
    for (const a of asignaciones) {
        if (nodoMap[a.idNodo]) {
            nodoMap[a.idNodo].empleados.push({
                id: a.idUsuario,
                nombre: a.nombre,
                rol: a.rol
            });
        }
    }

    // 4. Función para obtener todos los subordinados de un nodo (recursivo)
    function getSubordinadosDeNodo(idNodo: number): { id: number, nombre: string }[] {
        const subordinados: { id: number, nombre: string }[] = [];
        const nodo = nodoMap[idNodo];
        if (!nodo) return subordinados;

        // Agregar empleados de nodos hijos (NO del mismo nodo)
        for (const hijoId of nodo.nodosHijos) {
            const hijo = nodoMap[hijoId];
            if (hijo) {
                // Empleados directos del nodo hijo
                for (const emp of hijo.empleados) {
                    subordinados.push({ id: emp.id, nombre: emp.nombre });
                }
                // Empleados de nodos más abajo (recursivo)
                subordinados.push(...getSubordinadosDeNodo(hijoId));
            }
        }

        return subordinados;
    }

    // 5. Analizar cada empleado
    const analisis: AnalisisEmpleado[] = [];
    const empleadosAnalizados = new Set<number>();

    for (const a of asignaciones) {
        if (empleadosAnalizados.has(a.idUsuario)) continue;
        empleadosAnalizados.add(a.idUsuario);

        const nodo = nodoMap[a.idNodo];
        if (!nodo) continue;

        // Subordinados = empleados en nodos hijos
        const subordinados = getSubordinadosDeNodo(a.idNodo);

        // Filtrar: no me cuento a mí mismo
        const subordinadosReales = subordinados.filter(s => s.id !== a.idUsuario);

        let esLiderReal = false;
        let razon = '';

        // Lógica de detección
        if (a.rol === 'Lider' || a.rol === 'Gerente' || a.rol === 'Director') {
            if (subordinadosReales.length > 0) {
                esLiderReal = true;
                razon = `Rol ${a.rol} con ${subordinadosReales.length} subordinados`;
            } else {
                razon = `Rol ${a.rol} pero sin subordinados (posible área vacía)`;
            }
        } else if (subordinadosReales.length > 0) {
            esLiderReal = true;
            razon = `Tiene ${subordinadosReales.length} subordinados aunque rol es ${a.rol}`;
        } else {
            razon = 'Colaborador simple sin subordinados';
        }

        analisis.push({
            idUsuario: a.idUsuario,
            nombre: a.nombre,
            correo: a.correo,
            esLiderReal,
            razon,
            nodo: nodo.nombre,
            tipoNodo: nodo.tipo,
            cantidadSubordinados: subordinadosReales.length,
            subordinadosDirectos: subordinadosReales.slice(0, 5).map(s => s.nombre)
        });
    }

    // 6. Clasificar resultados
    const lideresReales = analisis.filter(a => a.esLiderReal);
    const colaboradores = analisis.filter(a => !a.esLiderReal && a.razon.includes('Colaborador'));
    const anomalias = analisis.filter(a =>
        (a.razon.includes('sin subordinados') && !a.razon.includes('Colaborador')) ||
        a.razon.includes('aunque rol es')
    );

    // 7. Generar reporte
    let reporte = `# ANÁLISIS DE LIDERAZGO Y JERARQUÍA
## Fecha: ${new Date().toLocaleString('es-NI')}

---

## 📊 RESUMEN EJECUTIVO

| Métrica | Cantidad |
|---------|----------|
| Total Empleados Activos | ${analisis.length} |
| **Líderes Reales** (con subordinados) | ${lideresReales.length} |
| Colaboradores (sin subordinados) | ${colaboradores.length} |
| Anomalías/Casos Especiales | ${anomalias.length} |

---

## 👔 LÍDERES REALES (Top 50)
*Empleados que tienen subordinados a cargo*

| # | Nombre | Área | Tipo | Subordinados | Ejemplos |
|---|--------|------|------|--------------|----------|
`;

    lideresReales
        .sort((a, b) => b.cantidadSubordinados - a.cantidadSubordinados)
        .slice(0, 50)
        .forEach((l, i) => {
            reporte += `| ${i + 1} | ${l.nombre} | ${l.nodo.substring(0, 40)} | ${l.tipoNodo} | ${l.cantidadSubordinados} | ${l.subordinadosDirectos.slice(0, 2).join(', ') || '-'} |\n`;
        });

    reporte += `\n---\n\n## ⚠️ ANOMALÍAS Y CASOS ESPECIALES\n*Empleados con rol de liderazgo pero sin subordinados, o viceversa*\n\n`;

    if (anomalias.length === 0) {
        reporte += `✅ No se detectaron anomalías significativas.\n`;
    } else {
        reporte += `| Nombre | Área | Razón |\n|--------|------|-------|\n`;
        anomalias.slice(0, 30).forEach(a => {
            reporte += `| ${a.nombre} | ${a.nodo.substring(0, 35)} | ${a.razon} |\n`;
        });
    }

    // 8. Estadísticas por tipo de nodo
    reporte += `\n---\n\n## 📈 DISTRIBUCIÓN POR TIPO DE NODO\n\n`;

    const porTipo: { [tipo: string]: { total: number, lideres: number } } = {};
    for (const a of analisis) {
        if (!porTipo[a.tipoNodo]) porTipo[a.tipoNodo] = { total: 0, lideres: 0 };
        porTipo[a.tipoNodo].total++;
        if (a.esLiderReal) porTipo[a.tipoNodo].lideres++;
    }

    reporte += `| Tipo Nodo | Empleados | Líderes | % Liderazgo |\n|-----------|-----------|---------|-------------|\n`;
    Object.entries(porTipo).forEach(([tipo, data]) => {
        const pct = data.total > 0 ? Math.round((data.lideres / data.total) * 100) : 0;
        reporte += `| ${tipo} | ${data.total} | ${data.lideres} | ${pct}% |\n`;
    });

    // 9. Nodos vacíos o con solo 1 persona
    const nodosVacios = Object.values(nodoMap).filter(n => n.empleados.length === 0 && n.tipo !== 'Dirección');
    const nodosSolo1 = Object.values(nodoMap).filter(n => n.empleados.length === 1 && n.nodosHijos.length === 0);

    reporte += `\n---\n\n## 🔍 NODOS ESPECIALES\n\n`;
    reporte += `### Nodos vacíos (sin empleados): ${nodosVacios.length}\n`;
    if (nodosVacios.length > 0) {
        reporte += nodosVacios.slice(0, 10).map(n => `- ${n.nombre} (${n.tipo})`).join('\n');
        if (nodosVacios.length > 10) reporte += `\n- ... y ${nodosVacios.length - 10} más`;
    }

    reporte += `\n\n### Nodos con 1 solo empleado (sin hijos): ${nodosSolo1.length}\n`;
    if (nodosSolo1.length > 0) {
        reporte += nodosSolo1.slice(0, 10).map(n =>
            `- ${n.nombre}: ${n.empleados[0]?.nombre || 'N/A'}`
        ).join('\n');
        if (nodosSolo1.length > 10) reporte += `\n- ... y ${nodosSolo1.length - 10} más`;
    }

    reporte += `\n\n---\n\n## 💡 RECOMENDACIONES\n\n`;
    reporte += `1. **Líderes detectados automáticamente**: ${lideresReales.length} empleados tienen subordinados reales.\n`;
    reporte += `2. **Revisar anomalías**: ${anomalias.length} casos requieren validación manual.\n`;
    reporte += `3. **Nodos vacíos**: Considerar desactivar o asignar personal a ${nodosVacios.length} nodos.\n`;
    reporte += `4. **Para casos especiales** (secretarias, permisos especiales): Crear tabla de permisos personalizados.\n`;

    // Guardar reporte
    fs.writeFileSync('D:/planificacion/database/ANALISIS_LIDERAZGO.md', reporte);
    console.log('✅ Reporte guardado en: D:/planificacion/database/ANALISIS_LIDERAZGO.md\n');

    // Resumen en consola
    console.log('📊 RESUMEN:');
    console.log(`   - Total empleados: ${analisis.length}`);
    console.log(`   - Líderes reales: ${lideresReales.length}`);
    console.log(`   - Colaboradores: ${colaboradores.length}`);
    console.log(`   - Anomalías: ${anomalias.length}`);
    console.log(`   - Nodos vacíos: ${nodosVacios.length}`);

    await ds.destroy();
}

main().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});
