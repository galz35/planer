import { ejecutarQuery, ejecutarSP, Int, NVarChar, DateTime, SqlDate } from '../db/base.repo';
import { UsuarioDb, CheckinDb } from '../db/tipos';

export { ejecutarQuery };

// ==========================================
// TAREAS (Usan SP sp_Tarea_Crear)
// Migrado: 2026-01-21 02:05
// ==========================================

export async function crearTarea(tarea: Partial<any>): Promise<number> {
    // Si no se proporciona fechaObjetivo, usar la fecha de hoy para que aparezca en bitácora/calendario
    const fechaObjetivoFinal = tarea.fechaObjetivo ? new Date(tarea.fechaObjetivo) : new Date();

    // Usar SP para evitar problemas de esquema y caché
    const res = await ejecutarSP<{ idTarea: number }>('sp_Tarea_Crear', {
        nombre: { valor: tarea.titulo || tarea.nombre, tipo: NVarChar },
        idUsuario: { valor: tarea.idCreador, tipo: Int },
        idProyecto: { valor: tarea.idProyecto || null, tipo: Int },
        descripcion: { valor: tarea.descripcion || null, tipo: NVarChar },
        estado: { valor: tarea.estado || 'Pendiente', tipo: NVarChar },
        prioridad: { valor: tarea.prioridad || 'Media', tipo: NVarChar },
        esfuerzo: { valor: tarea.esfuerzo || null, tipo: NVarChar },
        tipo: { valor: tarea.tipo || 'Administrativa', tipo: NVarChar },
        fechaInicioPlanificada: { valor: tarea.fechaInicioPlanificada || null, tipo: DateTime },
        fechaObjetivo: { valor: fechaObjetivoFinal, tipo: DateTime },
        porcentaje: { valor: tarea.progreso || tarea.porcentaje || 0, tipo: Int },
        orden: { valor: tarea.orden || 0, tipo: Int }
    });

    const idTarea = res[0].idTarea;

    // Actualizar comportamiento si viene en el objeto
    if (tarea.comportamiento) {
        await ejecutarQuery(`UPDATE p_Tareas SET comportamiento = @c WHERE idTarea = @t`, {
            c: { valor: tarea.comportamiento, tipo: NVarChar },
            t: { valor: idTarea, tipo: Int }
        });
    }

    // Asignar responsable si existe y es diferente al creador
    if (tarea.idResponsable && tarea.idResponsable !== tarea.idCreador) {
        await asignarUsuarioTarea(idTarea, tarea.idResponsable, 'Responsable');
    }

    return idTarea;
}

export async function asignarUsuarioTarea(idTarea: number, idUsuario: number, tipo: string = 'Responsable') {
    const existe = await ejecutarQuery(`SELECT 1 FROM p_TareaAsignados WHERE idTarea = @t AND idUsuario = @u`, {
        t: { valor: idTarea, tipo: Int },
        u: { valor: idUsuario, tipo: Int }
    });

    if (existe.length === 0) {
        await ejecutarQuery(`
            INSERT INTO p_TareaAsignados (idTarea, idUsuario, tipo, fechaAsignacion)
            VALUES (@t, @u, @tipo, GETDATE())
        `, {
            t: { valor: idTarea, tipo: Int },
            u: { valor: idUsuario, tipo: Int },
            tipo: { valor: tipo, tipo: NVarChar }
        });
    }
}

export async function reasignarResponsable(idTarea: number, idNuevoResponsable: number) {
    // 1. Quitar anteriores de tipo Responsable
    await ejecutarQuery(`DELETE FROM p_TareaAsignados WHERE idTarea = @t AND tipo = 'Responsable'`, {
        t: { valor: idTarea, tipo: Int }
    });
    // 2. Asignar nuevo
    await asignarUsuarioTarea(idTarea, idNuevoResponsable, 'Responsable');
}

// Alias para compatibilidad con código existente
export async function obtenerMisTareas(idUsuario: number, estado?: string, idProyecto?: number) {
    return getTareasUsuario(idUsuario, estado, idProyecto);
}

