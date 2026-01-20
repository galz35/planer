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

// Based on schema analysis:
// Column order: [idhcm], [Idhrms], [idhcm2], [LVL], [userlvl], [carnet], [carnet2], 
//               [nombre_completo](7), [correo](8), [cargo](9), [empresa], [cedula], 
//               [Departamento], [Direccion], [Nombreubicacion], [datos], 
//               [fechaingreso](16), [fechabaja](17), [fechaasignacion], ...
const CORREO_IDX = 8;
const FECHABAJA_IDX = 17;

async function run() {
    console.log('--- ACTUALIZACIÓN DE ESTADO ACTIVO (fechabaja) ---');
    const today = new Date();
    console.log(`Fecha actual: ${today.toISOString().split('T')[0]}`);

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
        const fileStream = fs.createReadStream(INPUT_FILE);
        const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

        const userRepo = ds.getRepository(Usuario);

        let countNoChange = 0;
        let countInactive = 0;
        let countPending = 0; // Futuras

        for await (const line of rl) {
            if (line.includes('INSERT [dbo].[EMP2024]')) {
                const valuesIdx = line.indexOf('VALUES (');
                if (valuesIdx === -1) continue;

                const valuesPart = line.substring(valuesIdx + 8);
                const parts = valuesPart.split(/, (?=N'|CAST|NULL|\d)/).map(p => p.replace(/^N'|'$/g, '').replace(/'$/, '').trim());

                const email = (parts[CORREO_IDX] || '').toLowerCase().trim();
                const fechaBajaRaw = parts[FECHABAJA_IDX] || 'NULL';

                if (!email.includes('@')) continue;

                // Determine status
                let shouldBeActive = true;
                let fechaBaja: Date | null = null;

                // fechabaja is NULL -> activo
                // fechabaja has CAST(N'YYYY-MM-DD' AS Date) -> check date
                if (fechaBajaRaw === 'NULL') {
                    shouldBeActive = true;
                } else if (fechaBajaRaw.includes('CAST') || /\d{4}-\d{2}-\d{2}/.test(fechaBajaRaw)) {
                    const match = fechaBajaRaw.match(/(\d{4}-\d{2}-\d{2})/);
                    if (match) {
                        fechaBaja = new Date(match[1]);
                        if (fechaBaja <= today) {
                            shouldBeActive = false;
                        } else {
                            countPending++;
                        }
                    }
                }

                const user = await userRepo.findOneBy({ correo: email });
                if (user) {
                    if (!shouldBeActive && user.activo) {
                        user.activo = false;
                        await userRepo.save(user);
                        countInactive++;
                        console.log(` - Desactivado: ${email} (Baja: ${fechaBaja?.toISOString().split('T')[0]})`);
                    } else {
                        countNoChange++;
                    }
                }
            }
        }

        console.log(`\n--- RESUMEN ---`);
        console.log(`Sin cambio (activos): ${countNoChange}`);
        console.log(`INACTIVADOS (baja <= hoy): ${countInactive}`);
        console.log(`Con baja futura (aún activos): ${countPending}`);

    } catch (e) {
        console.error(e);
    } finally {
        await ds.destroy();
    }
}

run();
