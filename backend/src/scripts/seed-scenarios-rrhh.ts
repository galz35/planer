
// ... (imports y config iguales) ...
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

dotenv.config();

const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: true,
    extra: { ssl: { rejectUnauthorized: false } },
    connectTimeoutMS: 60000,
});

const ESCENARIOS = [
    {
        correo: 'gustavo.lira@claro.com.ni',
        animo: 'Motivado',
        objetivo: 'Terminar migración a Producción',
        tareas: [
            { t: 'Backup de DB', estado: 'Terminado' },
            { t: 'Configurar Vercel', estado: 'En Progreso' },
            { t: 'Revisar SSL', estado: 'Pendiente', bloqueo: 'Sin permisos root' }
        ],
        notas: ['Revisar logs a las 4pm']
    },
    {
        correo: 'yesenia.manzanarez@claro.com.ni',
        animo: 'Normal',
        objetivo: 'Feria de Empleo 2026',
        tareas: [
            { t: 'Entrevista J. Perez', estado: 'Terminado' },
            { t: 'Filtrar CVs LinkedIn', estado: 'En Progreso' },
            { t: 'Presupuesto Feria', estado: 'Pendiente', bloqueo: 'Esperando visto bueno de Aurora' }
        ],
        notas: ['Confirmar stand universidad']
    },
    {
        correo: 'sergio.martinez@claro.com.ni',
        animo: 'Energico',
        objetivo: 'Lanzamiento Programa Liderazgo',
        tareas: [
            { t: 'Orden compra catering', estado: 'En Progreso' },
            { t: 'Revisar presentacion', estado: 'Pendiente' },
            { t: 'Confirmar sala', estado: 'Terminado' }
        ],
        notas: []
    }
];

async function main() {
    console.log('🚀 Iniciando Simulación...');
    await ds.initialize();

    const hoy = new Date().toISOString().split('T')[0];

    for (const esc of ESCENARIOS) {
        console.log(`\n🎭 Usuario: ${esc.correo}`);
        const userRes = await ds.query('SELECT "idUsuario" FROM "p_Usuarios" WHERE correo = $1', [esc.correo]);
        if (!userRes.length) continue;
        const userId = userRes[0].idUsuario;

        let orden = 1;
        for (const tarea of esc.tareas) {
            // Simplificado: Sin fechaCreacion explicita
            const insertTarea = await ds.query(
                `INSERT INTO "p_Tareas" ("titulo", "estado", "idCreador") 
                 VALUES ($1, $2, $3) RETURNING "idTarea"`,
                [tarea.t, tarea.estado, userId]
            );
            const tareaId = insertTarea[0].idTarea;

            await ds.query(
                `INSERT INTO "p_FocoDiario" ("idUsuario", "idTarea", "fecha", "fechaPrimerFoco", "orden", "esEstrategico")
                 VALUES ($1, $2, $3, $3, $4, false)
                 ON CONFLICT DO NOTHING`,
                [userId, tareaId, hoy, orden++]
            );

            if (tarea.bloqueo) {
                // Sin fechaCreacion explicita
                await ds.query(
                    `INSERT INTO "p_Bloqueos" ("idTarea", "idOrigenUsuario", "motivo", "estado")
                     VALUES ($1, $2, $3, 'Activo')`,
                    [tareaId, userId, tarea.bloqueo]
                );
                console.log(`   ⛔ Bloqueo: ${tarea.bloqueo}`);
            }
        }

        const checkinHeader = await ds.query(
            `SELECT "idCheckin" FROM "p_Checkins" WHERE "idUsuario" = $1 AND "fecha" = $2`,
            [userId, hoy]
        );

        if (checkinHeader.length === 0) {
            // Sin fechaCreacion
            await ds.query(
                `INSERT INTO "p_Checkins" ("idUsuario", "fecha", "entregableTexto", "estadoAnimo")
                 VALUES ($1, $2, $3, $4)`,
                [userId, hoy, esc.objetivo, esc.animo]
            );
            console.log(`   🎯 Objetivo: ${esc.objetivo}`);
        }

        for (const nota of esc.notas) {
            await ds.query(
                `INSERT INTO "p_Notas" ("idUsuario", "contenido", "esPublica")
                 VALUES ($1, $2, false)`,
                [userId, nota]
            );
        }

        console.log('   ✅ Datos inyectados.');
    }

    // Genéricos
    const otrosUsuarios = await ds.query(
        `SELECT "idUsuario", "nombre" FROM "p_Usuarios" 
         WHERE "correo" NOT IN ('gustavo.lira@claro.com.ni', 'yesenia.manzanarez@claro.com.ni', 'sergio.martinez@claro.com.ni')`
    );

    console.log(`\n👥 Generando datos para el resto...`);
    for (const u of otrosUsuarios) {
        const tareasGen = ['Revisar correos pendientes', 'Actualizar reporte semanal'];
        for (const t of tareasGen) {
            const insertTarea = await ds.query(
                `INSERT INTO "p_Tareas" ("titulo", "estado", "idCreador") 
                 VALUES ($1, 'Pendiente', $2) RETURNING "idTarea"`,
                [t, u.idUsuario]
            );
            await ds.query(
                `INSERT INTO "p_FocoDiario" ("idUsuario", "idTarea", "fecha", "fechaPrimerFoco", "orden", "esEstrategico")
                 VALUES ($1, $2, $3, $3, 1, false) ON CONFLICT DO NOTHING`,
                [u.idUsuario, insertTarea[0].idTarea, hoy]
            );
        }
    }

    console.log('\n✨ Simulación Finalizada.');
    await ds.destroy();
}

main().catch(console.error);