export async function getTareasUsuario(idUsuario: number, estado?: string, idProyecto?: number) {
    let sql = `
        SELECT 
            t.idTarea, t.idProyecto, 
            t.nombre as titulo,
            t.descripcion, t.estado, t.prioridad, t.esfuerzo, t.tipo,
            t.fechaCreacion, t.fechaObjetivo, t.fechaCompletado,
            t.porcentaje as progreso,
            t.orden, t.idCreador, t.fechaInicioPlanificada,
            t.comportamiento, t.idGrupo, t.numeroParte,
            t.fechaActualizacion as fechaUltActualizacion,
            p.nombre as proyectoNombre 
        FROM p_Tareas t
        LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
        LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea
        WHERE (t.idCreador = @uid OR ta.idUsuario = @uid)
    `;
    const params: any = { uid: { valor: idUsuario, tipo: Int } };

    if (estado) {
        sql += ` AND t.estado = @estado`;
        params.estado = { valor: estado, tipo: NVarChar };
    }
    if (idProyecto) {
        sql += ` AND t.idProyecto = @pid`;
        params.pid = { valor: idProyecto, tipo: Int };
    }

    sql += ` ORDER BY t.orden ASC, t.fechaObjetivo ASC`;

    return await ejecutarQuery(sql, params);
}

/**
 * Obtiene tareas para múltiples usuarios (creadas o asignadas)
 */
export async function obtenerTareasMultiplesUsuarios(idsUsuarios: number[]): Promise<any[]> {
    if (idsUsuarios.length === 0) return [];

    const idsStr = idsUsuarios.map(id => Math.floor(id)).join(',');

    const sql = `
        SELECT 
            t.idTarea, 
            t.nombre as titulo, 
            t.descripcion, 
            t.estado, 
            t.prioridad, 
            t.fechaInicioPlanificada, 
            t.fechaObjetivo, 
            t.porcentaje as progreso, 
            t.orden,
            t.comportamiento, t.idGrupo, t.numeroParte,
            p.nombre as proyectoNombre,
            ta.idUsuario as asignadoId
        FROM p_Tareas t
        LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
        INNER JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea
        WHERE ta.idUsuario IN (${idsStr})
          AND t.estado NOT IN ('Eliminada', 'Archivada')
    `;

    const rows = await ejecutarQuery<any>(sql);

    // Agrupar por idTarea para consolidar asignados
    const tasksMap = new Map<number, any>();

    for (const row of rows) {
        if (!tasksMap.has(row.idTarea)) {
            tasksMap.set(row.idTarea, {
                ...row,
                asignados: []
            });
            // Eliminar temporal asignadoId del objeto final de tarea
            delete tasksMap.get(row.idTarea).asignadoId;
        }

        if (row.asignadoId) {
            tasksMap.get(row.idTarea).asignados.push({ idUsuario: row.asignadoId });
        }
    }

    return Array.from(tasksMap.values());
}

/**
 * Obtiene el estado del equipo para un día específico
 * @param idsMiembros IDs de los usuarios que conforman el equipo a visualizar
 * @param fechaStr Fecha del reporte
 */
