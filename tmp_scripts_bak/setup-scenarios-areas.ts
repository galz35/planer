import { DataSource } from 'typeorm';
import { config } from 'dotenv';
config();

async function run() {
    const ds = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT) || 5432,
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    await ds.initialize();
    console.log('--- Configurando Escenarios por Áreas (Transporte, Reclutamiento, Capacitación, etc.) ---');

    interface Member {
        carnet: string;
        nombre: string;
        correo: string;
        task: string;
        type: string;
        done?: boolean;
        overdue?: boolean;
        blocked?: boolean;
    }

    interface Boss {
        carnet: string;
        nombre: string;
        correo: string;
    }

    interface Group {
        area: string;
        boss: Boss;
        members: Member[];
    }

    // Mapeo detallado de usuarios
    const groups: Group[] = [
        {
            area: 'Transporte',
            boss: { carnet: '402178', nombre: 'ALI ADOLFO RODRIGUEZ URIARTE', correo: 'ali.rodriguez@claro.com.ni' },
            members: [
                { carnet: '1009828', nombre: 'EDGARDO JOSE SABALLOS VELAZQUEZ', correo: 'edgardo.saballos@claro.com.ni', task: 'Mantenimiento Preventivo Flota Managua', type: 'Logistica' },
                { carnet: '249859', nombre: 'PEDRO JAVIER CASTILLO MENDEZ', correo: 'pedro.castillo@claro.com.ni', task: 'Gestión de Combustible Semanal', type: 'Logistica' }
            ]
        },
        {
            area: 'Capacitación',
            boss: { carnet: '400850', nombre: 'SERGIO ALEXANDER MARTINEZ ESPINOZA', correo: 'sergio.martinez@claro.com.ni' },
            members: [
                { carnet: '402035', nombre: 'JILMA CAROLINA ZELAYA GARCIA', correo: 'jilma.zelaya@claro.com.ni', task: 'Organización Taller Liderazgo', type: 'Administrativa' },
                { carnet: '401992', nombre: 'MILCY CAROLINA VELASQUEZ QUINTANILLA', correo: 'milcy.velasquez@claro.com.ni', task: 'Reporte de Asistencia Enero', type: 'Administrativa', done: true }
            ]
        },
        {
            area: 'Compensaciones',
            boss: { carnet: '1008937', nombre: 'AURORA DEL SOCORRO ESPINOZA DIAZ', correo: 'aurora.espinoza@claro.com.ni' },
            members: [
                { carnet: '1011898', nombre: 'KEVIN JOSSETH TORREZ RIVERA', correo: 'kevin.torrez@claro.com.ni', task: 'Análisis de Equidad Interna', type: 'Estrategica' }
            ]
        },
        {
            area: 'Reclutamiento',
            boss: { carnet: '400103', nombre: 'YESENIA DE JESUS MANZANAREZ ALVARADO', correo: 'yesenia.manzanarez@claro.com.ni' },
            members: [
                { carnet: '401633', nombre: 'ARLEN CRISTINA RIVERA ESCOTO', correo: 'arlen.rivera@claro.com.ni', task: 'Feria de Empleo UCA', type: 'AMX' },
                { carnet: '402336', nombre: 'FRANCIS MARIA VILLARREAL TORRES', correo: 'francis.villarreal@claro.com.ni', task: 'Entrevistas Puesto Gerente TI', type: 'Administrativa', overdue: true },
                { carnet: '500358', nombre: 'KEVIN EDUARDO BARAHONA LOPEZ', correo: 'kevin.barahona@claro.com.ni', task: 'Filtrado CVs Call Center', type: 'Operativa' }
            ]
        },
        {
            area: 'Nómina',
            boss: { carnet: '229354', nombre: 'JAVIER ANTONIO TORUÑO MENDOZA', correo: 'javier.toruno@claro.com.ni' },
            members: [
                { carnet: '500313', nombre: 'MARIO ALBERTO RIOS GUILLEN', correo: 'mario.rios@claro.com.ni', task: 'Cálculo Planilla Quincenal', type: 'Administrativa', blocked: true }
            ]
        }
    ];

    const ortunoCarnet = '300042';
    const uOrtuno = await ds.query('SELECT "idUsuario" FROM "p_Usuarios" WHERE carnet = $1', [ortunoCarnet]);
    const ortunoId = uOrtuno.length > 0 ? uOrtuno[0].idUsuario : null;

    if (!ortunoId) {
        console.error('Ortuño not found! Run comprehensive setup first.');
        return;
    }

    const userMap = new Map<string, number>();

    // 1. Ensure all users exist and get IDs
    for (const group of groups) {
        const allInGroup = [group.boss, ...group.members];
        for (const person of allInGroup) {
            let u = await ds.query('SELECT "idUsuario" FROM "p_Usuarios" WHERE carnet = $1', [person.carnet]);
            let uid;
            if (u.length === 0) {
                const ins = await ds.query(
                    'INSERT INTO "p_Usuarios" (nombre, carnet, correo, activo, "rolGlobal") VALUES ($1, $2, $3, true, $4) RETURNING "idUsuario"',
                    [person.nombre, person.carnet, person.correo, 'User']
                );
                uid = ins[0].idUsuario;
            } else {
                uid = u[0].idUsuario;
                // Update email/name just in case
                await ds.query('UPDATE "p_Usuarios" SET nombre = $1, correo = $2, activo = true WHERE "idUsuario" = $3', [person.nombre, person.correo, uid]);
            }
            userMap.set(person.carnet, uid);

            // Clean previous data
            await ds.query('DELETE FROM "p_Bloqueos" WHERE "idOrigenUsuario" = $1', [uid]);
            await ds.query('DELETE FROM "p_SolicitudCambios" WHERE "idUsuarioSolicitante" = $1', [uid]);
            const plans = await ds.query('SELECT "idPlan" FROM "p_PlanesTrabajo" WHERE "idUsuario" = $1', [uid]);
            for (const p of plans) await ds.query('DELETE FROM "p_Tareas" WHERE "idPlan" = $1', [p.idPlan]);
            await ds.query('DELETE FROM "p_PlanesTrabajo" WHERE "idUsuario" = $1', [uid]);
            // Delete loose tasks
            const assignments = await ds.query('SELECT "idTarea" FROM "p_TareaAsignados" WHERE "idUsuario" = $1', [uid]);
            for (const a of assignments) {
                await ds.query('DELETE FROM "p_Tareas" WHERE "idTarea" = $1 AND "idPlan" IS NULL', [a.idTarea]);
            }
            await ds.query('DELETE FROM "p_TareaAsignados" WHERE "idUsuario" = $1', [uid]);
        }
    }

    // 2. Create Scenarios
    for (const group of groups) {
        const bossId = userMap.get(group.boss.carnet)!;

        // Create BOSS Plan
        const planBoss = await ds.query(`
            INSERT INTO "p_PlanesTrabajo" (nombre, "idUsuario", mes, anio, estado, "objetivoGeneral", "idCreador")
            VALUES ($1, $2, 1, 2026, 'Confirmado', $3, $4) RETURNING "idPlan"
        `, [`Plan Gestión ${group.area}`, bossId, `Liderar equipo de ${group.area}`, ortunoId]);
        const pBossId = planBoss[0].idPlan;

        // Assign members scenarios
        for (const member of group.members) {
            const memId = userMap.get(member.carnet)!;

            // Create PLAN for Member (created by Boss)
            const planMem = await ds.query(`
                INSERT INTO "p_PlanesTrabajo" (nombre, "idUsuario", mes, anio, estado, "objetivoGeneral", "idCreador")
                VALUES ($1, $2, 1, 2026, 'Confirmado', 'Cumplimiento Operativo', $3) RETURNING "idPlan"
            `, [`Plan Enero - ${member.nombre.split(' ')[0]}`, memId, bossId]);
            const pMemId = planMem[0].idPlan;

            let fechaInicio = '2026-01-05';
            let fechaFin = '2026-01-20';
            let estado = 'En Curso';
            let progreso = 30;

            if (member.done) {
                estado = 'Hecha';
                progreso = 100;
                fechaFin = '2026-01-10'; // Ya pasó
            } else if (member.overdue) {
                fechaFin = '2026-01-14'; // Ya pasó
                estado = 'En Curso';
            }

            const t = await ds.query(`
                INSERT INTO "p_Tareas" (titulo, estado, "idPlan", "idCreador", progreso, tipo, prioridad, "fechaInicioPlanificada", "fechaObjetivo", "fechaHecha")
                VALUES ($1, $2, $3, $4, $5, $6, 'Media', $7, $8, $9) RETURNING "idTarea"
            `, [member.task, estado, pMemId, bossId, progreso, member.type, fechaInicio, fechaFin, member.done ? '2026-01-10' : null]);

            const tId = t[0].idTarea;
            await ds.query('INSERT INTO "p_TareaAsignados" ("idTarea", "idUsuario") VALUES ($1, $2)', [tId, memId]);

            // Create Block if needed
            if (member.blocked) {
                await ds.query(`
                    INSERT INTO "p_Bloqueos" ("idTarea", "idOrigenUsuario", "idDestinoUsuario", motivo, "accionMitigacion", estado)
                    VALUES ($1, $2, $3, 'Sistema SAP no responde', 'Reportar a IT', 'Activo')
                `, [tId, memId, bossId]);
            }
        }
    }

    console.log('--- Escenarios por áreas creados exitosamente ---');
    await ds.destroy();
}

run().catch(console.error);
