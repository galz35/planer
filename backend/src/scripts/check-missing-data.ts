import { DataSource } from 'typeorm';
import {
    Usuario, Tarea, TareaAsignado, Proyecto, OrganizacionNodo,
    Rol, Checkin, CheckinTarea, Bloqueo, TareaAvance, AuditLog,
    UsuarioOrganizacion, UsuarioConfig, UsuarioCredenciales
} from '../entities';
import * as dotenv from 'dotenv';
import { join } from 'path';
import * as fs from 'fs';
import * as readline from 'readline';

dotenv.config({ path: join(__dirname, '../../.env') });

const entities = [
    Usuario, Tarea, TareaAsignado, Proyecto, OrganizacionNodo,
    Rol, Checkin, CheckinTarea, Bloqueo, TareaAvance, AuditLog,
    UsuarioOrganizacion, UsuarioConfig, UsuarioCredenciales
];

const INPUT_FILE = 'd:\\planificacion\\database\\empleado y organizacion';
const OUTPUT_FILE = 'd:\\planificacion\\MIGRATION_PROGRESS.md';

async function checkMissing() {
    console.log('--- VERIFICANDO DATOS FALTANTES ---');

    const ds = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_NAME || 'clarity_db',
        entities: entities,
        synchronize: false,
    });

    await ds.initialize();

    try {
        // 1. Scan File
        console.log('1. Escaneando archivo fuente...');
        const fileStream = fs.createReadStream(INPUT_FILE);
        const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

        const fileUsers = new Set<string>();
        const fileNodes = new Set<string>();

        let totalLines = 0;

        for await (const line of rl) {
            if (line.includes('INSERT [dbo].[EMP2024]')) {
                totalLines++;
                const valuesPart = line.split('VALUES (')[1];
                if (!valuesPart) continue;
                const parts = valuesPart.split(/, (?=N'|CAST|NULL|\d)/).map(p => p.replace(/^N'|'$/g, '').trim());

                // User
                const email = (parts[8] || '').toLowerCase().trim();
                const nombre = (parts[7] || '').trim();

                if (email && email.includes('@') && email !== 'null') {
                    fileUsers.add(email);
                }

                // Nodes
                const depto = (parts[21] || '').toUpperCase().trim();
                const gerencia = (parts[22] || '').toUpperCase().trim();
                const subgerencia = (parts[23] || '').toUpperCase().trim();

                if (gerencia && gerencia !== 'NULL') fileNodes.add(gerencia);
                if (subgerencia && subgerencia !== 'NULL' && subgerencia !== 'NO APLICA') fileNodes.add(subgerencia);
                if (depto && depto !== 'NULL' && depto !== 'NO APLICA') fileNodes.add(depto);
            }
        }

        console.log(`   Encontrados en archivo: ${fileUsers.size} usuarios, ${fileNodes.size} nodos únicos.`);

        // 2. Query DB
        console.log('2. Consultando base de datos...');
        const dbUsers = await ds.getRepository(Usuario).find({ select: ['correo'] });
        const dbNodes = await ds.getRepository(OrganizacionNodo).find({ select: ['nombre'] });

        const dbUserSet = new Set(dbUsers.map(u => u.correo.toLowerCase()));
        const dbNodeSet = new Set(dbNodes.map(n => n.nombre.toUpperCase().trim()));

        // 3. Calculate Diff
        const missingUsers = [...fileUsers].filter(email => !dbUserSet.has(email));
        // Org nodes might have slight variations or be 'DIRECTO', so exact match might be strict
        // But let's report exact name mismatches
        const missingNodes = [...fileNodes].filter(node => !dbNodeSet.has(node));

        console.log(`   Faltantes: ${missingUsers.length} usuarios, ${missingNodes.length} nodos.`);

        // 4. Generate Report
        let report = `# Reporte de Progreso de Migración\n\n`;
        report += `**Fecha:** ${new Date().toLocaleString()}\n`;
        report += `**Total Registros Analizados:** ${totalLines}\n\n`;

        report += `## Resumen\n`;
        report += `| Entidad | Total en Archivo | Total en BD | Faltantes |\n`;
        report += `| :--- | :--- | :--- | :--- |\n`;
        report += `| Usuarios | ${fileUsers.size} | ${dbUserSet.size} | **${missingUsers.length}** |\n`;
        report += `| Nodos (Org) | ${fileNodes.size} | ${dbNodeSet.size} | **${missingNodes.length}** |\n\n`;

        report += `## Detalles de Faltantes\n\n`;

        report += `### Usuarios Faltantes (${missingUsers.length})\n`;
        if (missingUsers.length > 0) {
            report += `> Estos usuarios existen en el archivo pero no están en la Base de Datos.\n\n`;
            missingUsers.slice(0, 200).forEach(u => report += `- ${u}\n`); // Cap output
            if (missingUsers.length > 200) report += `- ... y ${missingUsers.length - 200} más.\n`;
        } else {
            report += `- *Ninguno. Todos los usuarios han sido migrados éxito.*\n`;
        }

        report += `\n### Nodos Organizacionales Faltantes (${missingNodes.length})\n`;
        if (missingNodes.length > 0) {
            report += `> Nodos (Gerencias, Deptos) detectados en archivo pero no encontrados con nombre exacto en BD.\n\n`;
            missingNodes.slice(0, 200).forEach(n => report += `- ${n}\n`);
            if (missingNodes.length > 200) report += `- ... y ${missingNodes.length - 200} más.\n`;
        } else {
            report += `- *Ninguno. Estructura completa.*\n`;
        }

        fs.writeFileSync(OUTPUT_FILE, report);
        console.log(`Reporte generado en: ${OUTPUT_FILE}`);

    } catch (e) {
        console.error(e);
    } finally {
        await ds.destroy();
    }
}
checkMissing();