export async function obtenerEquipoHoy(idsMiembros: number[], fechaStr: string): Promise<any> {
    if (idsMiembros.length === 0) return { miembros: [], resumenAnimo: { feliz: 0, neutral: 0, triste: 0, promedio: 0 } };

    const idsStr = idsMiembros.map(id => Math.floor(id)).join(',');

    // Miembros del equipo con su rol
    const miembros = await ejecutarQuery<UsuarioDb & { rolNombre?: string }>(`
        SELECT u.*, r.nombre as rolNombre 
        FROM p_Usuarios u 
        LEFT JOIN p_Roles r ON u.idRol = r.idRol
        WHERE u.idUsuario IN (${idsStr}) AND u.activo = 1
    `);

    if (miembros.length === 0) return { miembros: [], resumenAnimo: { feliz: 0, neutral: 0, triste: 0, promedio: 0 } };

    // Checkins para el día
    const checkins = await ejecutarQuery<CheckinDb>(`
        SELECT * FROM p_Checkins 
        WHERE idUsuario IN (${idsStr}) AND CAST(fecha AS DATE) = CAST(@fecha AS DATE)
    `, { fecha: { valor: new Date(fechaStr), tipo: SqlDate } });

    // Estadísticas de tareas (Hoy/Retrasadas/HechasHoy)
    const stats = await ejecutarQuery<{ idUsuario: number, retrasadas: number, hoy: number, hechas: number }>(`
        SELECT 
            ta.idUsuario, 
            SUM(CASE WHEN t.estado IN ('Pendiente', 'EnCurso') AND CAST(t.fechaObjetivo AS DATE) < CAST(@fecha AS DATE) THEN 1 ELSE 0 END) as retrasadas,
            SUM(CASE WHEN t.estado IN ('Pendiente', 'EnCurso') AND CAST(t.fechaObjetivo AS DATE) = CAST(@fecha AS DATE) THEN 1 ELSE 0 END) as hoy,
            SUM(CASE WHEN t.estado = 'Hecha' AND CAST(t.fechaCompletado AS DATE) = CAST(@fecha AS DATE) THEN 1 ELSE 0 END) as hechas
        FROM p_Tareas t
        JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea
        WHERE ta.idUsuario IN (${idsStr})
          -- Consideramos tareas activas vencidas, tareas para hoy, o tareas hechas hoy
          AND (
              (t.estado IN ('Pendiente', 'EnCurso') AND CAST(t.fechaObjetivo AS DATE) <= CAST(@fecha AS DATE))
              OR 
              (t.estado = 'Hecha' AND CAST(t.fechaCompletado AS DATE) = CAST(@fecha AS DATE))
          )
        GROUP BY ta.idUsuario
    `, { fecha: { valor: new Date(fechaStr), tipo: SqlDate } });

    const resultMiembros = miembros.map(m => {
        const checkin = checkins.find(c => c.idUsuario === m.idUsuario);
        const userStats = stats.find(s => s.idUsuario === m.idUsuario);

        return {
            usuario: {
                idUsuario: m.idUsuario,
                nombre: m.nombre || m.nombreCompleto,
                correo: m.correo,
                carnet: m.carnet,
                rol: { nombre: m.rolNombre || m.cargo || 'General' }
            },
            checkin: checkin ? {
                idCheckin: checkin.idCheckin,
                fecha: checkin.fecha,
                estadoAnimo: checkin.estadoAnimo,
                nota: checkin.nota,
                entregableTexto: checkin.entregableTexto
            } : null,
            estadisticas: {
                retrasadas: userStats?.retrasadas || 0,
                hoy: userStats?.hoy || 0,
                hechas: userStats?.hechas || 0
            }
        };
    });

    const animos = checkins.map(c => c.estadoAnimo).filter(Boolean);
    const resumenAnimo = {
        feliz: animos.filter(a => a === 'Tope' || a === 'Bien').length,
        neutral: animos.filter(a => a === 'Neutral' || !a).length,
        triste: animos.filter(a => a === 'Bajo').length,
        promedio: resultMiembros.length > 0 ? (animos.length / resultMiembros.length) * 100 : 0
    };

    return {
        miembros: resultMiembros,
        resumenAnimo
    };
}

// ==========================================
// CHECKINS (Usan SP sp_Checkin_Crear)
// ==========================================

// Alias para compatibilidad
export async function upsertCheckin(checkin: any): Promise<number> {
    return checkinUpsert(checkin);
}

export async function checkinUpsert(checkin: any): Promise<number> {
    // 1. Guardar/Actualizar encabezado usando el SP
    const res = await ejecutarSP<{ idCheckin: number }>('sp_Checkin_Crear', {
        idUsuario: { valor: checkin.idUsuario, tipo: Int },
        fecha: { valor: checkin.fecha, tipo: SqlDate },
        entregableTexto: { valor: checkin.entregableTexto, tipo: NVarChar },
        nota: { valor: checkin.nota || null, tipo: NVarChar },
        linkEvidencia: { valor: checkin.linkEvidencia || null, tipo: NVarChar },
        estadoAnimo: { valor: checkin.estadoAnimo || null, tipo: NVarChar },
        idNodo: { valor: checkin.idNodo || null, tipo: Int },
        energia: { valor: null, tipo: Int }
    });

    const idCheckin = res[0].idCheckin;

    // 2. Limpiar tareas anteriores de este checkin para evitar duplicados al editar
    await ejecutarQuery(`DELETE FROM p_CheckinTareas WHERE idCheckin = @id`, { id: { valor: idCheckin, tipo: Int } });

    // 3. Insertar nuevos detalles (Entrego, Avanzo, Extras)
    const tareasParaInsertar: { idTarea: number, tipo: string }[] = [];
    if (checkin.entrego) checkin.entrego.forEach((id: number) => tareasParaInsertar.push({ idTarea: id, tipo: 'Entrego' }));
    if (checkin.avanzo) checkin.avanzo.forEach((id: number) => tareasParaInsertar.push({ idTarea: id, tipo: 'Avanzo' }));
    if (checkin.extras) checkin.extras.forEach((id: number) => tareasParaInsertar.push({ idTarea: id, tipo: 'Extra' }));

    for (const item of tareasParaInsertar) {
        await ejecutarQuery(`
            INSERT INTO p_CheckinTareas (idCheckin, idTarea, tipo)
            VALUES (@idCheckin, @idTarea, @tipo)
        `, {
            idCheckin: { valor: idCheckin, tipo: Int },
            idTarea: { valor: item.idTarea, tipo: Int },
            tipo: { valor: item.tipo, tipo: NVarChar }
        });
    }

    return idCheckin;
}

