// Last Modified: 2026-01-24 20:38:55
import React, { useMemo, useCallback } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';

import { useMiDiaContext } from '../context/MiDiaContext';
import { miDiaKeys } from '../../../hooks/query/useMiDiaQuery';
import { EisenhowerMatrix } from '../../Planning/components/EisenhowerMatrix';
import { clarityService } from '../../../services/clarity.service';
import type { Tarea } from '../../../types/modelos';

type Quad = 'q1' | 'q2' | 'q3' | 'q4';

const MS_DIA = 86400000;

const classifyTask = (t: Tarea, now: Date): Quad => {
    const limiteUrgente = new Date(now.getTime() + MS_DIA * 2);

    const fechaObj = t.fechaObjetivo ? new Date(t.fechaObjetivo) : null;
    const isUrgent = !!(fechaObj && fechaObj <= limiteUrgente);

    const isImportant = t.prioridad === 'Alta' || t.prioridad === 'Media';

    if (isUrgent && isImportant) return 'q1';
    if (!isUrgent && isImportant) return 'q2';
    if (isUrgent && !isImportant) return 'q3';
    return 'q4';
};

const computeUpdates = (targetQuad: Quad, now: Date): Partial<Tarea> => {
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);

    if (targetQuad === 'q1') return { prioridad: 'Alta', fechaObjetivo: now.toISOString() };
    if (targetQuad === 'q2') return { prioridad: 'Alta', fechaObjetivo: nextWeek.toISOString() };
    if (targetQuad === 'q3') return { prioridad: 'Baja', fechaObjetivo: now.toISOString() };
    return { prioridad: 'Baja', fechaObjetivo: undefined };
};

export const MatrixView: React.FC = () => {
    const { allDisponibles, userId, today, isMutating, mutatingTaskId } = useMiDiaContext();
    const queryClient = useQueryClient();

    // ✅ fuente única: allDisponibles (sin duplicar estado)
    const matrixTasks = useMemo(() => {
        const now = new Date();
        const q1: Tarea[] = [], q2: Tarea[] = [], q3: Tarea[] = [], q4: Tarea[] = [];

        (allDisponibles || []).forEach(t => {
            const c = classifyTask(t, now);
            if (c === 'q1') q1.push(t);
            else if (c === 'q2') q2.push(t);
            else if (c === 'q3') q3.push(t);
            else q4.push(t);
        });

        return { q1, q2, q3, q4 };
    }, [allDisponibles]);

    const invalidateMiDia = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: miDiaKeys.usuario(userId) });
    }, [queryClient, userId]);

    // ✅ Mutation: mover tarea (optimistic + rollback)
    const moverTarea = useMutation({
        mutationFn: async (params: { taskId: number; updates: Partial<Tarea> }) => {
            await clarityService.actualizarTarea(params.taskId, params.updates);
        },
        onMutate: async ({ taskId, updates }: { taskId: number; updates: Partial<Tarea> }) => {
            const queryKey = miDiaKeys.fecha(userId, today);
            await queryClient.cancelQueries({ queryKey });

            const previous = queryClient.getQueryData<any>(queryKey);

            queryClient.setQueryData<any>(queryKey, (old: any) => {
                if (!old) return old;

                // EJEMPLO: si old.data.allDisponibles existe. Ajusta a tu estructura real.
                // Si no sabes la estructura exacta, mejor NO tocar cache y solo invalidate.
                try {
                    const cloned = structuredClone(old);
                    const list: Tarea[] = cloned?.data?.allDisponibles || [];
                    cloned.data.allDisponibles = list.map((t: Tarea) =>
                        t.idTarea === taskId ? { ...t, ...updates } : t
                    );
                    return cloned;
                } catch {
                    return old;
                }
            });

            return { previous };
        },
        onError: (_err: any, _vars: any, ctx: any) => {
            if (ctx?.previous) queryClient.setQueryData(miDiaKeys.fecha(userId, today), ctx.previous);
        },
        onSettled: () => {
            invalidateMiDia();
        },
    });

    const handleQuickMove = useCallback(
        (taskId: number, targetQuad: Quad) => {
            const now = new Date();
            const updates = computeUpdates(targetQuad, now);
            moverTarea.mutate({ taskId, updates });
        },
        [moverTarea]
    );

    // ✅ Mutation: agregar tarea (y refrescar via invalidación)
    const crearTarea = useMutation({
        mutationFn: async (title: string) => {
            await clarityService.postTareaRapida({
                titulo: title,
                idUsuario: userId,
                prioridad: 'Media',
                esfuerzo: 'M',
            });
        },
        onSuccess: () => invalidateMiDia(),
    });

    const handleQuickAdd = useCallback(
        (title: string) => {
            if (!title?.trim()) return;
            crearTarea.mutate(title.trim());
        },
        [crearTarea]
    );

    return (
        <div className="h-full flex flex-col animate-fade-in">
            <div className="flex-1 min-h-0 overflow-hidden">
                <EisenhowerMatrix
                    q1Tasks={matrixTasks.q1}
                    q2Tasks={matrixTasks.q2}
                    q3Tasks={matrixTasks.q3}
                    q4Tasks={matrixTasks.q4}
                    onTaskClick={() => { }}
                    onQuickMove={handleQuickMove}
                    onAdd={handleQuickAdd}
                    isBusy={isMutating}
                    busyTaskId={mutatingTaskId || undefined}
                />
            </div>
        </div>
    );
};
