import { ejecutarQuery, ejecutarSP, Int, NVarChar, DateTime, Bit } from '../db/base.repo';
import { TareaDb } from '../db/tipos';
import { TaskStatus, TaskPriority, TaskType } from '../common/enums/task.enums';

// DTO interno unificado para creación
export interface CreateTaskParams {
    titulo: string;
    idCreador: number;
    idProyecto?: number;
    descripcion?: string;
    estado?: TaskStatus | string;
    prioridad?: TaskPriority | string;
    esfuerzo?: string;
    tipo?: TaskType | string;
    fechaInicioPlanificada?: Date;
    fechaObjetivo?: Date;
    progreso?: number;
    orden?: number;
    // Campos nuevos / específicos
    comportamiento?: string;
    idTareaPadre?: number;
    idResponsable?: number;
    requiereEvidencia?: boolean;
    idEntregable?: number;
    creadorCarnet?: string;
}

export interface UpdateTaskParams {
    titulo?: string;
    descripcion?: string;
    estado?: TaskStatus | string;
    prioridad?: TaskPriority | string;
    esfuerzo?: string;
    progreso?: number;
    fechaInicioPlanificada?: Date;
    fechaObjetivo?: Date;
    linkEvidencia?: string;
    comentario?: string; // Para bitácora rápida
    requiereEvidencia?: boolean;
    idTareaPadre?: number;
    idResponsable?: number;
}

/**
 * REPOSITORIO UNIFICADO DE TAREAS
 * Centraliza toda la lógica de escritura (Crear/Actualizar/Borrar) para Tareas.
 * Reemplaza la lógica duplicada en clarity.repo y planning.repo.
 */

// ==========================================
// CREACIÓN
// ==========================================

export async function crearTarea(params: CreateTaskParams): Promise<number> {
    // 1. Defaults y validaciones básicas
    const fechaObjetivo = params.fechaObjetivo || new Date();
    const estado = params.estado || TaskStatus.Pendiente;
    const prioridad = params.prioridad || TaskPriority.Media;
    const tipo = params.tipo || TaskType.Administrativa;

    // 2. Ejecutar SP ROBUSTO de creación completa v2 (2026-01-26)
    const res = await ejecutarSP<{ idTarea: number }>('sp_Tarea_CrearCompleta_v2', {
        nombre: { valor: params.titulo, tipo: NVarChar },
        idUsuario: { valor: params.idCreador, tipo: Int },
        idProyecto: { valor: params.idProyecto || null, tipo: Int },
        descripcion: { valor: params.descripcion || null, tipo: NVarChar },
        estado: { valor: estado, tipo: NVarChar },
        prioridad: { valor: prioridad, tipo: NVarChar },
        esfuerzo: { valor: params.esfuerzo || null, tipo: NVarChar },
        tipo: { valor: tipo, tipo: NVarChar },
        fechaInicioPlanificada: { valor: params.fechaInicioPlanificada || null, tipo: DateTime },
        fechaObjetivo: { valor: fechaObjetivo, tipo: DateTime },
        porcentaje: { valor: params.progreso || 0, tipo: Int },
        orden: { valor: params.orden || 0, tipo: Int },
        comportamiento: { valor: params.comportamiento || null, tipo: NVarChar },
        idTareaPadre: { valor: params.idTareaPadre || null, tipo: Int },
        idResponsable: { valor: params.idResponsable || null, tipo: Int },
        requiereEvidencia: { valor: params.requiereEvidencia || false, tipo: Bit },
        idEntregable: { valor: params.idEntregable || null, tipo: Int },
        creadorCarnet: { valor: params.creadorCarnet || null, tipo: NVarChar },
        semana: { valor: null, tipo: Int } // Default null, can be extended later if CreateTaskParams supports it
    });

    return res[0].idTarea;
}

export async function recalcularJerarquia(idTarea?: number, idPadreDirecto?: number) {
    // Inteligencia en BD: Recálculo recursivo de estados y progresos
    await ejecutarSP('sp_Tarea_RecalcularJerarquia_v2', {
        idTareaInicio: { valor: idTarea || null, tipo: Int },
        idPadreDirecto: { valor: idPadreDirecto || null, tipo: Int }
    });
}


// ==========================================
// ACTUALIZACIÓN
// ==========================================

import * as planningRepo from '../planning/planning.repo';

export async function actualizarTarea(idTarea: number, updates: UpdateTaskParams) {
    // 1. Obtener estado previo para detectar cambios de jerarquía
    const tareaPrevia = await obtenerTarea(idTarea);

    // V4: Unificación de lógica. Usamos el repo de planning que ya tiene el SP y validaciones
    const dbUpdates: any = {
        nombre: updates.titulo,
        descripcion: updates.descripcion,
        estado: updates.estado,
        prioridad: updates.prioridad,
        porcentaje: updates.progreso,
        fechaObjetivo: updates.fechaObjetivo,
        fechaInicioPlanificada: updates.fechaInicioPlanificada,
        linkEvidencia: updates.linkEvidencia,
        idTareaPadre: updates.idTareaPadre
    };

    // 2. Ejecutar Update Base
    await planningRepo.actualizarTarea(idTarea, dbUpdates);

    // 3. Manejo especial de reasignación
    if (updates.idResponsable) {
        await reasignarResponsable(idTarea, updates.idResponsable);
    }

    // 4. AUTO-ROLLUP: Si hay cambios en jerarquía o métricas, recalcular
    const hayCambioPadre = updates.idTareaPadre !== undefined && tareaPrevia?.idPadre !== updates.idTareaPadre;
    const hayCambioMetricas = updates.progreso !== undefined || updates.estado !== undefined;

    if (hayCambioPadre) {
        // Recalcular Padre Viejo (si tenía)
        if (tareaPrevia?.idPadre) {
            await recalcularJerarquia(undefined, tareaPrevia.idPadre);
        }
        // Recalcular Nuevo Padre
        if (updates.idTareaPadre) {
            await recalcularJerarquia(undefined, updates.idTareaPadre);
        }
    } else if (hayCambioMetricas && tareaPrevia?.idPadre) {
        // Mismo padre, cambiaron métricas
        await recalcularJerarquia(undefined, tareaPrevia.idPadre);
    }
}

// ==========================================
// UTILS
// ==========================================

export async function asignarUsuario(idTarea: number, idUsuario: number, tipo: string = 'Responsable') {
    // Idempotente: Verifica si ya existe
    const existe = await ejecutarQuery('SELECT 1 FROM p_TareaAsignados WHERE idTarea = @t AND idUsuario = @u', {
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
    // 1. Quitar anteriores
    await ejecutarQuery("DELETE FROM p_TareaAsignados WHERE idTarea = @t AND tipo = 'Responsable'", {
        t: { valor: idTarea, tipo: Int }
    });
    // 2. Asignar nuevo
    await asignarUsuario(idTarea, idNuevoResponsable, 'Responsable');
}

export async function obtenerTarea(idTarea: number): Promise<TareaDb | null> {
    const res = await ejecutarQuery<TareaDb>('SELECT *, porcentaje as progreso FROM p_Tareas WHERE idTarea = @id', { id: { valor: idTarea, tipo: Int } });
    return res.length > 0 ? res[0] : null;
}
