import { DataSource } from 'typeorm';
import { Usuario, OrganizacionNodo, UsuarioOrganizacion, UsuarioCredenciales, Rol, Tarea, TareaAsignado, Proyecto, Checkin, CheckinTarea, Bloqueo, TareaAvance, AuditLog, UsuarioConfig } from '../entities';
import * as dotenv from 'dotenv';
import { join } from 'path';
import * as fs from 'fs';
import * as readline from 'readline';

dotenv.config({ path: join(__dirname, '../../.env') });

const INPUT_FILE = 'd:\\planificacion\\database\\empleado y organizacion';

const entities = [
    Usuario, OrganizacionNodo, UsuarioOrganizacion, UsuarioCredenciales, Rol,
    Tarea, TareaAsignado, Proyecto, Checkin, CheckinTarea, Bloqueo, TareaAvance, AuditLog, UsuarioConfig
];

async function run() {
    console.log('--- REPARACIÓN RÁPIDA DE ASIGNACIONES (EMP2024) ---');

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
        console.log('1. Cargando datos de BD a memoria...');
        const users = await ds.getRepository(Usuario).find();
        const nodes = await ds.getRepository(OrganizacionNodo).find();

        const userMap = new Map(users.map(u => [u.correo.toLowerCase().trim(), u.idUsuario]));
        const nodeMap = new Map(nodes.map(n => [n.nombre.toUpperCase().trim(), n.idNodo])); // Normalize names?

        // Root node fallback
        let rootNodeId = nodeMap.get('CLARO NICARAGUA');
        if (!rootNodeId) {
            const root = nodes.find(n => n.tipo === 'Dirección');
            rootNodeId = root ? root.idNodo : 0;
        }

        console.log(`   Usuarios en BD: ${userMap.size}`);
        console.log(`   Nodos en BD: ${nodeMap.size}`);

        console.log('2. Procesando archivo para extraer relaciones...');
        const fileStream = fs.createReadStream(INPUT_FILE);
        const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

        const assignmentsToCreate: {
            idUsuario: number;
            idNodo: number;
            rol: string;
            fechaInicio: Date;
        }[] = [];
        const leadersToPromote = new Set<number>(); // UserIDs of bosses

        for await (const line of rl) {
            if (line.includes('INSERT [dbo].[EMP2024]')) {
                const valuesPart = line.split('VALUES (')[1];
                if (!valuesPart) continue;

                const parts = valuesPart.split(/, (?=N'|CAST|NULL|\d)/).map(p => p.replace(/^N'|'$/g, '').trim());

                // Indices based on previous analysis
                const correo = (parts[8] || '').toLowerCase().trim();
                const cargo = (parts[9] || '').toUpperCase();
                const depto = (parts[21] || '').toUpperCase().trim();
                const gerencia = (parts[22] || '').toUpperCase().trim();
                const subgerencia = (parts[23] || '').toUpperCase().trim();
                const jefeCorreo = (parts[28] || '').toLowerCase().trim();

                if (correo && correo.includes('@')) {
                    const userId = userMap.get(correo);
                    if (!userId) continue; // User not in DB (should check logic, but assume import 1 ran partially)

                    // Find Node
                    let nodeId = nodeMap.get(depto);
                    if (!nodeId) nodeId = nodeMap.get(subgerencia);
                    if (!nodeId) nodeId = nodeMap.get(gerencia);
                    if (!nodeId) nodeId = rootNodeId;

                    if (!nodeId) continue;

                    // Determine Role
                    let rol = 'Colaborador';
                    if (cargo.includes('GERENTE') || cargo.includes('DIRECTOR') || cargo.includes('JEFE') || cargo.includes('COORDINADOR') || cargo.includes('SUPERVISOR')) {
                        rol = 'Lider';
                    }

                    // Boss Logic: If I am someone's boss, I am a Leader (somewhere).
                    // We can't easily know where the boss *should* be leader just from this row,
                    // but we can mark them.

                    assignmentsToCreate.push({
                        idUsuario: userId,
                        idNodo: nodeId,
                        rol: rol,
                        fechaInicio: new Date()
                    });
                }
            }
        }

        console.log(`3. Insertando ${assignmentsToCreate.length} asignaciones en bloque...`);

        // Clean previous assignments to avoid dups
        await ds.query(`DELETE FROM "p_UsuariosOrganizacion"`);

        // Chunking for safety
        const chunkSize = 1000;
        for (let i = 0; i < assignmentsToCreate.length; i += chunkSize) {
            const chunk = assignmentsToCreate.slice(i, i + chunkSize);
            await ds.getRepository(UsuarioOrganizacion).save(chunk);
            console.log(`   Insertados ${Math.min(i + chunkSize, assignmentsToCreate.length)} / ${assignmentsToCreate.length}`);
        }

        console.log('--- REPARACIÓN COMPLETADA ---');

    } catch (e) {
        console.error('Error Fatal:', e);
    } finally {
        await ds.destroy();
    }
}

run();
