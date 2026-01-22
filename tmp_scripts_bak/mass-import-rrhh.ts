
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as fs from 'fs';

config();

async function main() {
    const ds = new DataSource({
        type: 'postgres', host: process.env.DB_HOST, port: 5432, username: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME
    });
    await ds.initialize();

    const csvPath = 'd:\\planificacion\\rrhh.csv';
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    const headers = lines[0].split(';').map(h => h.trim());

    const data = lines.slice(1).map(line => {
        const values = line.split(';');
        const obj: any = {};
        headers.forEach((h, i) => {
            let val = values[i] ? values[i].trim() : null;
            if (val === 'NULL') val = null;
            obj[h] = val;
        });
        return obj;
    });

    console.log(`Starting clean import of ${data.length} records...`);

    // 1. Map email to carnet to handle duplicates properly
    const uniqueByEmail = new Map<string, any>();
    const uniqueByCarnet = new Map<string, any>();

    for (const row of data) {
        if (!row.carnet || row.carnet === 'NULL') continue;
        const correo = (row.correo && row.correo !== 'NULL') ? row.correo.toLowerCase() : null;

        // Priority: if we have multiple records for same email or carnet, take the first one or merging logic
        if (!uniqueByCarnet.has(row.carnet)) {
            uniqueByCarnet.set(row.carnet, row);
        }
        if (correo && !uniqueByEmail.has(correo)) {
            uniqueByEmail.set(correo, row);
        }
    }

    // 2. Org Nodes
    // 2. Org Nodes - SKIPPED (Legacy Schema)
    console.log('Processing organization nodes... SKIPPED due to schema mismatch');
    /*
    const orgNodes = new Map<string, any>();
    data.forEach(row => {
        if (row.idorg && row.idorg !== 'NULL') {
            orgNodes.set(row.idorg, {
                id: row.idorg,
                padre: (row.padre && row.padre !== 'NULL') ? row.padre : null,
                desc: (row.organizacion && row.organizacion !== 'NULL') ? row.organizacion : (row.ogerenza || row.oDEPARTAMENTO || 'Sin Nombre')
            });
        }
    });

    for (const node of orgNodes.values()) {
        await ds.query(`
            INSERT INTO p_organizacion_nodos (idorg, padre, descripcion, updated_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (idorg) DO UPDATE SET descripcion = EXCLUDED.descripcion, updated_at = NOW()
        `, [node.id, null, node.desc]).catch(() => { });
    }
    // Update parents
    for (const node of orgNodes.values()) {
        if (node.padre) {
            await ds.query('UPDATE p_organizacion_nodos SET padre = $1 WHERE idorg = $2', [node.padre, node.id]).catch(() => { });
        }
    }
    */

    // 3. Employees (Using UNIQUE set of carnets)
    console.log('Syncing employees...');
    const employeesToProcess = Array.from(uniqueByCarnet.values());

    // Process one by one to ensure partial success and better logging
    let successCount = 0;
    let errorCount = 0;

    for (const row of employeesToProcess) {
        try {
            const carnet = row.carnet;
            const correo = (row.correo && row.correo !== 'NULL') ? row.correo.toLowerCase() : null;

            // Ensure no other employee has this email before inserting/updating
            if (correo) {
                // Skiping legacy p_empleados update
                // await ds.query('UPDATE p_empleados SET correo = NULL WHERE correo = $1 AND carnet != $2', [correo, carnet]);
            }

            /* SKIPPED p_empleados insert
            await ds.query(`
                INSERT INTO p_empleados (
                    carnet, nombre_completo, correo, cargo, idorg, 
                    carnet_jefe1, carnet_jefe2, carnet_jefe3, carnet_jefe4,
                    activo, created_at, updated_at, fuente
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW(), 'CSV_IMPORT')
                ON CONFLICT (carnet) DO UPDATE SET
                    nombre_completo = EXCLUDED.nombre_completo,
                    correo = EXCLUDED.correo,
                    cargo = EXCLUDED.cargo,
                    idorg = EXCLUDED.idorg,
                    carnet_jefe1 = EXCLUDED.carnet_jefe1,
                    updated_at = NOW()
            `, [
                carnet, row.nombre_completo, correo, row.cargo,
                (row.idorg && row.idorg !== 'NULL') ? row.idorg : null,
                (row.carnet_jefe1 && row.carnet_jefe1 !== 'NULL') ? row.carnet_jefe1 : null,
                (row.carnet_jefe2 && row.carnet_jefe2 !== 'NULL') ? row.carnet_jefe2 : null,
                (row.carnet_jefe3 && row.carnet_jefe3 !== 'NULL') ? row.carnet_jefe3 : null,
                (row.carnet_jefe4 && row.carnet_jefe4 !== 'NULL') ? row.carnet_jefe4 : null,
                true
            ]);
            */

            if (correo) {
                // SAFE UPDATE: Solo actualiza campos organizacionales
                // NO toca: nombre, carnet, activo, rolGlobal, contraseñas
                await ds.query(`
                    INSERT INTO "p_Usuarios" (
                        nombre, carnet, correo, activo, "rolGlobal", "fechaCreacion",
                        "primer_nivel", "segundo_nivel", "tercer_nivel",
                        subgerencia, ogerencia
                    )
                    VALUES ($1, $2, $3, $4, 'Empleado', NOW(), $5, $6, $7, $8, $9)
                    ON CONFLICT (correo) DO UPDATE SET
                        "primer_nivel" = COALESCE(EXCLUDED."primer_nivel", "p_Usuarios"."primer_nivel"),
                        "segundo_nivel" = COALESCE(EXCLUDED."segundo_nivel", "p_Usuarios"."segundo_nivel"),
                        "tercer_nivel" = COALESCE(EXCLUDED."tercer_nivel", "p_Usuarios"."tercer_nivel"),
                        subgerencia = COALESCE(EXCLUDED.subgerencia, "p_Usuarios".subgerencia),
                        ogerencia = COALESCE(EXCLUDED.ogerencia, "p_Usuarios".ogerencia)
                `, [
                    row.nombre_completo || 'Importado',
                    carnet,
                    correo,
                    true,
                    row['primernivel'] || null,
                    row['segundo_nivel'] || null,
                    row['tercer_nivel'] || null,
                    row['subgerencia'] || row['oSUBGERENCIA'] || null,
                    row['ogerenza'] || row['oGERENCIA'] || row['OGERENCIA'] || null
                ]);
            }
            successCount++;
        } catch (err: any) {
            console.error(`Error processing ${row.correo || row.carnet}:`, err.message);
            errorCount++;
        }
    }
    console.log(`Finished. Success: ${successCount}, Errors: ${errorCount}`);

    console.log('IMPORT SUCCESSFUL');
    await ds.destroy();
}

main().catch(console.error);
