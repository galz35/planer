/**
 * Planning Repository - Queries para el módulo de planificación
 * Reemplaza TypeORM con consultas directas a SQL Server
 */
import { crearRequest, ejecutarQuery, Int, NVarChar, Bit, DateTime, SqlDate, conTransaccion } from '../db/base.repo';
import { ProyectoDb, TareaDb, PlanTrabajoDb, SolicitudCambioDb, UsuarioDb, UsuarioOrganizacionDb } from '../db/tipos';

// ==========================================
// CONSULTAS DE PROYECTOS
// ==========================================

export async function obtenerProyectosPorUsuario(idUsuario: number) {
    // Obtener proyectos donde el usuario tiene tareas asignadas
    return await ejecutarQuery<ProyectoDb>(`
        SELECT DISTINCT p.* 
        FROM p_Proyectos p
        INNER JOIN p_Tareas t ON p.idProyecto = t.idProyecto
        INNER JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea
        WHERE ta.idUsuario = @idUsuario
        ORDER BY p.fechaCreacion DESC
    `, { idUsuario: { valor: idUsuario, tipo: Int } });
}

export async function obtenerTodosProyectos() {
    return await ejecutarQuery<ProyectoDb>('SELECT * FROM p_Proyectos ORDER BY fechaCreacion DESC');
}

/**
 * Obtiene proyectos visibles para un usuario según reglas de negocio:
 * 1. Proyectos que yo creé
 * 2. Proyectos donde tengo tareas asignadas
 * 3. Proyectos donde mis subordinados (cadena de jefatura) tienen tareas
 */
export async function obtenerProyectosVisibles(idUsuario: number, usuario: any) {
    const sql = `
        ;WITH Equipo AS (
            SELECT u.idUsuario
            FROM p_Usuarios u
            WHERE u.idUsuario = @idUsuario
               OR (
                    @carnet IS NOT NULL AND @carnet <> '' AND
                    (u.jefeCarnet   = @carnet OR
                     u.carnet_jefe2 = @carnet OR
                     u.carnet_jefe3 = @carnet OR
                     u.carnet_jefe4 = @carnet)
                  )
        )
        SELECT p.*
        FROM p_Proyectos p
        WHERE
            p.idCreador = @idUsuario
            OR EXISTS (
                SELECT 1
                FROM p_Tareas t
                INNER JOIN p_TareaAsignados ta ON ta.idTarea = t.idTarea
                INNER JOIN Equipo e ON e.idUsuario = ta.idUsuario
                WHERE t.idProyecto = p.idProyecto
            )
        ORDER BY p.fechaCreacion DESC;
    `;

    return await ejecutarQuery<ProyectoDb>(sql, {
        idUsuario: { valor: idUsuario, tipo: Int },
        carnet: { valor: usuario.carnet || '', tipo: NVarChar }
    });
}


export async function crearProyecto(dto: { nombre: string, descripcion?: string, idNodoDuenio?: number, area?: string, subgerencia?: string, gerencia?: string, fechaInicio?: Date, fechaFin?: Date, idCreador: number }) {
    const res = await ejecutarQuery<{ idProyecto: number }>(`
        INSERT INTO p_Proyectos (nombre, descripcion, idNodoDuenio, area, subgerencia, gerencia, fechaInicio, fechaFin, fechaCreacion, idCreador, estado)
        OUTPUT INSERTED.idProyecto
        VALUES (@nombre, @descripcion, @idNodoDuenio, @area, @subgerencia, @gerencia, @fechaInicio, @fechaFin, GETDATE(), @idCreador, 'Activo')
    `, {
        nombre: { valor: dto.nombre, tipo: NVarChar },
        descripcion: { valor: dto.descripcion, tipo: NVarChar },
        idNodoDuenio: { valor: dto.idNodoDuenio, tipo: Int },
        area: { valor: dto.area, tipo: NVarChar },
        subgerencia: { valor: dto.subgerencia, tipo: NVarChar },
        gerencia: { valor: dto.gerencia, tipo: NVarChar },
        fechaInicio: { valor: dto.fechaInicio, tipo: DateTime },
        fechaFin: { valor: dto.fechaFin, tipo: DateTime },
        idCreador: { valor: dto.idCreador, tipo: Int }
    });
    return res[0].idProyecto;
}

