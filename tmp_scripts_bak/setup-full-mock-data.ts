import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import 'reflect-metadata';

config();

async function run() {
    const ds = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT) || 5432,
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: { rejectUnauthorized: false },
    });

    try {
        await ds.initialize();
        console.log('🚀 Conectado - Iniciando generación de datos ficticios "fríamente calculados"...');

        const yestStr = '2026-01-17';
        const todayStr = '2026-01-18';
        const tomorrowStr = '2026-01-19';

        // 1. Obtener todos los usuarios de RRHH registrados
        const users = await ds.query(`
            SELECT "idUsuario", nombre, correo, carnet, "rolGlobal"
            FROM "p_Usuarios"
            WHERE activo = true AND correo = 'taniaa.aguirre@claro.com.ni'
        `);


        if (users.length === 0) {
            console.error('❌ No se encontraron usuarios activos en la base de datos.');
            return;
        }

        console.log(`📊 Procesando ${users.length} usuarios...`);

        // 2. Limpiar datos de prueba (opcional pero recomendado para no duplicar)
        // await ds.query('DELETE FROM "p_Bloqueos"');
        // await ds.query('DELETE FROM "p_FocoDiario"');
        // await ds.query('DELETE FROM "p_Checkins"');

        // 3. Definir Proyectos Compartidos
        const setupProject = async (nombre: string, desc: string) => {
            const existing = await ds.query('SELECT "idProyecto" FROM "p_Proyectos" WHERE nombre = $1', [nombre]);
            if (existing.length > 0) return existing[0].idProyecto;

            const res = await ds.query(`
                INSERT INTO "p_Proyectos" (nombre, descripcion, estado, "fechaCreacion")
                VALUES ($1, $2, 'Activo', NOW())
                RETURNING "idProyecto"
            `, [nombre, desc]);
            return res[0].idProyecto;
        };

        const pRegulatorio = await setupProject('Cumplimiento Regulatorio 2026', 'Asegurar que todos los procesos cumplen con la norma ISO y leyes locales.');
        const pFeria = await setupProject('Feria de Empleo Regional', 'Evento masivo de reclutamiento para áreas técnicas y comerciales.');
        const pDigital = await setupProject('Transformación Digital RRHH', 'Migración de expedientes físicos a digital y automatización de flujo de aprobación.');
        const pClima = await setupProject('Encuesta Clima Organizacional', 'Medición anual de satisfacción y clima laboral.');

        const proyectos = [pRegulatorio, pFeria, pDigital, pClima];

        // 4. Mapeo de usuarios por su rol/departamento (simulado basándonos en nombres/jerarquía si es posible)
        // Pero para ser masivo, usaremos una distribución probabilística o basada en keywords del nombre/correo

        for (const user of users) {
            console.log(`  👤 Generando para: ${user.nombre}`);

            // Determinar perfil del usuario para tareas temáticas
            let profileTasks: { t: string, tipo: string, projId: number }[] = [];

            if (user.nombre.includes('RECURSOS HUMANOS') || user.correo.includes('aguirre') || user.correo.includes('garcia')) {
                profileTasks = [
                    { t: 'Entrevistas candidatos Senior IT', tipo: 'Operativo', projId: pFeria },
                    { t: 'Revisión de contratos trimestrales', tipo: 'Administrativa', projId: pRegulatorio },
                    { t: 'Carga de expedientes a la nube', tipo: 'Logistica', projId: pDigital }
                ];
            } else if (user.correo.includes('perez') || user.correo.includes('rosales') || user.correo.includes('sequeira')) {
                profileTasks = [
                    { t: 'Mediación conflicto área técnica', tipo: 'Estrategico', projId: pRegulatorio },
                    { t: 'Actualización reglamento interno', tipo: 'Administrativa', projId: pRegulatorio },
                    { t: 'Visita a sucursal Managua por inspección', tipo: 'Logistica', projId: pRegulatorio }
                ];
            } else if (user.correo.includes('rodriguez') || user.correo.includes('cruz') || user.correo.includes('diaz')) {
                profileTasks = [
                    { t: 'Mantenimiento preventivo flota RRHH', tipo: 'Logistica', projId: pRegulatorio },
                    { t: 'Trámite de tarjetas de combustible', tipo: 'Administrativa', projId: pRegulatorio },
                    { t: 'Reporte de sinistralidad vehicular', tipo: 'Operativo', projId: pRegulatorio }
                ];
            } else {
                profileTasks = [
                    { t: 'Revisión de correos operativos', tipo: 'Operativo', projId: proyectos[Math.floor(Math.random() * proyectos.length)] },
                    { t: 'Actualización de KPIs mensuales', tipo: 'Administrativa', projId: proyectos[1] },
                    { t: 'Reunión de alineación semanal', tipo: 'Estrategico', projId: proyectos[0] }
                ];
            }

            // --- GENERAR HISTORIAL DINÁMICO (Prueba: 12-16 Enero 2026) ---
            const dates: string[] = [
                '2026-01-12', '2026-01-13', '2026-01-14', '2026-01-15', '2026-01-16'
            ];
            console.log('Fechas a generar:', dates);


            for (const dateStr of dates) {
                // Verificar si ya existe checkin
                const existingCheckin = await ds.query('SELECT "idCheckin" FROM "p_Checkins" WHERE "idUsuario" = $1 AND "fecha" = $2', [user.idUsuario, dateStr]);
                let cId;

                if (existingCheckin.length > 0) {
                    cId = existingCheckin[0].idCheckin;
                } else {
                    const mood = ['Tope', 'Bien', 'Bajo', 'Bien', 'Tope'][Math.floor(Math.random() * 5)] as any;
                    const resCheckin = await ds.query(`
                        INSERT INTO "p_Checkins" ("idUsuario", "fecha", "entregableTexto", "estadoAnimo")
                        VALUES ($1, $2, $3, $4) RETURNING "idCheckin"
                    `, [user.idUsuario, dateStr, `Reporte de actividades del día ${dateStr.split('-')[2]}`, mood]);
                    cId = resCheckin[0].idCheckin;
                }

                // Generar 2-3 Tareas por día
                const taskCount = 2 + Math.floor(Math.random() * 2);

                for (let i = 0; i < taskCount; i++) {
                    const pt = profileTasks[i % profileTasks.length];
                    const suffix = `(Día ${dateStr.split('-')[2]})`;
                    const title = `${pt.t} ${suffix}`;

                    // Estado varía según la fecha:
                    const isOld = dateStr < '2026-01-14';
                    let estado = 'EnCurso';
                    let linkTipo = 'Avanzo'; // Avanzo o Entrego
                    let progreso = 50;

                    const rand = Math.random();
                    if (isOld) {
                        if (rand > 0.3) { estado = 'Hecha'; linkTipo = 'Entrego'; progreso = 100; }
                        else { estado = 'EnCurso'; linkTipo = 'Avanzo'; progreso = 75; }
                    } else {
                        if (rand > 0.7) { estado = 'Hecha'; linkTipo = 'Entrego'; progreso = 100; }
                        else if (rand > 0.2) { estado = 'EnCurso'; linkTipo = 'Avanzo'; progreso = 25; }
                        else { estado = 'Bloqueada'; linkTipo = 'Avanzo'; progreso = 10; }
                    }

                    // Evitar duplicados
                    const existingT = await ds.query('SELECT "idTarea" FROM "p_Tareas" WHERE titulo = $1 AND "idCreador" = $2', [title, user.idUsuario]);
                    let tId;

                    if (existingT.length > 0) {
                        tId = existingT[0].idTarea;
                    } else {
                        const fechaHecha = estado === 'Hecha' ? dateStr : null;

                        const resTarea = await ds.query(`
                            INSERT INTO "p_Tareas" (titulo, estado, "idProyecto", "idCreador", progreso, "fechaInicioPlanificada", "fechaObjetivo", "fechaHecha", tipo, prioridad)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING "idTarea"
                        `, [title, estado, pt.projId, user.idUsuario, progreso, dateStr, dateStr, fechaHecha, pt.tipo, 'Media']);
                        tId = resTarea[0].idTarea;
                    }

                    // Link Checkin
                    const existingCT = await ds.query('SELECT 1 FROM "p_CheckinTareas" WHERE "idCheckin" = $1 AND "idTarea" = $2', [cId, tId]);
                    if (existingCT.length === 0) {
                        await ds.query(`
                            INSERT INTO "p_CheckinTareas" ("idCheckin", "idTarea", tipo)
                            VALUES ($1, $2, $3)
                        `, [cId, tId, linkTipo]);
                    }

                    // Insertar Bloqueo si corresponde
                    if (estado === 'Bloqueada') {
                        const existingB = await ds.query('SELECT 1 FROM "p_Bloqueos" WHERE "idTarea" = $1', [tId]);
                        if (existingB.length === 0) {
                            const types = ['Estratégica', 'Administrativa', 'Logística', 'AMX'];
                            const tipoBloqueo = types[Math.floor(Math.random() * types.length)];
                            const motivo = `[${tipoBloqueo.toUpperCase()}] Bloqueo reportado el día ${dateStr}.`;

                            await ds.query(`
                                 INSERT INTO "p_Bloqueos" ("idTarea", "idOrigenUsuario", "motivo", "estado", "fechaCreacion")
                                 VALUES ($1, $2, $3, 'Activo', $4)
                             `, [tId, user.idUsuario, motivo, dateStr + ' 14:00:00']);
                        }
                    }
                }
            }
        }

        console.log('\n✅ Simulación masiva completada con éxito.');
        console.log('💡 Los usuarios ahora tienen historias de ayer y planes para hoy con bloqueos categorizados.');

    } catch (error) {
        console.error('❌ Error general:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    } finally {
        await ds.destroy();
    }
}

run();
