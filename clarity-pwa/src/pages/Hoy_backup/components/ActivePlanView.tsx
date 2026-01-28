// Last Modified: 2026-01-24 20:38:55
import React, { useCallback, useMemo, useState } from 'react';
import type { Checkin, Tarea } from '../../../types/modelos';
import {
    CheckCircle2,
    Circle,
    MessageSquare,
    Send,
    AlertCircle,
    Edit3
} from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { clarityService } from '../../../services/clarity.service';
import { TaskDetailModalV2 } from '../../../components/task-detail-v2/TaskDetailModalV2';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { EvidenceModal } from '../../../components/ui/EvidenceModal';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface Props {
    checkin: Checkin;
    onEdit: () => void;
    toggleTarea: (variables: { idTarea: number; estadoActual: string }) => void;
    isMutating?: boolean;
    mutatingTaskId?: number | null;
}

type Variant = 'Focus' | 'Normal' | 'Extra';

const VARIANT_CLASSES: Record<Variant, {
    container: string;
    circle: string;
    headerBorder?: string;
    headerBg?: string;
    headerText?: string;
    badgeBg?: string;
    badgeText?: string;
}> = {
    Focus: {
        container: 'bg-white border border-rose-100 hover:shadow-sm',
        circle: 'text-rose-300 hover:text-emerald-500',
    },
    Normal: {
        // 👇 reemplaza "blue" por slate (más neutro)
        container: 'bg-white border border-slate-200 hover:shadow-sm',
        circle: 'text-slate-300 hover:text-emerald-500',
    },
    Extra: {
        container: 'bg-white border border-emerald-100 hover:shadow-sm',
        circle: 'text-emerald-300 hover:text-emerald-500',
    },
};

