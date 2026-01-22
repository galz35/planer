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

async function verifyHierarchy() {
    console.log('--- VERIFICACIÓN DE JERARQUÍA Y ESTADO ---');
    console.log('Nota: Clarity usa "Líder de Nodo" como Jefe Inmediato.');

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

        let samples = 0;
        const maxSamples = 5;

        for await (const line of rl) {
            if (line.includes('INSERT [dbo].[EMP2024]')) {
                const valuesPart = line.split('VALUES (')[1];
                if (!valuesPart) continue;
                const parts = valuesPart.split(/, (?=N'|CAST|NULL|\d)/).map(p => p.replace(/^N'|'$/g, '').trim());

                const email = (parts[8] || '').toLowerCase().trim();
                const jefeEmail = (parts[28] || '').toLowerCase().trim(); // Based on index 28 from strict analysis before
                const jefeNombre = (parts[27] || '').trim();

                if (email && email.includes('@') && jefeEmail && jefeEmail.includes('@')) {
                    // Check DB
                    const user = await ds.getRepository(Usuario).findOne({
                        where: { correo: email },
                        relations: ['organizaciones', 'organizaciones.nodo', 'organizaciones.nodo.padre']
                    });

                    if (user && user.organizaciones.length > 0) {
                        const org = user.organizaciones[0];
                        const nodo = org.nodo;

                        // Find Leader of this node or parent
                        const potentialLeaders = await ds.getRepository(UsuarioOrganizacion).find({
                            where: [
                                { idNodo: nodo.idNodo, rol: 'Lider' },
                                { idNodo: nodo.padre ? nodo.padre.idNodo : 0, rol: 'Lider' }
                            ],
                            relations: ['usuario']
                        });

                        const leaderEmails = potentialLeaders.map(l => l.usuario.correo.toLowerCase());
                        const match = leaderEmails.includes(jefeEmail);

                        console.log(`\nEmpleado: ${email}`);
                        console.log(` - Jefe en Archivo: ${jefeEmail} (${jefeNombre})`);
                        console.log(` - Nodo Clarity: ${nodo.nombre}`);
                        console.log(` - Líderes en Clarity (Directo/Padre): ${leaderEmails.join(', ')}`);
                        console.log(` - Coincidencia de Jerarquía: ${match ? 'SI ✅' : 'NO ⚠️'}`);

                        samples++;
                        if (samples >= maxSamples) break;
                    }
                }
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await ds.destroy();
    }
}
verifyHierarchy();