export async function actualizarDatosProyecto(idProyecto: number, updates: Partial<ProyectoDb>) {
    const sets: string[] = [];
    const params: any = { idProyecto: { valor: idProyecto, tipo: Int } };

    for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
            sets.push(`${key} = @${key}`);
            let tipo = NVarChar;
            if (typeof value === 'number') tipo = Int;
            if (typeof value === 'boolean') tipo = Bit;
            if (value instanceof Date) tipo = DateTime;
            params[key] = { valor: value, tipo };
        }
    }

    if (sets.length === 0) return;

    await ejecutarQuery(`UPDATE p_Proyectos SET ${sets.join(', ')} WHERE idProyecto = @idProyecto`, params);
}

export async function eliminarProyecto(idProyecto: number) {
    await ejecutarQuery('DELETE FROM p_Proyectos WHERE idProyecto = @idProyecto', { idProyecto: { valor: idProyecto, tipo: Int } });
}

export async function obtenerProyectoPorId(idProyecto: number) {
    const res = await ejecutarQuery<ProyectoDb>('SELECT * FROM p_Proyectos WHERE idProyecto = @idProyecto', { idProyecto: { valor: idProyecto, tipo: Int } });
    return res[0];
}

// ==========================================
// CONSULTAS DE TAREAS
// ==========================================

export async function obtenerTareaPorId(idTarea: number) {
    const tareas = await ejecutarQuery<TareaDb & {
        proyectoTipo?: string,
        proyectoRequiereAprobacion?: boolean
    }>(`
        SELECT 
            t.*, 
            p.tipo as proyectoTipo, 
            p.requiereAprobacion as proyectoRequiereAprobacion
        FROM p_Tareas t
        LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
        WHERE t.idTarea = @idTarea
    `, { idTarea: { valor: idTarea, tipo: Int } });

    return tareas[0] || null;
}

export async function actualizarTarea(idTarea: number, updates: Partial<TareaDb>) {
    const sets: string[] = [];
    const params: any = { idTarea: { valor: idTarea, tipo: Int } };

    for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
            sets.push(`${key} = @${key}`);

            let tipo = NVarChar;
            if (typeof value === 'number') tipo = Int;
            if (typeof value === 'boolean') tipo = Bit;
            if (value instanceof Date) tipo = DateTime;

            params[key] = { valor: value, tipo };
        }
    }

    if (sets.length === 0) return;

    await ejecutarQuery(`
        UPDATE p_Tareas 
        SET ${sets.join(', ')} 
        WHERE idTarea = @idTarea
    `, params);
}

// ==========================================
// CONSULTAS DE SOLICITUDES DE CAMBIO
// ==========================================

export async function crearSolicitudCambio(solicitud: any) {
    const result = await ejecutarQuery<{ id: number }>(`
        INSERT INTO p_SolicitudCambios 
        (idTarea, idSolicitante, carnetSolicitante, campoAfectado, valorAnterior, valorNuevo, motivo, estado, fechaSolicitud)
        OUTPUT INSERTED.id
        VALUES 
        (@idTarea, @idSolicitante, @carnetSolicitante, @campoAfectado, @valorAnterior, @valorNuevo, @motivo, @estado, @fechaSolicitud)
    `, {
        idTarea: { valor: solicitud.idTarea, tipo: Int },
        idSolicitante: { valor: solicitud.idUsuarioSolicitante, tipo: Int },
        carnetSolicitante: { valor: solicitud.carnetSolicitante, tipo: NVarChar },
        campoAfectado: { valor: solicitud.campoAfectado, tipo: NVarChar },
        valorAnterior: { valor: solicitud.valorAnterior, tipo: NVarChar },
        valorNuevo: { valor: solicitud.valorNuevo, tipo: NVarChar },
        motivo: { valor: solicitud.motivo, tipo: NVarChar },
        estado: { valor: solicitud.estado, tipo: NVarChar },
        fechaSolicitud: { valor: solicitud.fechaSolicitud, tipo: DateTime }
    });

    return { ...solicitud, id: result[0].id };
}

