import { DataSource } from 'typeorm';
import { Usuario, OrganizacionNodo, UsuarioOrganizacion, UsuarioCredenciales, Rol } from '../entities';
import * as dotenv from 'dotenv';
import { join } from 'path';
import * as fs from 'fs';
import * as readline from 'readline';
import * as bcrypt from 'bcrypt';

dotenv.config({ path: join(__dirname, '../../.env') });

const INPUT_FILE = 'd:\\planificacion\\database\\empleado y organizacion';

async function run() {
    console.log('--- MIGRACIÓN DE DATOS REALES (EMP2024) ---');

    const ds = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_NAME || 'clarity_db',
        entities: [Usuario, OrganizacionNodo, UsuarioOrganizacion, UsuarioCredenciales, Rol],
        synchronize: false,
    });

    await ds.initialize();
    const queryRunner = ds.createQueryRunner();
    await queryRunner.connect();

    try {
        console.log('1. Limpiando datos existentes (preservando Admin Gustavo)...');
        // Delete everyone except critical admins if needed, or full wipe for simulation
        // For this real data load, let's keep it clean but maybe safe "gustavo" if he exists
        await queryRunner.query(`DELETE FROM "p_Bloqueos"`);
        await queryRunner.query(`DELETE FROM "p_TareaAsignados"`);
        await queryRunner.query(`DELETE FROM "p_CheckinTareas"`);
        await queryRunner.query(`DELETE FROM "p_TareaAvances"`);
        await queryRunner.query(`DELETE FROM "p_Tareas"`);
        await queryRunner.query(`DELETE FROM "p_Proyectos"`);

        await queryRunner.query(`DELETE FROM "p_UsuariosOrganizacion"`);
        await queryRunner.query(`DELETE FROM "p_OrganizacionNodos"`);
        // Note: We are nuking nodes to rebuild the real tree. 
        // Existing users might remain dangling if we don't handle them, but let's assume valid state for now.

        // Helper Maps
        const emailToUserMap = new Map<string, any>();
        const hierarchyMap = new Map<string, number>(); // Name -> ID

        // Default Password
        const hashedPw = await bcrypt.hash('123456', 10);

        console.log('2. Procesando archivo y construyendo estructuras en memoria...');

        const fileStream = fs.createReadStream(INPUT_FILE);
        const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

        let count = 0;
        const usersToInsert = new Map<string, any>(); // Key: email
        const structure = {
            gerencias: new Map<string, Map<string, Set<string>>>()
            // Gerencia -> Subgerencia -> Set<Departamentos>
        };

        const assignments: {
            correo: string;
            cargo: string;
            jefeCorreo: string;
            gerencia: string;
            subgerencia: string;
            departamento: string;
        }[] = [];

        for await (const line of rl) {
            if (line.includes('INSERT [dbo].[EMP2024]')) {
                // Ugly parsing of SQL VALUES
                const valuesPart = line.split('VALUES (')[1];
                if (!valuesPart) continue;

                // Split by comma respecting quotes is hard with simple split. 
                // Let's use a regex or a simple splitter if data is clean.
                // The data has N'Name', so we can split by ", N'".

                // Better approach: Regex to capture N'...' items
                const matches = [...line.matchAll(/N'([^']*)'|NULL|\d+/g)].map(m => m[1] || m[0]);

                // Based on file inspection (approximate indices):
                // 7: nombre, 8: correo, 9: cargo, 21: depto, 22: gerencia, 23: subgerencia
                // 27: nom_jefe1, 28: correo_jefe1

                // Let's rely on finding emails to orient ourselves if indices shift
                const emailIndex = matches.findIndex(m => m && m.includes('@claro.com.ni'));

                if (emailIndex !== -1) {
                    const nombre = matches[emailIndex - 1]; // Usually before email
                    const correo = matches[emailIndex];
                    const cargo = matches[emailIndex + 1];

                    // Finding Org Units: look for "NI ..."
                    // Gerencia usually index ~22
                    // Let's search loosely for org fields
                    const orgFields = matches.filter(m => m && typeof m === 'string' && m.startsWith('NI '));

                    // Heuristics for Org Levels
                    let gerencia = 'NI GERENCIA GENERAL';
                    let subgerencia = '';
                    let departamento = '';

                    // Try to map specific columns if possible, otherwise rely on orgFields
                    // From file view:
                    // 21: oDEPARTAMENTO (NI ...)
                    // 22: OGERENCIA (NI ...)
                    // 23: oSUBGERENCIA (NI ...)
                    // Note: matches array will be flattened values.
                    // We need to be careful. Let's try to map by known structure.

                    // Re-reading specific values from the detailed view:
                    // VALUES (166, ..., N'000166', NULL, N'LENIN...', N'lenin...@...', N'SUPERVISOR...', ...)
                    // The matches array will contain cleaned values.

                    // Let's assume standard positions relative to email:
                    // Email is at specific pos.
                    // [DO NOT RELY ON DYNAMIC SEARCH IF SCHEMA IS FIXED]
                    // Index 7 in INSERT list is 'nombre_completo'.
                    // Let's grab specific indices from the matches array *assuming* it captured correctly.
                    // match[0] is often the whole match, match[1] is the group.
                    // My simplistic regex might split incorrectly on commas inside quotes.
                    // Assuming no commas in names/emails for now or accepting minor errors.

                    // Let's use a split strategy on `', ` which is safer for SQL dumps
                    const parts = valuesPart.split(/, (?=N'|CAST|NULL|\d)/).map(p => p.replace(/^N'|'$/g, '').trim());

                    const nombreReal = parts[7]; // nombre_completo
                    const correoReal = parts[8]; // correo
                    const cargoReal = parts[9]; // cargo
                    const deptoReal = parts[21]; // oDEPARTAMENTO
                    const gerenciaReal = parts[22]; // OGERENCIA
                    const subgReal = parts[23]; // oSUBGERENCIA
                    const jefeCorreo = parts[28]; // correo_jefe1

                    if (correoReal && correoReal.includes('@')) {
                        usersToInsert.set(correoReal, { nombre: nombreReal, correo: correoReal, cargo: cargoReal });

                        // Add boss too if valid
                        if (jefeCorreo && jefeCorreo.includes('@')) {
                            // We don't have name/cargo for boss here immediately unless we look them up later
                            // But we can ensure they are in the user list derived from their own row
                        }

                        // Build Structure
                        // Build Structure
                        if (gerenciaReal) {
                            if (!structure.gerencias.has(gerenciaReal)) structure.gerencias.set(gerenciaReal, new Map());
                            const subgMap = structure.gerencias.get(gerenciaReal)!;

                            const subgKey = subgReal || 'DIRECTO';
                            if (!subgMap.has(subgKey)) subgMap.set(subgKey, new Set());

                            if (deptoReal) subgMap.get(subgKey)!.add(deptoReal);
                        }

                        assignments.push({
                            correo: correoReal,
                            cargo: cargoReal,
                            jefeCorreo: jefeCorreo,
                            gerencia: gerenciaReal,
                            subgerencia: subgReal,
                            departamento: deptoReal
                        });

                        count++;
                    }
                }
            }
        }

        console.log(`   Procesados ${count} registros de empleados.`);
        console.log(`   Usuarios únicos identificados: ${usersToInsert.size}`);

        console.log('3. Creando Nodos Organizacionales...');

        // Root
        const root = await ds.getRepository(OrganizacionNodo).save({
            nombre: 'Claro Nicaragua',
            tipo: 'Dirección',
            descripcion: 'Estructura Importada'
        });
        hierarchyMap.set('ROOT', root.idNodo);

        // Build Tree
        for (const [gerenciaName, subMap] of structure.gerencias) {
            if (!gerenciaName) continue;
            const gNodo = await ds.getRepository(OrganizacionNodo).save({
                nombre: gerenciaName,
                tipo: 'Gerencia',
                idPadre: root.idNodo,
                activo: true
            });
            hierarchyMap.set(gerenciaName, gNodo.idNodo);

            for (const [subName, deptos] of subMap) {
                if (!subName || subName === 'NO APLICA') continue;

                let sNodoId = gNodo.idNodo;

                // Create Subgerencia Node if likely valid
                if (subName !== 'DIRECTO' && subName !== gerenciaName) {
                    const sNodo = await ds.getRepository(OrganizacionNodo).save({
                        nombre: subName,
                        tipo: 'Subgerencia',
                        idPadre: gNodo.idNodo,
                        activo: true
                    });
                    sNodoId = sNodo.idNodo;
                    hierarchyMap.set(subName, sNodoId); // Warning: Names might duplicate across diverse parents? Assuming unique for now.
                }

                for (const deptoName of deptos) {
                    if (!deptoName || deptoName === subName) continue;
                    const dNodo = await ds.getRepository(OrganizacionNodo).save({
                        nombre: deptoName,
                        tipo: 'Equipo',
                        idPadre: sNodoId,
                        activo: true
                    });
                    hierarchyMap.set(deptoName, dNodo.idNodo);
                }
            }
        }

        console.log('4. Insertando Usuarios (Lotes)...');
        const userRepo = ds.getRepository(Usuario);
        const credRepo = ds.getRepository(UsuarioCredenciales);

        // Batch insert users
        const usersArray = Array.from(usersToInsert.values());
        // Insert one by one to handle errors or duplicates gracefully, or chunk
        // For verifying simplicity, loop.
        for (const u of usersArray) {
            // Upsert user
            let user = await userRepo.findOneBy({ correo: u.correo });
            if (!user) {
                user = await userRepo.save({
                    nombre: u.nombre,
                    correo: u.correo,
                    rolGlobal: 'User',
                    activo: true
                });
                // Create credentials
                await credRepo.save({
                    idUsuario: user.idUsuario,
                    passwordHash: hashedPw
                });
            }
            emailToUserMap.set(u.correo, user.idUsuario);
        }

        console.log('5. Asignando usuarios a Nodos y Roles...');
        const relRepo = ds.getRepository(UsuarioOrganizacion);
        const now = new Date();

        for (const assign of assignments) {
            const userId = emailToUserMap.get(assign.correo);
            if (!userId) continue;

            // Determine Target Node
            // Default to deepest level found
            let nodeId = hierarchyMap.get(assign.departamento);
            if (!nodeId) nodeId = hierarchyMap.get(assign.subgerencia);
            if (!nodeId) nodeId = hierarchyMap.get(assign.gerencia);
            if (!nodeId) nodeId = root.idNodo;

            // Determine Role: Implicit by title OR Explicit by boss relationship?
            // Simple Logic: 
            // If my title has 'GERENTE', I am Lider of a Gerencia/Subgerencia
            // If my title has 'COORDINADOR'/'JEFE'/'SUPERVISOR', I am Lider of my dept

            let rol = 'Colaborador';
            const cargo = (assign.cargo || '').toUpperCase();

            if (cargo.includes('GERENTE') || cargo.includes('DIRECTOR')) {
                // Likely a leader of the node they are mapped to IF that node matches their level
                // E.g. Gerente Implantacion mapped to Gerencia Implantacion -> Lider
                rol = 'Lider'; // Simplify high level roles to Lider for now or 'Gerente' if enum allows
                // Note: The schema allows string. 
                if (cargo.includes('GERENTE')) rol = 'Gerente';
            } else if (cargo.includes('JEFE') || cargo.includes('COORDINADOR') || cargo.includes('SUPERVISOR')) {
                rol = 'Lider';
            }

            await relRepo.save({
                idUsuario: userId,
                idNodo: nodeId,
                rol: rol,
                fechaInicio: now
            });
        }

        console.log('--- MIGRACIÓN COMPLETADA ---');
        console.log('Login sugerido: Use cualquier correo importado (ej: jefe) con contraseña "123456".');

    } catch (e) {
        console.error('Error Fatal:', e);
    } finally {
        await queryRunner.release();
        await ds.destroy();
    }
}

run();