// Obtener check-in del día con sus tareas
export async function obtenerCheckinPorFecha(idUsuario: number, fecha: Date): Promise<any | null> {
    const result = await ejecutarQuery(`
        SELECT * FROM p_Checkins 
        WHERE idUsuario = @idUsuario 
          AND CAST(fecha AS DATE) = CAST(@fecha AS DATE)
    `, {
        idUsuario: { valor: idUsuario, tipo: Int },
        fecha: { valor: fecha, tipo: SqlDate }
    });

    if (result.length === 0) return null;

    const checkin = result[0];

    // Obtener las tareas asociadas a este checkin
    const tareas = await ejecutarQuery(`
        SELECT ct.idTarea, ct.tipo, t.nombre as titulo, t.estado
        FROM p_CheckinTareas ct
        JOIN p_Tareas t ON ct.idTarea = t.idTarea
        WHERE ct.idCheckin = @idCheckin
    `, { idCheckin: { valor: checkin.idCheckin, tipo: Int } });

    // Mapear para que el frontend las reconozca
    checkin.tareas = tareas.map(t => ({
        idTarea: t.idTarea,
        tipo: t.tipo,
        tarea: { idTarea: t.idTarea, titulo: t.titulo, estado: t.estado }
    }));

    return checkin;
}

export async function bloquearTarea(dto: any) {
    await ejecutarQuery(`
        INSERT INTO p_Bloqueos (idTarea, idOrigenUsuario, idDestinoUsuario, destinoTexto, motivo, accionMitigacion, creadoEn)
        VALUES (@t, @u, @destU, @destT, @mot, @mit, GETDATE())
        `, {
        t: { valor: dto.idTarea, tipo: Int },
        u: { valor: dto.idOrigenUsuario, tipo: Int },
        destU: { valor: dto.idDestinoUsuario || null, tipo: Int },
        destT: { valor: dto.destinoTexto || null, tipo: NVarChar },
        mot: { valor: dto.motivo, tipo: NVarChar },
        mit: { valor: dto.accionMitigacion || null, tipo: NVarChar }
    });

    // Actualizar estado tarea a Bloqueada
    if (dto.idTarea) {
        await ejecutarQuery(`UPDATE p_Tareas SET estado = 'Bloqueada' WHERE idTarea = @id`, { id: { valor: dto.idTarea, tipo: Int } });
    }
}

export async function resolverBloqueo(idBloqueo: number, resolucion: string) {
    await ejecutarQuery(`UPDATE p_Bloqueos SET estado = 'Resuelto', resolucion = @res, fechaResolucion = GETDATE() WHERE idBloqueo = @id`, {
        res: { valor: resolucion, tipo: NVarChar },
        id: { valor: idBloqueo, tipo: Int }
    });
}

