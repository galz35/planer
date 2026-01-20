import { DataSource } from 'typeorm';
import { OrganizacionNodo } from '../entities';
import * as dotenv from 'dotenv';
import { join } from 'path';
import * as fs from 'fs';
import * as readline from 'readline';

dotenv.config({ path: join(__dirname, '../../.env') });

const INPUT_FILE = 'd:\\planificacion\\database\\empleado y organizacion';

async function run() {
    console.log('--- RECONSTRUCCIÓN DE ESTRUCTURA ORGANIZACIONAL ---');

    const ds = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_NAME || 'clarity_db',
        entities: [OrganizacionNodo],
        synchronize: false,
    });

    await ds.initialize();

    try {
        console.log('1. Extrayendo estructura única desde archivo...');
        const fileStream = fs.createReadStream(INPUT_FILE);
        const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

        const gerencias = new Set<string>();
        const subgerencias = new Map<string, string>(); // Sub -> Gerencia Padre
        const departamentos = new Map<string, string>(); // Depto -> Sub Padre (o Gerencia)

        for await (const line of rl) {
            if (line.includes('INSERT [dbo].[EMP2024]')) {
                const valuesPart = line.split('VALUES (')[1];
                if (!valuesPart) continue;
                const parts = valuesPart.split(/, (?=N'|CAST|NULL|\d)/).map(p => p.replace(/^N'|'$/g, '').trim());

                const depto = (parts[21] || '').toUpperCase().trim();
                const gerencia = (parts[22] || '').toUpperCase().trim();
                const subgerencia = (parts[23] || '').toUpperCase().trim();

                if (gerencia && gerencia !== 'NULL') {
                    gerencias.add(gerencia);

                    if (subgerencia && subgerencia !== 'NULL' && subgerencia !== 'NO APLICA' && subgerencia !== gerencia) {
                        subgerencias.set(subgerencia, gerencia);

                        if (depto && depto !== 'NULL' && depto !== subgerencia) {
                            departamentos.set(depto, subgerencia);
                        }
                    } else if (depto && depto !== 'NULL' && depto !== gerencia) {
                        // Depto depends directly on Gerencia
                        departamentos.set(depto, gerencia);
                    }
                }
            }
        }

        console.log(`Extracción: ${gerencias.size} Gerencias, ${subgerencias.size} Subgerencias, ${departamentos.size} Deptos.`);

        console.log('2. Limpiando nodos antiguos...');
        // Necesitamos borrar en orden inverso o usar CASCADE.
        // Asignaciones ya se borran en el otro script, pero aquí limpiamos la pizarra de nodos.
        // Pero CUIDADO con FKs de Proyectos. 
        // Asumimos que los proyectos están limpios o aceptaremos el error y solo agregaremos los faltantes.
        // Mejor estrategia: UPSERT (Buscar si existe, si no crear).

        const nodeRepo = ds.getRepository(OrganizacionNodo);

        // Root
        let root = await nodeRepo.findOneBy({ nombre: 'Claro Nicaragua' });
        if (!root) {
            root = await nodeRepo.save({ nombre: 'Claro Nicaragua', tipo: 'Dirección' });
        }

        const nodeCache = new Map<string, number>();
        nodeCache.set('CLARO NICARAGUA', root.idNodo);

        // Helper
        const getOrCreate = async (name: string, type: string, parentId: number) => {
            const key = name.toUpperCase();
            if (nodeCache.has(key)) return nodeCache.get(key)!;

            let node = await nodeRepo.findOneBy({ nombre: name }); // Case sensitive search usually in TypeORM depending on collation
            // Let's rely on exact name match from file which is consistent
            if (!node) {
                node = await nodeRepo.save({ nombre: name, tipo: type, idPadre: parentId, activo: true });
            }
            nodeCache.set(key, node.idNodo);
            return node.idNodo;
        };

        // Insert Gerencias
        for (const g of gerencias) {
            await getOrCreate(g, 'Gerencia', root.idNodo);
        }

        // Insert Subgerencias
        for (const [sub, parent] of subgerencias) {
            const pid = nodeCache.get(parent.toUpperCase());
            if (pid) await getOrCreate(sub, 'Subgerencia', pid);
        }

        // Insert Deptos
        for (const [depto, parent] of departamentos) {
            const pid = nodeCache.get(parent.toUpperCase());
            if (pid) await getOrCreate(depto, 'Equipo', pid);
        }

        console.log('--- ESTRUCTURA COMPLETADA ---');

    } catch (e) {
        console.error('Error Fatal:', e);
    } finally {
        await ds.destroy();
    }
}

run();
