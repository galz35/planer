import React, { useState, useEffect, useCallback } from 'react';
import { clarityService } from '../../../services/clarity.service';
import { useAuth } from '../../../context/AuthContext';
import { ChevronLeft, ChevronRight, Check, X, Save, Loader2, AlertCircle } from 'lucide-react';
import type { Tarea } from '../../../types/modelos';

interface Props {
    userId?: number;
    onTaskClick?: (task: Tarea) => void;
    onTaskComplete?: (taskId: number) => void;
    onTaskCancel?: (taskId: number) => void;
}

interface DayData {
    date: string;
    dayName: string;
    dayNumber: number;
    monthName: string;
    isToday: boolean;
    isPast: boolean;
    tasks: Tarea[];
}

const ESTADOS = ['Pendiente', 'EnCurso', 'Pausa', 'Bloqueada', 'Revision', 'Hecha', 'Descartada'];
const PRIORIDADES = ['Alta', 'Media', 'Baja'];
const TIPOS = ['Estrategico', 'Impacto', 'Operativo'];
const ALCANCES = ['Local', 'Regional', 'AMX'];
const ESFUERZOS = ['S', 'M', 'L'];

export const AgendaSemanal: React.FC<Props> = ({ onTaskComplete, onTaskCancel }) => {
    const [weekOffset, setWeekOffset] = useState(0);
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [weekData, setWeekData] = useState<DayData[]>([]);
    const [selectedTask, setSelectedTask] = useState<Tarea | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<Partial<Tarea>>({});
    const [saving, setSaving] = useState(false);

    const getDayName = (date: Date): string => ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][date.getDay()];
    const getMonthName = (date: Date): string => ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][date.getMonth()];

    const loadWeekData = useCallback(async () => {
        setLoading(true);
        try {
            let tasks: Tarea[] = [];
            if (user?.carnet) {
                const res = await clarityService.getTareasHistorico(user.carnet, 30);
                tasks = res || [];
            } else {
                const res = await clarityService.getMisTareas({});
                tasks = res || [];
            }
            console.log('[AgendaSemanal] Tasks received:', tasks?.length, tasks);

            // 1. Establish "Today" logic
            const toDateStr = (d: Date) => d.toISOString().split('T')[0];
            let today = new Date();
            let todayStr = toDateStr(today);
            console.log('[AgendaSemanal] Anchor initial:', todayStr);

            if (tasks && tasks.length > 0) {
                // Find max date in tasks (not just year)
                const dates = tasks.map(t => t.fechaObjetivo || t.fechaHecha).filter(d => d).map(d => new Date(d as string));
                if (dates.length > 0) {
                    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
                    // If max task date is in the future relative to today, shift anchor to it
                    if (maxDate > today) {
                        console.log('[AgendaSemanal] Shifting anchor to max task date:', maxDate.toISOString());
                        todayStr = toDateStr(maxDate);
                        today = new Date(todayStr + 'T12:00:00Z');
                    }
                }
            }

            // 2. Calculate Week Grid
            // Monday of the current week (relative to today)
            const currentDay = today.getDay(); // 0 (Sun) to 6 (Sat)
            const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1); // Adjust to get Monday
            const monday = new Date(today);
            monday.setDate(diff);

            const days: DayData[] = [];

            for (let i = 0; i < 7; i++) {
                const d = new Date(monday);
                d.setDate(d.getDate() + i + (weekOffset * 7));

                const dStr = d.toISOString().split('T')[0];
                const isToday = dStr === todayStr;
                const isPast = dStr < todayStr && !isToday;

                days.push({
                    date: dStr,
                    dayName: getDayName(d),
                    dayNumber: d.getDate(),
                    monthName: getMonthName(d),
                    isToday: isToday,
                    isPast: isPast,
                    tasks: []
                });
            }

            // 3. Map Tasks
            if (tasks) {
                tasks.forEach((t: Tarea & { fechaTrabajada?: string }) => {
                    // Prioridad: fechaTrabajada (del check-in) > fechaHecha > fechaObjetivo > fechaCreacion
                    const taskDate = (t as any).fechaTrabajada || t.fechaHecha || t.fechaObjetivo || t.fechaCreacion;
                    if (taskDate) {
                        const dateStr = typeof taskDate === 'string' ? taskDate.substring(0, 10) : (taskDate as any).toISOString().split('T')[0];

                        const idx = days.findIndex(d => d.date === dateStr);
                        if (idx >= 0) days[idx].tasks.push(t);
                    }
                });
            }
            setWeekData(days);
        } catch (e) {
            console.error('Error:', e);
        } finally {
            setLoading(false);
        }
    }, [weekOffset, user]);

    useEffect(() => { loadWeekData(); }, [loadWeekData]);

    const selectTask = (task: Tarea) => {
        setSelectedTask(task);
        setEditForm({
            titulo: task.titulo,
            descripcion: task.descripcion || '',
            estado: task.estado,
            prioridad: task.prioridad,
            esfuerzo: task.esfuerzo,
            tipo: task.tipo || 'Operativo',
            alcance: task.alcance || 'Local',
            progreso: task.progreso || 0,
            comentario: task.comentario || '',
            motivoBloqueo: task.motivoBloqueo || ''
        });
        setIsEditing(false);
    };

    const handleComplete = async (taskId: number) => {
        setSaving(true);
        try {
            await onTaskComplete?.(taskId);
            await loadWeekData();
            setSelectedTask(null);
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = async (taskId: number) => {
        setSaving(true);
        try {
            await onTaskCancel?.(taskId);
            await loadWeekData();
            setSelectedTask(null);
        } finally {
            setSaving(false);
        }
    };

    const handleSave = async () => {
        if (!selectedTask) return;
        setSaving(true);
        try {
            await clarityService.actualizarTarea(selectedTask.idTarea, editForm as any);
            await loadWeekData();
            setIsEditing(false);
            // Re-seleccionar la tarea actualizada
            const updated = weekData.flatMap(d => d.tasks).find(t => t.idTarea === selectedTask.idTarea);
            if (updated) setSelectedTask({ ...selectedTask, ...editForm } as Tarea);
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const getStatusColor = (estado: string) => {
        const colors: Record<string, string> = {
            'Hecha': 'bg-green-500',
            'EnCurso': 'bg-blue-500',
            'Pausa': 'bg-orange-400',
            'Bloqueada': 'bg-red-500',
            'Revision': 'bg-purple-500',
            'Descartada': 'bg-gray-400',
            'Pendiente': 'bg-yellow-500'
        };
        return colors[estado] || 'bg-gray-400';
    };

    const getStatusBg = (estado: string) => {
        const colors: Record<string, string> = {
            'Hecha': 'bg-green-50',
            'EnCurso': 'bg-blue-50',
            'Pausa': 'bg-orange-50',
            'Bloqueada': 'bg-red-50',
            'Revision': 'bg-purple-50',
            'Descartada': 'bg-gray-100',
            'Pendiente': 'bg-yellow-50'
        };
        return colors[estado] || 'bg-gray-50';
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center">
                <Loader2 className="animate-spin mx-auto text-indigo-500 mb-2" size={24} />
                <p className="text-gray-400 text-sm">Cargando calendario...</p>
            </div>
        );
    }

    return (
        <div className="flex gap-4 h-full">
            {/* Calendario */}
            <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all ${selectedTask ? 'flex-1' : 'w-full'}`}>
                {/* Header */}
                <div className="px-4 py-3 bg-indigo-600 text-white flex items-center justify-between">
                    <button onClick={() => setWeekOffset(wo => wo - 1)} className="p-2 hover:bg-indigo-700 rounded-lg"><ChevronLeft size={18} /></button>
                    <div className="text-center">
                        <h3 className="text-sm font-bold">📅 Calendario Semanal</h3>
                        <p className="text-xs text-indigo-200">{weekOffset === 0 ? 'Esta semana' : `Hace ${Math.abs(weekOffset)} sem.`}</p>
                    </div>
                    <button onClick={() => setWeekOffset(wo => Math.min(0, wo + 1))} disabled={weekOffset >= 0} className="p-2 hover:bg-indigo-700 rounded-lg disabled:opacity-30"><ChevronRight size={18} /></button>
                </div>

                {/* Grilla */}
                <div className="grid grid-cols-7 divide-x divide-gray-100 min-h-[400px]">
                    {weekData.map(day => (
                        <div key={day.date} className={`flex flex-col ${day.isToday ? 'bg-indigo-50' : day.isPast ? 'bg-gray-50/50' : 'bg-white'}`}>
                            <div className={`p-2 text-center border-b ${day.isToday ? 'bg-indigo-100 border-indigo-200' : 'bg-gray-50 border-gray-100'}`}>
                                <p className={`text-[10px] font-bold uppercase ${day.isToday ? 'text-indigo-600' : 'text-gray-400'}`}>{day.dayName}</p>
                                <p className={`text-xl font-black ${day.isToday ? 'text-indigo-600' : 'text-gray-700'}`}>{day.dayNumber}</p>
                                <p className="text-[9px] text-gray-400">{day.monthName}</p>
                            </div>
                            <div className="flex-1 p-1.5 space-y-1 overflow-y-auto max-h-[300px]">
                                {day.tasks.length === 0 ? (
                                    <p className="text-[10px] text-gray-300 text-center py-6">—</p>
                                ) : day.tasks.map(task => (
                                    <button
                                        key={task.idTarea}
                                        onClick={() => selectTask(task)}
                                        className={`w-full text-left p-1.5 rounded border-l-3 transition-all ${getStatusBg(task.estado)} ${selectedTask?.idTarea === task.idTarea ? 'ring-2 ring-indigo-500' : 'hover:shadow-md'
                                            } ${task.estado === 'Hecha' || task.estado === 'Descartada' ? 'opacity-50' : ''}`}
                                    >
                                        <div className="flex items-start gap-1.5">
                                            <span className={`w-2 h-2 rounded-full ${getStatusColor(task.estado)} shrink-0 mt-1`}></span>
                                            <span className={`text-[10px] leading-tight ${task.estado === 'Hecha' ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                                {task.titulo.length > 15 ? task.titulo.substring(0, 15) + '...' : task.titulo}
                                            </span>
                                        </div>
                                        {task.progreso > 0 && task.progreso < 100 && (
                                            <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                                                <div className={`h-full ${getStatusColor(task.estado)}`} style={{ width: `${task.progreso}%` }}></div>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Panel de Tarea */}
            {selectedTask && (
                <div className="w-[420px] bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col max-h-[600px]">
                    {/* Header */}
                    <div className={`px-4 py-3 ${getStatusColor(selectedTask.estado)} text-white flex justify-between items-center shrink-0`}>
                        <div>
                            <p className="text-xs font-bold uppercase">{selectedTask.estado}</p>
                            <p className="text-[10px] opacity-80">{selectedTask.fechaObjetivo} • {selectedTask.progreso}%</p>
                        </div>
                        <button onClick={() => setSelectedTask(null)} className="p-1 hover:bg-white/20 rounded"><X size={18} /></button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {isEditing ? (
                            <div className="space-y-3">
                                {/* Título */}
                                <div>
                                    <label className="text-[10px] text-gray-400 uppercase font-bold">Título</label>
                                    <input type="text" value={editForm.titulo || ''} onChange={(e) => setEditForm({ ...editForm, titulo: e.target.value })}
                                        className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 outline-none" />
                                </div>

                                {/* Descripción */}
                                <div>
                                    <label className="text-[10px] text-gray-400 uppercase font-bold">Descripción</label>
                                    <textarea value={editForm.descripcion || ''} onChange={(e) => setEditForm({ ...editForm, descripcion: e.target.value })}
                                        rows={3} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 outline-none resize-none" />
                                </div>

                                {/* Estado y Prioridad */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] text-gray-400 uppercase font-bold">Estado</label>
                                        <select value={editForm.estado} onChange={(e) => setEditForm({ ...editForm, estado: e.target.value as any })}
                                            className="w-full mt-1 px-2 py-2 border border-gray-200 rounded-lg text-sm outline-none">
                                            {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-400 uppercase font-bold">Prioridad</label>
                                        <select value={editForm.prioridad} onChange={(e) => setEditForm({ ...editForm, prioridad: e.target.value as any })}
                                            className="w-full mt-1 px-2 py-2 border border-gray-200 rounded-lg text-sm outline-none">
                                            {PRIORIDADES.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Tipo, Alcance, Esfuerzo */}
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="text-[10px] text-gray-400 uppercase font-bold">Tipo</label>
                                        <select value={editForm.tipo || 'Operativo'} onChange={(e) => setEditForm({ ...editForm, tipo: e.target.value as any })}
                                            className="w-full mt-1 px-2 py-2 border border-gray-200 rounded-lg text-sm outline-none">
                                            {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-400 uppercase font-bold">Alcance</label>
                                        <select value={editForm.alcance || 'Local'} onChange={(e) => setEditForm({ ...editForm, alcance: e.target.value as any })}
                                            className="w-full mt-1 px-2 py-2 border border-gray-200 rounded-lg text-sm outline-none">
                                            {ALCANCES.map(a => <option key={a} value={a}>{a}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-400 uppercase font-bold">Esfuerzo</label>
                                        <select value={editForm.esfuerzo} onChange={(e) => setEditForm({ ...editForm, esfuerzo: e.target.value as any })}
                                            className="w-full mt-1 px-2 py-2 border border-gray-200 rounded-lg text-sm outline-none">
                                            {ESFUERZOS.map(e => <option key={e} value={e}>{e}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Progreso */}
                                <div>
                                    <label className="text-[10px] text-gray-400 uppercase font-bold">Avance: {editForm.progreso || 0}%</label>
                                    <input type="range" min="0" max="100" step="5" value={editForm.progreso || 0}
                                        onChange={(e) => setEditForm({ ...editForm, progreso: Number(e.target.value) })}
                                        className="w-full mt-1" />
                                </div>

                                {/* Comentario */}
                                <div>
                                    <label className="text-[10px] text-gray-400 uppercase font-bold">Comentario / Notas</label>
                                    <textarea value={editForm.comentario || ''} onChange={(e) => setEditForm({ ...editForm, comentario: e.target.value })}
                                        rows={2} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none resize-none" placeholder="Notas adicionales..." />
                                </div>

                                {/* Motivo Bloqueo */}
                                {editForm.estado === 'Bloqueada' && (
                                    <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                                        <label className="text-[10px] text-red-600 uppercase font-bold flex items-center gap-1">
                                            <AlertCircle size={12} /> Motivo del Bloqueo
                                        </label>
                                        <textarea value={editForm.motivoBloqueo || ''} onChange={(e) => setEditForm({ ...editForm, motivoBloqueo: e.target.value })}
                                            rows={2} className="w-full mt-1 px-3 py-2 border border-red-200 rounded-lg text-sm outline-none resize-none bg-white" placeholder="¿Por qué está bloqueada?" />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-gray-800">{selectedTask.titulo}</h3>

                                {selectedTask.descripcion ? (
                                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedTask.descripcion}</p>
                                ) : (
                                    <p className="text-sm text-gray-400 italic">Sin descripción</p>
                                )}

                                {/* Progreso */}
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-gray-400">Progreso</span>
                                        <span className="font-bold text-gray-700">{selectedTask.progreso}%</span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div className={`h-full ${getStatusColor(selectedTask.estado)} transition-all`} style={{ width: `${selectedTask.progreso}%` }}></div>
                                    </div>
                                </div>

                                {/* Info Grid */}
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div className="bg-gray-50 p-2 rounded-lg text-center">
                                        <p className="text-gray-400 mb-0.5">Prioridad</p>
                                        <p className={`font-bold ${selectedTask.prioridad === 'Alta' ? 'text-red-500' : selectedTask.prioridad === 'Media' ? 'text-yellow-600' : 'text-gray-500'}`}>
                                            {selectedTask.prioridad}
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 p-2 rounded-lg text-center">
                                        <p className="text-gray-400 mb-0.5">Tipo</p>
                                        <p className="font-bold text-gray-700">{selectedTask.tipo || '—'}</p>
                                    </div>
                                    <div className="bg-gray-50 p-2 rounded-lg text-center">
                                        <p className="text-gray-400 mb-0.5">Alcance</p>
                                        <p className="font-bold text-gray-700">{selectedTask.alcance || '—'}</p>
                                    </div>
                                </div>

                                {/* Bloqueo */}
                                {selectedTask.estado === 'Bloqueada' && selectedTask.motivoBloqueo && (
                                    <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                                        <p className="text-[10px] text-red-600 uppercase font-bold flex items-center gap-1 mb-1">
                                            <AlertCircle size={12} /> Bloqueada
                                        </p>
                                        <p className="text-sm text-red-700">{selectedTask.motivoBloqueo}</p>
                                    </div>
                                )}

                                {/* Comentario */}
                                {selectedTask.comentario && (
                                    <div className="bg-blue-50 p-3 rounded-lg">
                                        <p className="text-[10px] text-blue-600 uppercase font-bold mb-1">Notas</p>
                                        <p className="text-sm text-blue-700">{selectedTask.comentario}</p>
                                    </div>
                                )}

                                {selectedTask.proyecto && (
                                    <div className="bg-indigo-50 p-3 rounded-lg text-xs">
                                        <p className="text-indigo-400 mb-0.5">Proyecto</p>
                                        <p className="font-bold text-indigo-700">{selectedTask.proyecto.nombre}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="p-4 border-t border-gray-100 space-y-2 shrink-0">
                        {isEditing ? (
                            <div className="flex gap-2">
                                <button onClick={() => setIsEditing(false)} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold text-sm hover:bg-gray-200">Cancelar</button>
                                <button onClick={handleSave} disabled={saving} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 flex items-center justify-center gap-2">
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Guardar
                                </button>
                            </div>
                        ) : selectedTask.estado !== 'Hecha' && selectedTask.estado !== 'Descartada' ? (
                            <>
                                <button onClick={() => handleComplete(selectedTask.idTarea)} disabled={saving} className="w-full py-2.5 bg-green-500 text-white rounded-lg font-bold text-sm hover:bg-green-600 flex items-center justify-center gap-2">
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Completar
                                </button>
                                <div className="flex gap-2">
                                    <button onClick={() => setIsEditing(true)} className="flex-1 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-bold text-sm hover:bg-indigo-200">Editar</button>
                                    <button onClick={() => handleCancel(selectedTask.idTarea)} disabled={saving} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold text-sm hover:bg-gray-200 flex items-center justify-center gap-2">
                                        <X size={14} /> Descartar
                                    </button>
                                </div>
                            </>
                        ) : (
                            <p className="text-center text-sm text-gray-400 py-2">Tarea {selectedTask.estado === 'Hecha' ? 'completada ✓' : 'descartada'}</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
