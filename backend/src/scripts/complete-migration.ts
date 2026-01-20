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
import * as bcrypt from 'bcrypt';

dotenv.config({ path: join(__dirname, '../../.env') });

const entities = [
    Usuario, Tarea, TareaAsignado, Proyecto, OrganizacionNodo,
    Rol, Checkin, CheckinTarea, Bloqueo, TareaAvance, AuditLog,
    UsuarioOrganizacion, UsuarioConfig, UsuarioCredenciales
];

const INPUT_FILE = 'd:\\planificacion\\database\\empleado y organizacion';

async function run() {
    console.log('--- COMPLETANDO MIGRACIÓN DE USUARIOS CHECK ---');

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
        console.log('1. Cargando estado actual...');
        // Cache existing users to avoid re-inserting
        const dbUsers = await ds.getRepository(Usuario).find({ select: ['correo', 'idUsuario'] });
        const existingEmails = new Set(dbUsers.map(u => u.correo.toLowerCase()));

        // Cache nodes
        const nodes = await ds.getRepository(OrganizacionNodo).find();
        const nodeMap = new Map();
        nodes.forEach(n => nodeMap.set(n.nombre.toUpperCase().trim(), n.idNodo));

        // Default root
        let rootNodeId = nodeMap.get('CLARO NICARAGUA') || nodes.length > 0 ? nodes[0].idNodo : 0;

        const hashedPw = await bcrypt.hash('123456', 10);

        console.log(`   Usuarios ya existentes: ${existingEmails.size}`);

        console.log('2. Procesando archivo y preparando delta...');
        const fileStream = fs.createReadStream(INPUT_FILE);
        const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

        const toInsert: { nombre: string; correo: string; rolGlobal: string; activo: boolean }[] = [];
        const toAssign: { correo: string; idNodo: number; rol: string }[] = [];
        const now = new Date();

        for await (const line of rl) {
            if (line.includes('INSERT [dbo].[EMP2024]')) {
                const valuesPart = line.split('VALUES (')[1];
                if (!valuesPart) continue;
                const parts = valuesPart.split(/, (?=N'|CAST|NULL|\d)/).map(p => p.replace(/^N'|'$/g, '').trim());

                const email = (parts[8] || '').toLowerCase().trim();
                const nombre = (parts[7] || '').trim();
                const cargo = (parts[9] || '').trim();

                // Org Logic
                const depto = (parts[21] || '').toUpperCase().trim();
                const gerencia = (parts[22] || '').toUpperCase().trim();
                const subgerencia = (parts[23] || '').toUpperCase().trim();

                if (email && email.includes('@') && !existingEmails.has(email)) {
                    // This is a missing user!
                    toInsert.push({
                        nombre,
                        correo: email,
                        rolGlobal: 'User',
                        activo: true
                    });

                    // Prepare logic for assignment (will need ID after insert)
                    // We can't batch insert with relations easily without IDs.
                    // So we'll iterate insert.

                    // Determine Node
                    let nodeId = nodeMap.get(depto);
                    if (!nodeId) nodeId = nodeMap.get(subgerencia);
                    if (!nodeId) nodeId = nodeMap.get(gerencia);
                    if (!nodeId) nodeId = rootNodeId;

                    // Determine Role
                    let rol = 'Colaborador';
                    const cargoUpper = cargo.toUpperCase();
                    if (cargoUpper.includes('GERENTE') || cargoUpper.includes('DIRECTOR') || cargoUpper.includes('JEFE') || cargoUpper.includes('COORDINADOR') || cargoUpper.includes('SUPERVISOR')) {
                        rol = 'Lider';
                    }

                    toAssign.push({
                        correo: email,
                        idNodo: nodeId,
                        rol: rol
                    });

                    // Add to prevent duplicates within file processing
                    existingEmails.add(email);
                }
            }
        }

        console.log(`   Se encontraron ${toInsert.length} usuarios nuevos para insertar.`);

        if (toInsert.length > 0) {
            console.log('3. Insertando usuarios faltantes...');

            // Chunk insertion to be safe and efficient
            const chunkSize = 100;
            const userRepo = ds.getRepository(Usuario);
            const credRepo = ds.getRepository(UsuarioCredenciales);
            const orgRepo = ds.getRepository(UsuarioOrganizacion);

            let processed = 0;

            // Loop through our pre-prepared list
            // We need to insert User -> Get ID -> Insert Creds -> Insert Org
            // Doing it individually or small batches

            for (let i = 0; i < toInsert.length; i++) {
                const uData = toInsert[i];
                const assignData = toAssign[i]; // Parallel arrays by index logic above, safer to Map but acceptable here

                try {
                    const newUser = await userRepo.save(uData);

                    await credRepo.save({
                        idUsuario: newUser.idUsuario,
                        passwordHash: hashedPw
                    });

                    await orgRepo.save({
                        idUsuario: newUser.idUsuario,
                        idNodo: assignData.idNodo,
                        rol: assignData.rol,
                        fechaInicio: now
                    });

                    processed++;
                    if (processed % 50 === 0) process.stdout.write('.');
                } catch (err) {
                    console.error(`Error insertando ${uData.correo}:`, err.message);
                }
            }
            console.log(`\n\n[COMPLETADO] Insertados: ${processed}`);
        } else {
            console.log('No se requieren acciones. Todo sincronizado.');
        }

    } catch (e) {
        console.error('Error Fatal:', e);
    } finally {
        await ds.destroy();
    }
}

run();