export const ActivePlanView: React.FC<Props> = ({ checkin, onEdit, toggleTarea, isMutating, mutatingTaskId }) => {
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const [quickLogId, setQuickLogId] = useState<number | null>(null);
    const [quickLogText, setQuickLogText] = useState('');
    const [editingTask, setEditingTask] = useState<Tarea | null>(null);
    const [goalDone, setGoalDone] = useState(false);

    // ✅ Invalidate centralizado (si no pasaron onUpdate desde arriba)
    const invalidateMiDia = useCallback(() => {
        // ✅ Invalida todos los datos bajo 'mi-dia'
        queryClient.invalidateQueries({ queryKey: ['mi-dia'] });
    }, [queryClient]);

    // ✅ MUTATION: Quick Log (bitácora/avance)
    const quickLogMutation = useMutation({
        mutationFn: async (params: { taskId: number; comentario: string }) => {
            await clarityService.postAvance(params.taskId, {
                idUsuario: checkin.idUsuario,
                progreso: 0,
                comentario: params.comentario,
            });
        },
        onSuccess: () => {
            setQuickLogId(null);
            setQuickLogText('');
            // showToast('Bitácora actualizada 📝', 'success');
            invalidateMiDia(); // si tu API afecta la vista (opcional)
        },
        onError: () => {
            showToast('Error al registrar avance', 'error');
        },
    });

    // ✅ Data derivada con memo
    const { focusTasks, advanceTasks, extraTasks, allTasks } = useMemo(() => {
        const tareas = checkin.tareas || [];
        const focus = tareas.filter(t => t.tipo === 'Entrego').map(t => t.tarea!).filter(Boolean);
        const adv = tareas.filter(t => t.tipo === 'Avanzo').map(t => t.tarea!).filter(Boolean);
        const ext = tareas.filter(t => t.tipo === 'Extra').map(t => t.tarea!).filter(Boolean);
        return { focusTasks: focus, advanceTasks: adv, extraTasks: ext, allTasks: [...focus, ...adv, ...ext] };
    }, [checkin.tareas]);

    const { total, done, progressPercent } = useMemo(() => {
        const totalTasks = allTasks.length + (focusTasks.length === 0 ? 1 : 0); // + objetivo si no hay foco
        const doneTasksCount = allTasks.filter(t => t.estado === 'Hecha').length;
        const doneTotal = doneTasksCount + (focusTasks.length === 0 && goalDone ? 1 : 0);
        const pct = totalTasks > 0 ? Math.round((doneTotal / totalTasks) * 100) : 0;
        return { total: totalTasks, done: doneTotal, progressPercent: pct };
    }, [allTasks, focusTasks.length, goalDone]);

    const [evidenceTask, setEvidenceTask] = useState<Tarea | null>(null);

    const handleToggleGoal = useCallback(() => {
        setGoalDone(prev => {
            const next = !prev;
            if (next) showToast('¡Objetivo cumplido! 🎉', 'success');
            return next;
        });
    }, [showToast]);

    const handleQuickLog = useCallback(() => {
        if (!quickLogId) return;
        const comentario = quickLogText.trim();
        if (!comentario) return;
        if (quickLogMutation.isPending) return;

        quickLogMutation.mutate({ taskId: quickLogId, comentario });
    }, [quickLogId, quickLogText, quickLogMutation]);

    const openTaskModal = useCallback((task: Tarea) => setEditingTask(task), []);
    const closeTaskModal = useCallback(() => setEditingTask(null), []);

    // ✅ TaskRow SIN tailwind dinámico
    const TaskRow = useCallback(
        ({ task, variant }: { task: Tarea; variant: Variant }) => {
            const isDone = task.estado === 'Hecha';
            const isLogging = quickLogId === task.idTarea;
            const isTaskBusy = isMutating && mutatingTaskId === task.idTarea;
            const classes = VARIANT_CLASSES[variant];

            return (
                <div
                    className={[
                        'group flex items-center gap-2 p-2 rounded-lg border transition-all',
                        isDone ? 'bg-slate-50 border-slate-100 opacity-60' : classes.container,
                    ].join(' ')}
                >
                    <button
                        type="button"
                        onClick={() => {
                            if (isDone) {
                                toggleTarea({ idTarea: Number(task.idTarea), estadoActual: task.estado });
                            } else {
                                if ((task as any).requiereEvidencia && !task.linkEvidencia) {
                                    setEvidenceTask(task);
                                } else {
                                    toggleTarea({ idTarea: Number(task.idTarea), estadoActual: task.estado });
                                }
                            }
                        }}
                        className={`shrink-0 hover:scale-110 transition-transform ${isTaskBusy ? 'animate-pulse opacity-50 cursor-wait' : ''}`}
                        disabled={isTaskBusy}
                        aria-label={isDone ? 'Marcar como pendiente' : 'Marcar como hecha'}
                    >
                        {isDone ? (
                            <CheckCircle2 size={18} className="text-emerald-500 fill-emerald-50" />
                        ) : (
                            <Circle size={18} className={classes.circle} />
                        )}
                    </button>

                    <div className="flex-1 min-w-0 cursor-pointer flex items-center justify-between gap-4" onClick={() => openTaskModal(task)}>
                        <p className={`text-sm font-semibold text-slate-700 truncate ${isDone ? 'line-through' : ''}`}>
                            {task.titulo}
                        </p>
                        {!isDone && (task.estado === 'Bloqueada' || task.estado === 'Revision') && (
                            <StatusBadge status={task.estado} />
                        )}
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setQuickLogId(isLogging ? null : task.idTarea);
                            }}
                            className={`p-1 rounded ${isLogging ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-slate-100 text-slate-400'}`}
                            title="Registrar Avance"
                        >
                            <MessageSquare size={14} />
                        </button>
                    </div>
                </div>
            );
        },
        [openTaskModal, quickLogId, toggleTarea, isMutating, mutatingTaskId]
    );

    const GoalRow = useCallback(() => {
        return (
            <div
                className={[
                    'flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer',
                    goalDone ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50/50 border-rose-100 hover:shadow-sm',
                ].join(' ')}
                onClick={handleToggleGoal}
            >
                <button type="button" className="shrink-0 hover:scale-110 transition-transform">
                    {goalDone ? (
                        <CheckCircle2 size={18} className="text-emerald-500 fill-emerald-50" />
                    ) : (
                        <Circle size={18} className="text-rose-300 hover:text-emerald-500" />
                    )}
                </button>
                <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold text-slate-700 truncate ${goalDone ? 'line-through' : ''}`}>
                        🎯 {checkin.entregableTexto}
                    </p>
                </div>
            </div>
        );
    }, [checkin.entregableTexto, goalDone, handleToggleGoal]);

    return (
        <div className="space-y-4 pb-8">
            {editingTask && (
                <TaskDetailModalV2
                    task={editingTask}
                    mode="execution"
                    onClose={closeTaskModal}
                    onUpdate={() => {
                        invalidateMiDia();
                        closeTaskModal();
                    }}
                />
            )}

            <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white p-4 rounded-xl shadow-lg flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="relative w-12 h-12">
                        <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                            <path
                                className="text-slate-600"
                                stroke="currentColor"
                                strokeWidth="3"
                                fill="none"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                            <path
                                className="text-emerald-400"
                                stroke="currentColor"
                                strokeWidth="3"
                                fill="none"
                                strokeLinecap="round"
                                strokeDasharray={`${progressPercent}, 100`}
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{progressPercent}%</span>
                    </div>

                    <div>
                        <h2 className="text-base font-bold">Mi Tarea Principal</h2>
                        <p className="text-xs text-slate-300">{done}/{total} tareas completadas</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onEdit}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                        title="Editar Plan"
                    >
                        <Edit3 size={16} />
                    </button>
                </div>
            </div>

            {quickLogId && (
                <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 flex gap-2 animate-fade-in">
                    <input
                        autoFocus
                        value={quickLogText}
                        onChange={(e) => setQuickLogText(e.target.value)}
                        placeholder="Escribe qué hiciste..."
                        className="flex-1 text-sm bg-white border border-indigo-100 rounded-lg px-3 py-2 outline-none focus:border-indigo-400"
                        onKeyDown={(e) => e.key === 'Enter' && handleQuickLog()}
                        disabled={quickLogMutation.isPending}
                    />
                    <button
                        type="button"
                        onClick={handleQuickLog}
                        className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                        disabled={quickLogMutation.isPending}
                    >
                        <Send size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setQuickLogId(null)}
                        className="text-slate-400 hover:text-slate-600 p-2"
                        disabled={quickLogMutation.isPending}
                    >
                        <AlertCircle size={16} />
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
                {/* Focus */}
                <div className="bg-white rounded-xl border border-rose-100 shadow-sm overflow-hidden">
                    <div className="px-3 py-2 bg-rose-50 border-b border-rose-100 flex justify-between items-center">
                        <h4 className="font-bold text-rose-700 text-xs uppercase tracking-wide flex items-center gap-1">🎯 TAREA PRINCIPAL</h4>
                        <span className="text-[10px] font-black text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded-full">
                            {focusTasks.length || 1}
                        </span>
                    </div>
                    <div className="p-2 space-y-1.5 max-h-48 overflow-y-auto">
                        {focusTasks.length > 0
                            ? focusTasks.map(t => <TaskRow key={t.idTarea} task={t} variant="Focus" />)
                            : <GoalRow />}
                    </div>
                </div>

                {/* Advance */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                        <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wide flex items-center gap-1">🔨 PARA AVANZAR</h4>
                        <span className="text-[10px] font-black text-slate-700 bg-slate-200 px-1.5 py-0.5 rounded-full">
                            {advanceTasks.length}
                        </span>
                    </div>
                    <div className="p-2 space-y-1.5 max-h-48 overflow-y-auto">
                        {advanceTasks.length > 0
                            ? advanceTasks.map(t => <TaskRow key={t.idTarea} task={t} variant="Normal" />)
                            : <p className="text-slate-400 text-xs italic p-2">Nada asignado.</p>}
                    </div>
                </div>

                {/* Extras */}
                <div className="bg-white rounded-xl border border-emerald-100 shadow-sm overflow-hidden">
                    <div className="px-3 py-2 bg-emerald-50 border-b border-emerald-100 flex justify-between items-center">
                        <h4 className="font-bold text-emerald-700 text-xs uppercase tracking-wide flex items-center gap-1">⚡ TAREA RÁPIDAS</h4>
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                            {extraTasks.length}
                        </span>
                    </div>
                    <div className="p-2 space-y-1.5 max-h-48 overflow-y-auto">
                        {extraTasks.length > 0
                            ? extraTasks.map(t => <TaskRow key={t.idTarea} task={t} variant="Extra" />)
                            : <p className="text-slate-400 text-xs italic p-2">Nada extra hoy.</p>}
                    </div>
                </div>
            </div>
            {evidenceTask && (
                <EvidenceModal
                    task={evidenceTask}
                    onClose={() => setEvidenceTask(null)}
                    onCompleted={async () => {
                        setEvidenceTask(null);
                        // Force refresh needed? The modal marks it as done.
                        // Ideally we should invalidate queries or optimistically update.
                        // ActivePlanView parent does query invalidation on mutation success? 
                        // The parent ExecutionView does query invalidation on Checkin update but maybe not on Task update if using 'toggleTarea' mutation from context (implied?). 
                        // Actually 'toggleTarea' passed here updates React Query cache via useMiDiaContext logic usually. 
                        // But EvidenceModal calls clarityService directly. We need to sync.
                        await queryClient.invalidateQueries({ queryKey: ['mi-dia'] });
                    }}
                />
            )}
        </div>
    );
};
