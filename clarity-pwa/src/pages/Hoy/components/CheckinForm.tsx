import React, { useState, useEffect } from 'react';
import type { Tarea, CheckinUpsertDto, Bloqueo, Proyecto } from '../../../types/modelos';
import { Zap, Battery, BatteryWarning, Plus, X, CheckCircle2, Circle, MessageSquare, Send, Trash2 } from 'lucide-react';
import { TaskDetailModal } from '../../../components/ui/TaskDetailModal';
import { TaskSelectorOverlay } from './TaskSelectorOverlay';
import { useToast } from '../../../context/ToastContext';

interface Props {
    disponibles: Tarea[];
    checkinTasks?: Tarea[]; // New prop for existing tasks inside the form
    onSubmit: (dto: CheckinUpsertDto) => Promise<void>;
    userId: number;
    fecha: string;
    initialData?: CheckinUpsertDto;
    onTaskCreated?: () => Promise<void>;
    bloqueos?: Bloqueo[];
    onMoodChange?: (mood: 'Tope' | 'Bien' | 'Bajo') => void;
}

export const CheckinForm: React.FC<Props> = ({ disponibles, checkinTasks = [], onSubmit, userId, fecha, initialData, onTaskCreated, bloqueos = [], onMoodChange }) => {
    // Form State
    const { showToast } = useToast();
    const [estadoAnimo, setEstadoAnimo] = useState<'Tope' | 'Bien' | 'Bajo' | undefined>(initialData?.estadoAnimo || undefined);
    // Note: 'entregableTexto' is now derived from the selected tasks in Column 1, so we don't strictly need a state for it, 
    // but the API requires it. We will generate it on submit.


    // Slots State (Dynamic Arrays)
    // Default 1 Focus (Now "Objetivo Principal"), 3 Advance, 5 Extra.
    const [entregoIds, setEntregoIds] = useState<(number | null)[]>([null]);
    const [avanzoIds, setAvanzoIds] = useState<(number | null)[]>([null, null, null]);
    const [extraIds, setExtraIds] = useState<(number | null)[]>([null, null, null, null, null]);

    // UI State
    const [selectingFor, setSelectingFor] = useState<{ type: 'Entrego' | 'Avanzo' | 'Extra', index: number } | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [editingTask, setEditingTask] = useState<Tarea | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Quick Actions State
    const [quickLogId, setQuickLogId] = useState<number | null>(null);
    const [quickLogText, setQuickLogText] = useState('');
    const [viewBlockers, setViewBlockers] = useState(false);
    const [lastCreationProjectId, setLastCreationProjectId] = useState<number | ''>('');
    const [localTasks, setLocalTasks] = useState<Tarea[]>([]); // Tareas creadas localmente para visualización inmediata

    // Initialize arrays from initialData
    const [projects, setProjects] = useState<Proyecto[]>([]);

    useEffect(() => {
        const loadP = async () => {
            try {
                const { clarityService } = await import('../../../services/clarity.service');
                const p = await clarityService.getProyectos();
                setProjects((p as any).items || p || []);
            } catch { } // Silent fail
        };
        loadP();
    }, []);

    useEffect(() => {
        if (initialData?.entrego && initialData.entrego.length > 0) {
            const newArr = [...initialData.entrego];
            if (newArr.length < 1) newArr.push(null as any);
            setEntregoIds(newArr);
        }

        if (initialData?.avanzo && initialData.avanzo.length > 0) {
            const newArr = [...initialData.avanzo];
            while (newArr.length < 3) newArr.push(null as any);
            setAvanzoIds(newArr);
        }

        if (initialData?.extras && initialData.extras.length > 0) {
            const newArr = [...initialData.extras];
            while (newArr.length < 5) newArr.push(null as any);
            setExtraIds(newArr);
        }
    }, [initialData]);

    // Helpers
    const getTask = (id: number | null) => {
        if (!id) return null;
        return disponibles.find(t => t.idTarea === id) || checkinTasks.find(t => t.idTarea === id) || localTasks.find(t => t.idTarea === id);
    };
    const isSelected = (id: number) => entregoIds.includes(id) || avanzoIds.includes(id) || extraIds.includes(id);

    // List Management Helpers
    const addSlot = (type: 'Entrego' | 'Avanzo' | 'Extra') => {
        if (type === 'Entrego') setEntregoIds(p => [...p, null]);
        if (type === 'Avanzo') setAvanzoIds(p => [...p, null]);
        if (type === 'Extra') setExtraIds(p => [...p, null]);
    };

    const removeSlot = (e: React.MouseEvent, type: 'Entrego' | 'Avanzo' | 'Extra', index: number) => {
        e.stopPropagation();
        const removeLogic = (prev: (number | null)[], minLen: number) => {
            const newVal = [...prev];
            if (newVal[index] !== null) {
                newVal[index] = null;
                return newVal;
            } else {
                if (newVal.length > minLen) {
                    newVal.splice(index, 1);
                    return newVal;
                }
                return prev;
            }
        };

        if (type === 'Entrego') setEntregoIds(p => removeLogic(p, 1));
        if (type === 'Avanzo') setAvanzoIds(p => removeLogic(p, 3));
        if (type === 'Extra') setExtraIds(p => removeLogic(p, 5));
    };

    // UI Helpers
    const getDaysActive = (dateStr?: string | Date) => {
        if (!dateStr) return 0;
        const d = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        return Math.floor(diff / (1000 * 3600 * 24));
    };

    const StatusBadge = ({ task }: { task: Tarea }) => {
        const days = getDaysActive(task.fechaCreacion);
        const isLate = days > 3;
        return (
            <div className="flex items-center gap-2 text-xs font-bold mt-1">
                <span className={`px-2 py-0.5 rounded-full ${task.estado === 'EnCurso' ? 'bg-blue-100 text-blue-700' : task.estado === 'Hecha' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {task.estado === 'EnCurso' ? 'En Curso' : task.estado}
                </span>
                {days > 0 && task.estado !== 'Hecha' && (
                    <span className={`${isLate ? 'text-rose-500' : 'text-slate-400'}`}>
                        {days}d activa
                    </span>
                )}
            </div>
        );
    };

    const handleSelectTask = (task: Tarea) => {
        if (!selectingFor) return;
        const { type, index } = selectingFor;

        setEntregoIds(prev => prev.map(id => id === task.idTarea ? null : id));
        setAvanzoIds(prev => prev.map(id => id === task.idTarea ? null : id));
        setExtraIds(prev => prev.map(id => id === task.idTarea ? null : id));

        if (type === 'Entrego') setEntregoIds(prev => { const n = [...prev]; n[index] = task.idTarea; return n; });
        if (type === 'Avanzo') setAvanzoIds(prev => { const n = [...prev]; n[index] = task.idTarea; return n; });
        if (type === 'Extra') setExtraIds(prev => { const n = [...prev]; n[index] = task.idTarea; return n; });

        setSelectingFor(null);
    };

    const handleQuickAdd = async (val: string, _type?: any, _index?: any, projectId?: number) => {
        if (!val.trim() || !selectingFor) return;

        // Save preference for next time
        setLastCreationProjectId(projectId !== undefined ? projectId : '');

        try {
            const { clarityService } = await import('../../../services/clarity.service');
            const prioridad = selectingFor.type === 'Entrego' ? 'Alta' : selectingFor.type === 'Avanzo' ? 'Media' : 'Baja';
            const esfuerzo = selectingFor.type === 'Entrego' ? 'L' : selectingFor.type === 'Avanzo' ? 'M' : 'S';

            const newT = await clarityService.postTareaRapida({
                titulo: val,
                idUsuario: userId,
                idProyecto: projectId,
                prioridad,
                esfuerzo
            });
            if (onTaskCreated) await onTaskCreated();

            const realProject = projects.find(p => p.idProyecto === projectId);
            const tempTask = { ...newT, proyecto: realProject || { nombre: 'Inbox' } } as unknown as Tarea;

            setLocalTasks(prev => [...prev, tempTask]);
            handleSelectTask(tempTask);
        } catch (err) { showToast('Error creando tarea', 'error'); }
    };

    const validate = () => {
        // We no longer strictly block the user, but we ensure we have at least SOME info for the API
        const validEntrego = entregoIds.filter(id => id !== null);
        const validAvanzo = avanzoIds.filter(id => id !== null);
        const validExtra = extraIds.filter(id => id !== null);

        if (validEntrego.length === 0 && validAvanzo.length === 0 && validExtra.length === 0) {
            showToast('Tu plan está vacío. Agrega al menos una tarea.', 'error');
            console.log('Validation failed: No tasks selected', { entregoIds, avanzoIds, extraIds });
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;
        setErrors({});

        const validEntrego = entregoIds.filter(id => id !== null);

        // Auto-generate goal text from the "Objetivo Principal" tasks
        let generatedGoalText = validEntrego.map(id => {
            const t = disponibles.find(d => d.idTarea === id);
            return t ? t.titulo : '';
        }).filter(Boolean).join(' + ');

        // Fallback if no specific task is in Column 1
        if (!generatedGoalText) {
            generatedGoalText = initialData?.entregableTexto || 'Plan de Trabajo';
        }

        setSubmitting(true);
        try {
            await onSubmit({
                idUsuario: userId,
                fecha,
                entregableTexto: generatedGoalText,
                entrego: validEntrego as number[],
                avanzo: avanzoIds.filter((id): id is number => id !== null),
                extras: extraIds.filter((id): id is number => id !== null),
                estadoAnimo,
                linkEvidencia: initialData?.linkEvidencia
            });
        } catch (err) {
            showToast('Error al enviar check-in', 'error');
        } finally { setSubmitting(false); }
    };

    const handleToggleComplete = async (task: Tarea, e: React.MouseEvent) => {
        e.stopPropagation();
        const newState = task.estado === 'Hecha' ? 'EnCurso' : 'Hecha';
        try {
            const { clarityService } = await import('../../../services/clarity.service');
            await clarityService.actualizarTarea(task.idTarea, { estado: newState });
            if (onTaskCreated) await onTaskCreated();
        } catch (err) { showToast('Error al actualizar', 'error'); }
    };

    const handleQuickLogSubmit = async (e: React.FormEvent, taskId: number) => {
        e.preventDefault();
        e.stopPropagation();
        if (!quickLogText.trim()) return;
        try {
            const { clarityService } = await import('../../../services/clarity.service');
            await clarityService.postAvance(taskId, {
                idUsuario: userId,
                progreso: 0,
                comentario: quickLogText
            });
            setQuickLogId(null);
            setQuickLogText('');
            if (onTaskCreated) await onTaskCreated();
        } catch (err) { showToast('Error guardando bitácora', 'error'); }
    };

    const handleSlotClick = (type: 'Entrego' | 'Avanzo' | 'Extra', index: number, currentId: number | null) => {
        if (!currentId) {
            setSelectingFor({ type, index });
        } else {
            const task = getTask(currentId);
            if (task) setEditingTask(task);
        }
    };

    const renderCard = (type: 'Entrego' | 'Avanzo' | 'Extra', id: number | null, idx: number) => {
        const task = getTask(id);
        const isQuickLogging = id !== null && quickLogId === id;

        let activeBorder = 'border-l-4 border-l-rose-500';
        let bgClass = 'bg-white';
        let emptyText = 'Escribe o selecciona...';

        // Customized placeholders
        if (type === 'Entrego') { activeBorder = 'border-l-4 border-l-rose-500'; emptyText = 'Definir Objetivo...'; }
        if (type === 'Avanzo') { activeBorder = 'border-l-4 border-l-blue-500'; emptyText = 'Agregar pendiente...'; }
        if (type === 'Extra') { activeBorder = 'border-l-4 border-l-emerald-500'; emptyText = 'Agregar victoria rápida...'; }

        if (id && isQuickLogging) { bgClass = 'bg-indigo-50 shadow-md ring-1 ring-indigo-200'; }

        return (
            <div key={`${type}-${idx}`}
                onClick={(e) => {
                    if (isQuickLogging) return;
                    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
                    handleSlotClick(type, idx, id);
                }}
                className={`group relative p-3 rounded-lg border border-transparent hover:border-slate-200 hover:bg-slate-50 transition-all cursor-pointer animate-fade-in
                ${id ? `shadow-sm ${activeBorder} ${bgClass}` : 'border-dashed border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-600'}`}
            >
                {id && task ? (
                    isQuickLogging ? (
                        <div className="w-full flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            <input
                                autoFocus
                                value={quickLogText}
                                onChange={e => setQuickLogText(e.target.value)}
                                placeholder="Bitácora rápida..."
                                className="flex-1 bg-white p-2 rounded-lg border border-indigo-200 text-sm outline-none focus:border-indigo-500"
                                onKeyDown={e => e.key === 'Enter' && handleQuickLogSubmit(e, id)}
                            />
                            <button onClick={e => handleQuickLogSubmit(e, id)} className="p-2 bg-indigo-600 text-white rounded-lg"><Send size={16} /></button>
                            <button onClick={() => setQuickLogId(null)} className="p-2 text-slate-400 hover:text-slate-600"><X size={16} /></button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <button onClick={(e) => handleToggleComplete(task, e)} className="hover:scale-110 transition-transform flex-shrink-0">
                                    {task.estado === 'Hecha'
                                        ? <CheckCircle2 size={20} className="text-emerald-500 fill-emerald-50" />
                                        : <Circle size={20} className="text-slate-300 hover:text-indigo-500" />
                                    }
                                </button>
                                <div className="min-w-0">
                                    <p className={`font-medium text-slate-700 truncate ${task.estado === 'Hecha' ? 'line-through opacity-50' : ''}`}>
                                        {task.titulo}
                                    </p>
                                    <div className="flex gap-2 text-[10px] text-slate-400 mt-0.5">
                                        <StatusBadge task={task} />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); setQuickLogId(id); setQuickLogText(''); }}
                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-md transition-colors" title="Añadir Bitácora">
                                    <MessageSquare size={16} />
                                </button>
                                <button onClick={(e) => removeSlot(e, type, idx)}
                                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-white rounded-md transition-colors" title="Quitar">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    )
                ) : (
                    <div className="flex items-center gap-3 py-1">
                        <Plus size={18} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                        <span className="text-sm font-medium">{emptyText}</span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <form onSubmit={handleSubmit} className="h-full flex flex-col gap-4 animate-fade-in max-w-7xl mx-auto pb-6 relative">
            {editingTask && (
                <TaskDetailModal
                    task={editingTask}
                    onClose={() => setEditingTask(null)}
                    onUpdate={async () => {
                        if (onTaskCreated) await onTaskCreated();
                        setEditingTask(null);
                    }}
                />
            )}

            {selectingFor && (
                <TaskSelectorOverlay
                    disponibles={disponibles}
                    selectionContext={selectingFor}
                    onClose={() => setSelectingFor(null)}
                    onSelect={handleSelectTask}
                    isSelected={isSelected}
                    onQuickAdd={handleQuickAdd}
                    projects={projects}
                    defaultProjectId={lastCreationProjectId}
                />
            )}

            {/* ROW 1: UTILS BAR (Mood + Blockers + Submit) */}
            <div className="flex flex-col md:flex-row items-center gap-4">

                {/* MOOD + BLOCKERS CONTAINER */}
                <div className="flex-1 w-full bg-white p-2 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between gap-4 overflow-hidden">

                    {/* Mood (Left) */}
                    <div className="flex items-center gap-2 pl-2 border-r border-slate-100 pr-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide hidden sm:block">Mi Ánimo:</span>
                        {[
                            { id: 'Tope', icon: Zap, color: 'emerald', label: 'Motivado' },
                            { id: 'Bien', icon: Battery, color: 'indigo', label: 'Rutina' },
                            { id: 'Bajo', icon: BatteryWarning, color: 'rose', label: 'Sobrecarga' }
                        ].map((m) => (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => { setEstadoAnimo(m.id as any); if (onMoodChange) onMoodChange(m.id as any); }}
                                title={m.label}
                                className={`p-1.5 rounded-lg transition-all ${estadoAnimo === m.id ? `bg-${m.color}-100 text-${m.color}-600 ring-1 ring-${m.color}-200` : 'text-slate-300 hover:text-slate-500 hover:bg-slate-50'}`}
                            >
                                <m.icon size={18} className={estadoAnimo === m.id ? 'fill-current' : ''} />
                            </button>
                        ))}
                    </div>

                    {/* Blockers (Middle/Right) */}
                    <div className="flex-1 flex items-center gap-2 overflow-hidden">
                        {bloqueos.length > 0 ? (
                            <div onClick={() => setViewBlockers(true)} className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg w-full cursor-pointer hover:bg-red-100 transition-colors">
                                <span className="font-bold whitespace-nowrap">🚫 BLOQUEOS ({bloqueos.length}):</span>
                                <div className="overflow-hidden relative flex-1">
                                    <div className="whitespace-nowrap animate-marquee flex gap-4">
                                        {bloqueos.map((b, i) => (
                                            <span key={i} className="flex items-center gap-1">
                                                <span className="font-bold">{b.destinoUsuario?.nombre}</span>
                                                <span className="opacity-70">({b.motivo})</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-xs text-emerald-600 flex items-center gap-1 px-3 opacity-60">
                                <CheckCircle2 size={14} /> <span>Sin bloqueos activos.</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Submit (Desktop) */}
                <div className="hidden md:block">
                    <button
                        type="button"
                        onClick={(e) => handleSubmit(e as any)}
                        disabled={submitting}
                        className="bg-slate-900 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-slate-900/10 active:scale-[0.95] hover:bg-slate-800 transition-all disabled:opacity-70 flex items-center gap-2 text-sm whitespace-nowrap h-full"
                    >
                        {submitting ? '...' : '🚀 Activar Plan'}
                    </button>
                </div>
            </div>

            {/* MAIN GRID: THE 1-3-5 PLAN */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 items-start">

                {/* COL 1: OBJETIVO PRINCIPAL (Merged with Foco) */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-3 min-h-[12rem]">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
                        <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-[10px] ring-4 ring-rose-50">1</div>
                        <h4 className="font-bold text-slate-800 text-sm">Objetivo Principal</h4>
                    </div>
                    <div className="space-y-2 flex-1">
                        {entregoIds.map((id, idx) => renderCard('Entrego', id, idx))}
                        <p className="text-[10px] text-slate-400 leading-tight px-1 italic mt-2">
                            Define lo único que DEBE salir hoy.
                        </p>
                        {errors.entrego && <p className="text-rose-500 text-[10px] font-bold px-1 animate-pulse">⚠️ Este campo es obligatorio</p>}
                    </div>
                    <button type="button" onClick={() => { addSlot('Entrego'); setErrors({}); }} className="text-xs font-bold text-rose-500 hover:text-rose-700 flex justify-center py-1 opacity-60 hover:opacity-100 transition-opacity">
                        + Espacio
                    </button>
                </div>

                {/* COL 2: AVANCE */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-3 min-h-[12rem]">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
                        <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-[10px] ring-4 ring-blue-50">3</div>
                        <h4 className="font-bold text-slate-800 text-sm">Para Avanzar</h4>
                    </div>
                    <div className="space-y-2 flex-1">
                        {avanzoIds.map((id, idx) => renderCard('Avanzo', id, idx))}
                    </div>
                    <button type="button" onClick={() => addSlot('Avanzo')} className="text-xs font-bold text-blue-500 hover:text-blue-700 flex justify-center py-1 opacity-60 hover:opacity-100 transition-opacity">
                        + Espacio
                    </button>
                </div>

                {/* COL 3: EXTRAS */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-3 min-h-[12rem]">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-[10px] ring-4 ring-emerald-50">5</div>
                        <h4 className="font-bold text-slate-800 text-sm">Victorias Rápidas</h4>
                    </div>
                    <div className="space-y-2 flex-1">
                        {extraIds.map((id, idx) => renderCard('Extra', id, idx))}
                    </div>
                    <button type="button" onClick={() => addSlot('Extra')} className="text-xs font-bold text-emerald-500 hover:text-emerald-700 flex justify-center py-1 opacity-60 hover:opacity-100 transition-opacity">
                        + Espacio
                    </button>
                </div>
            </div>

            {/* BLOCKERS MODAL */}
            {viewBlockers && bloqueos.length > 0 && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setViewBlockers(false)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-rose-600 mb-4 flex items-center gap-2">🚫 Bloqueos Activos</h3>
                        <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
                            {bloqueos.map((b, i) => (
                                <div key={i} className="bg-rose-50 p-3 rounded-lg border border-rose-100">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold text-rose-800 text-sm">{b.destinoUsuario?.nombre || 'Desconocido'}</span>
                                        <span className="text-[10px] bg-white px-2 py-0.5 rounded text-rose-400 border border-rose-100 font-bold">BLOQUEA</span>
                                    </div>
                                    <p className="text-sm text-slate-700 mb-2 font-medium">"{b.motivo}"</p>
                                    {b.accionMitigacion && (
                                        <div className="text-xs text-slate-500 bg-white p-2 rounded border border-rose-100 italic">
                                            👉 Mientras espero: {b.accionMitigacion}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={() => setViewBlockers(false)} className="w-full mt-4 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors">
                            Cerrar
                        </button>
                    </div>
                </div>
            )}

            {/* MOBILE SUBMIT (Sticky Bottom) */}
            <div className="md:hidden sticky bottom-4 z-40">
                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl shadow-xl shadow-slate-900/20 active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                >
                    {submitting ? 'Guardando...' : '🚀 Activar Plan'}
                </button>
            </div>
        </form>
    );
};