export async function obtenerTareasHistorico(carnet: string, dias: number) {
    // Esta query devuelve las tareas junto con las fechas en que fueron trabajadas (desde check-ins)
    // La Bitácora usará 'fechaTrabajada' para agrupar las tareas por día
    const sql = `
        SELECT DISTINCT
            t.idTarea, t.idProyecto, 
            t.nombre as titulo,
            t.descripcion, t.estado, t.prioridad, t.esfuerzo, t.tipo,
            t.fechaCreacion, t.fechaObjetivo, t.fechaCompletado as fechaHecha,
            t.porcentaje as progreso,
            t.orden, t.idCreador, t.fechaInicioPlanificada,
            t.fechaActualizacion as fechaUltActualizacion,
            p.nombre as proyectoNombre,
            -- Fecha en que la tarea fue trabajada (del registro de check-in)
            CAST(c.fecha AS DATE) as fechaTrabajada,
            ct.tipo as tipoCheckin,
            -- Columna calculada para ordenamiento (Required by SQL Server due to DISTINCT)
            COALESCE(c.fecha, t.fechaCreacion) as fechaOrden
        FROM p_Tareas t
        JOIN p_Usuarios u_creador ON t.idCreador = u_creador.idUsuario
        LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea
        LEFT JOIN p_Usuarios u_asignado ON ta.idUsuario = u_asignado.idUsuario
        LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
        -- JOIN con check-ins para obtener las fechas en que se trabajó la tarea
        LEFT JOIN p_CheckinTareas ct ON t.idTarea = ct.idTarea
        LEFT JOIN p_Checkins c ON ct.idCheckin = c.idCheckin
        WHERE (u_creador.carnet = @carnet OR u_asignado.carnet = @carnet)
          AND (
              c.fecha >= DATEADD(day, -@dias, GETDATE())
              OR t.fechaCreacion >= DATEADD(day, -@dias, GETDATE())
              OR t.fechaCompletado >= DATEADD(day, -@dias, GETDATE())
          )
        ORDER BY fechaOrden DESC
    `;
    return await ejecutarQuery(sql, {
        carnet: { valor: carnet, tipo: NVarChar },
        dias: { valor: dias, tipo: Int }
    });
}

export async function obtenerKpisDashboard(idUsuario: number) {
    // 1. Global Stats
    const statsGlobal = await ejecutarQuery(`
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN estado = 'Hecha' THEN 1 ELSE 0 END) as hechas,
            SUM(CASE WHEN estado IN ('Pendiente', 'EnCurso') THEN 1 ELSE 0 END) as pendientes,
            SUM(CASE WHEN estado = 'Bloqueada' THEN 1 ELSE 0 END) as bloqueadas,
            AVG(CAST(COALESCE(porcentaje, 0) AS FLOAT)) as promedioAvance
        FROM p_Tareas t
        LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea
        WHERE t.idCreador = @uid OR ta.idUsuario = @uid
    `, { uid: { valor: idUsuario, tipo: Int } });

    // 2. By Project
    const statsProyecto = await ejecutarQuery(`
        SELECT 
            p.nombre as proyecto,
            p.area,
            COUNT(t.idTarea) as total,
            SUM(CASE WHEN t.estado = 'Hecha' THEN 1 ELSE 0 END) as hechas
        FROM p_Tareas t
        JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
        LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea
        WHERE (t.idCreador = @uid OR ta.idUsuario = @uid)
        GROUP BY p.nombre, p.area
    `, { uid: { valor: idUsuario, tipo: Int } });

    return {
        resumen: statsGlobal[0] || { total: 0, hechas: 0, pendientes: 0, bloqueadas: 0, promedioAvance: 0 },
        proyectos: statsProyecto,
        avanceMensual: []
    };
}

export async function obtenerTareasPorProyecto(idProyecto: number) {
    return await ejecutarQuery(`
        SELECT 
            t.idTarea, t.idProyecto, 
            t.nombre as titulo,
            t.descripcion, t.estado, t.prioridad, t.esfuerzo, t.tipo,
            t.fechaCreacion, t.fechaObjetivo, t.fechaCompletado,
            t.porcentaje as progreso,
            t.orden, t.idCreador, t.fechaInicioPlanificada,
            t.comportamiento, t.idGrupo, t.numeroParte,
            t.fechaActualizacion as fechaUltActualizacion,
            p.nombre as proyectoNombre,
            ta.idUsuario as idResponsable,
            u.nombreCompleto as responsableNombre,
            u.carnet as responsableCarnet
        FROM p_Tareas t
        LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
        LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea AND ta.tipo = 'Responsable'
        LEFT JOIN p_Usuarios u ON ta.idUsuario = u.idUsuario
        WHERE t.idProyecto = @pid
        ORDER BY t.orden ASC, t.fechaObjetivo ASC
    `, { pid: { valor: idProyecto, tipo: Int } });
}