export async function obtenerSolicitudesPendientes() {
    return await ejecutarQuery<any>(`
        SELECT s.*, t.nombre as tareaNombre, p.nombre as proyectoNombre, u.nombre as solicitanteNombre 
        FROM p_SolicitudCambios s
        JOIN p_Tareas t ON s.idTarea = t.idTarea
        LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
        LEFT JOIN p_Usuarios u ON s.carnetSolicitante = u.carnet
        WHERE s.estado = 'Pendiente'
        ORDER BY s.fechaSolicitud DESC
    `);
}

export async function obtenerSolicitudesPorCarnets(carnets: string[]) {
    if (carnets.length === 0) return [];
    // Sanitize and quote carnets
    const carnetsStr = carnets.map(c => `'${c.replace(/'/g, "''")}'`).join(',');

    return await ejecutarQuery<any>(`
        SELECT s.*, t.nombre as tareaNombre, p.nombre as proyectoNombre, u.nombre as solicitanteNombre 
        FROM p_SolicitudCambios s
        JOIN p_Tareas t ON s.idTarea = t.idTarea
        LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
        LEFT JOIN p_Usuarios u ON s.carnetSolicitante = u.carnet
        WHERE s.carnetSolicitante IN (${carnetsStr}) AND s.estado = 'Pendiente'
        ORDER BY s.fechaSolicitud DESC
    `);
}

export async function obtenerSolicitudPorId(id: number) {
    const res = await ejecutarQuery<SolicitudCambioDb>('SELECT * FROM p_SolicitudCambios WHERE id = @id', { id: { valor: id, tipo: Int } });
    return res[0] || null;
}

export async function actualizarEstadoSolicitud(idSolicitud: number, estado: string, resolucion?: string, idResueltoPor?: number) {
    await ejecutarQuery(`
        UPDATE p_SolicitudCambios 
        SET estado = @estado, resolucion = @resolucion, idResueltoPor = @idResueltoPor, fechaResolucion = GETDATE()
        WHERE id = @idSolicitud
    `, {
        idSolicitud: { valor: idSolicitud, tipo: Int },
        estado: { valor: estado, tipo: NVarChar },
        resolucion: { valor: resolucion, tipo: NVarChar },
        idResueltoPor: { valor: idResueltoPor, tipo: Int }
    });
}

// ==========================================
// CONSULTAS DE PLANES DE TRABAJO
// ==========================================

export async function obtenerPlanes(idUsuario: number, mes: number, anio: number) {
    // Buscar plan existente
    const planes = await ejecutarQuery<any>(`
        SELECT * FROM p_PlanesTrabajo 
        WHERE idUsuario = @idUsuario AND mes = @mes AND anio = @anio
    `, {
        idUsuario: { valor: idUsuario, tipo: Int },
        mes: { valor: mes, tipo: Int },
        anio: { valor: anio, tipo: Int }
    });

    let plan = planes[0];

    // Si no existe, devolver estructura vacía (o crearlo si fuera necesario, pero mejor solo devolver null)
    if (!plan) return null;

    // Obtener tareas del plan
    const tareas = await ejecutarQuery<any>(`
        SELECT t.*, p.nombre as proyectoNombre, p.tipo as proyectoTipo
        FROM p_Tareas t
        LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
        WHERE t.idPlan = @idPlan
        ORDER BY t.orden ASC
    `, { idPlan: { valor: plan.idPlan, tipo: Int } });

    // Armar estructura para frontend
    return {
        ...plan,
        semanas: [
            { id: 1, label: 'Semana 1', tareas: tareas.filter(t => t.semana === 1) },
            { id: 2, label: 'Semana 2', tareas: tareas.filter(t => t.semana === 2) },
            { id: 3, label: 'Semana 3', tareas: tareas.filter(t => t.semana === 3) },
            { id: 4, label: 'Semana 4', tareas: tareas.filter(t => t.semana === 4) }
        ]
    };
}

