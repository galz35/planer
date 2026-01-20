
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

const envPath = path.join(__dirname, '../../.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [],
    synchronize: false,
});

async function main() {
    console.log('Connecting to DB via RAW SQL...');
    try {
        await AppDataSource.initialize();
    } catch (e) {
        console.error('Connection failed:', e);
        process.exit(1);
    }
    console.log('Connected.');

    const employees = await AppDataSource.query(`
        SELECT "idUsuario", "nombre", "area", "subgerencia", "gerencia"
        FROM "p_Usuarios"
        WHERE activo = true
        AND nombre NOT ILIKE '%Gustavo Test%'
        AND ("rolGlobal" IS NULL OR "rolGlobal" NOT IN ('Admin', 'SuperAdmin'))
        LIMIT 40
    `);

    console.log(`Found ${employees.length} employees to seed.`);

    const now = new Date();
    const mes = now.getMonth() + 1;
    const anio = now.getFullYear();

    for (const emp of employees) {
        console.log(`- Seeding ${emp.nombre}`);
        // 1. Plan (p_PlanesTrabajo)
        let plans = await AppDataSource.query(`SELECT "idPlan" FROM "p_PlanesTrabajo" WHERE "idUsuario" = $1 AND mes = $2 AND anio = $3`, [emp.idUsuario, mes, anio]);
        let idPlan;
        if (plans.length === 0) {
            const res = await AppDataSource.query(`
                INSERT INTO "p_PlanesTrabajo" ("idUsuario", "mes", "anio", "estado", "fechaCreacion", "idCreador")
                VALUES ($1, $2, $3, 'Confirmado', NOW(), $1) RETURNING "idPlan"
             `, [emp.idUsuario, mes, anio]);
            idPlan = res[0].idPlan;
        } else {
            idPlan = plans[0].idPlan;
        }

        // 2. Project
        const area = emp.area || 'Gerencia Noroccidental';
        const sub = emp.subgerencia || 'Subgerencia Operativa';
        const ger = emp.gerencia || 'Dirección de Tecnología';
        const pName = `Iniciativa ${emp.nombre.substring(0, 15).trim()} - Q1`;

        let projs = await AppDataSource.query(`SELECT "idProyecto" FROM "p_Proyectos" WHERE nombre = $1`, [pName]);
        let idProyecto;
        if (projs.length === 0) {
            const res = await AppDataSource.query(`
                INSERT INTO "p_Proyectos" ("nombre", "area", "subgerencia", "gerencia", "estado", "fechaInicio", "fechaFin", "tipo", "fechaCreacion")
                VALUES ($1, $2, $3, $4, 'EnCurso', $5, $6, 'Operativo', NOW()) RETURNING "idProyecto"
             `, [pName, area, sub, ger, new Date(anio, 0, 15), new Date(anio, 11, 31)]);
            idProyecto = res[0].idProyecto;
        } else {
            idProyecto = projs[0].idProyecto;
        }

        // 3. Tasks
        const defs = [
            { t: 'Analisis Requerimientos', s: 'Hecha', d: -15 },
            { t: 'Diseño Prototipo', s: 'Hecha', d: -10 },
            { t: 'Implementación Base', s: 'Hecha', d: -5 },
            { t: 'Pruebas Integrales', s: 'EnCurso', d: -2 },
            { t: 'Ajustes Visuales', s: 'EnCurso', d: 5 },
            { t: 'Certificación Final', s: 'Pendiente', d: 15 },
            { t: 'Dependencia de Infra', s: 'Bloqueada', d: 0 }
        ];

        for (const d of defs) {
            const tName = `${d.t} (${emp.nombre.split(' ')[0]})`;
            const exists = await AppDataSource.query(`SELECT "idTarea" FROM "p_Tareas" WHERE titulo = $1 AND "idProyecto" = $2`, [tName, idProyecto]);

            if (exists.length === 0) {
                const target = new Date(now);
                target.setDate(target.getDate() + d.d);

                const resT = await AppDataSource.query(`
                    INSERT INTO "p_Tareas" ("titulo", "estado", "prioridad", "fechaObjetivo", "idProyecto", "idPlan", "esfuerzo", "tipo", "idCreador")
                    VALUES ($1, $2, 'Media', $3, $4, $5, 'M', 'Estrategica', $6) RETURNING "idTarea"
                 `, [tName, d.s, target, idProyecto, idPlan, emp.idUsuario]);
                const idTarea = resT[0].idTarea;

                // Assign
                await AppDataSource.query(`
                    INSERT INTO "p_TareaAsignados" ("idTarea", "idUsuario", "tipo")
                    VALUES ($1, $2, 'Responsable')
                 `, [idTarea, emp.idUsuario]);

                if (d.s === 'Bloqueada') {
                    await AppDataSource.query(`
                        INSERT INTO "p_Bloqueos" ("idTarea", "idOrigenUsuario", "motivo", "estado", "fechaCreacion")
                        VALUES ($1, $2, 'Bloqueo técnico simulado', 'Activo', NOW())
                     `, [idTarea, emp.idUsuario]);
                }
            }
        }
    }
    console.log('Seeding completed successfully.');
    process.exit(0);
}

main().catch(err => {
    console.error('SEED ERROR:', err);
    process.exit(1);
});