export async function upsertPlan(datos: any) {
    const { idUsuario, mes, anio, objetivos, estado, idCreador } = datos;

    // Verificar si existe
    const existente = await ejecutarQuery(`
        SELECT idPlan FROM p_PlanesTrabajo 
        WHERE idUsuario = @idUsuario AND mes = @mes AND anio = @anio
    `, {
        idUsuario: { valor: idUsuario, tipo: Int },
        mes: { valor: mes, tipo: Int },
        anio: { valor: anio, tipo: Int }
    });

    if (existente.length > 0) {
        // Update
        const idPlan = existente[0].idPlan;
        await ejecutarQuery(`
            UPDATE p_PlanesTrabajo 
            SET objetivos = @objetivos, estado = @estado, fechaActualizacion = GETDATE()
            WHERE idPlan = @idPlan
        `, {
            idPlan: { valor: idPlan, tipo: Int },
            objetivos: { valor: typeof objetivos === 'string' ? objetivos : JSON.stringify(objetivos), tipo: NVarChar },
            estado: { valor: estado, tipo: NVarChar }
        });
        return { idPlan, ...datos };
    } else {
        // Insert
        const res = await ejecutarQuery<{ idPlan: number }>(`
            INSERT INTO p_PlanesTrabajo (idUsuario, mes, anio, objetivos, estado, idCreador, fechaCreacion)
            OUTPUT INSERTED.idPlan
            VALUES (@idUsuario, @mes, @anio, @objetivos, @estado, @idCreador, GETDATE())
        `, {
            idUsuario: { valor: idUsuario, tipo: Int },
            mes: { valor: mes, tipo: Int },
            anio: { valor: anio, tipo: Int },
            objetivos: { valor: typeof objetivos === 'string' ? objetivos : JSON.stringify(objetivos), tipo: NVarChar },
            estado: { valor: estado, tipo: NVarChar },
            idCreador: { valor: idCreador, tipo: Int }
        });
        return { idPlan: res[0].idPlan, ...datos };
    }
}

// ==========================================
// CONSULTAS DE JERARQUÍA (RECURSIVO)
// ==========================================

export async function obtenerNodosLiderados(idUsuario: number) {
    return await ejecutarQuery<{ idNodo: number }>(`
        SELECT idNodo FROM p_UsuariosOrganizacion 
        WHERE idUsuario = @idUsuario AND rol IN ('Lider', 'Gerente', 'Director')
    `, { idUsuario: { valor: idUsuario, tipo: Int } });
}

export async function obtenerHijosDeNodos(idsPadres: number[]) {
    if (idsPadres.length === 0) return [];

    // Construir lista IN para la query (sanitizada via parameter no soportado en lista, usaremos string builder seguro con ints)
    const idsStr = idsPadres.map(id => Math.floor(id)).join(',');

    return await ejecutarQuery<{ idNodo: number }>(`
        SELECT idNodo FROM p_OrganizacionNodos WHERE idPadre IN (${idsStr})
    `);
}

export async function obtenerUsuariosEnNodos(idsNodos: number[]) {
    if (idsNodos.length === 0) return [];
    const idsStr = idsNodos.map(id => Math.floor(id)).join(',');

    return await ejecutarQuery<{ idUsuario: number }>(`
        SELECT idUsuario FROM p_UsuariosOrganizacion WHERE idNodo IN (${idsStr})
    `);
}

// ==========================================
// TEAM
// ==========================================

export async function obtenerEquipoDirecto(carnetJefe: string) {
    const rows = await ejecutarQuery<UsuarioDb & {
        rolNombre?: string;
        rolDescripcion?: string;
        rolEsSistema?: boolean;
        rolReglas?: string;
        rolDefaultMenu?: string
    }>(`
        SELECT 
            u.*,
            r.nombre as rolNombre,
            r.descripcion as rolDescripcion,
            r.esSistema as rolEsSistema,
            r.reglas as rolReglas,
            r.defaultMenu as rolDefaultMenu
        FROM p_Usuarios u
        LEFT JOIN p_Roles r ON u.idRol = r.idRol
        WHERE u.jefeCarnet = @carnetJefe AND u.activo = 1
    `, { carnetJefe: { valor: carnetJefe, tipo: NVarChar } });

    return rows.map(row => {
        const usuario: any = { ...row };
        if (row.idRol) {
            usuario.rol = {
                idRol: row.idRol,
                nombre: row.rolNombre || '',
                descripcion: row.rolDescripcion || null,
                esSistema: row.rolEsSistema || false,
                reglas: row.rolReglas || '[]',
                defaultMenu: row.rolDefaultMenu || null
            };
        }
        return usuario;
    });
}

