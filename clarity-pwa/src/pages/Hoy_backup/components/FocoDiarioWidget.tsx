import React, { useState, useEffect } from 'react';
import { clarityService, type FocoItem } from '../../../services/clarity.service';
import { Plus, X, CheckCircle2, Circle, Star, Clock, Loader2, Search, AlertTriangle, ChevronDown, ChevronUp, Calendar, Inbox } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import type { Tarea, Bloqueo } from '../../../types/modelos';

interface Props {
    fecha: string;
    disponibles: Tarea[];
    bloqueos?: Bloqueo[];
    arrastrados?: Tarea[];
    backlog?: Tarea[];
    onUpdate?: () => void;
}

export const FocoDiarioWidget: React.FC<Props> = ({ fecha, disponibles, bloqueos = [], arrastrados = [], backlog = [], onUpdate }) => {
    const { showToast } = useToast();
    const [focos, setFocos] = useState<FocoItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showSelector, setShowSelector] = useState(false);
    const [showAyer, setShowAyer] = useState(false);
    const [showBacklog, setShowBacklog] = useState(false);
    const [savingId, setSavingId] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const loadFocos = async () => {
        try {
            const data = await clarityService.getFocoDelDia(fecha);
            setFocos(data || []);
        } catch (err) {
            console.log('Backend no disponible');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadFocos(); }, [fecha]);

    const handleAddToFoco = async (tarea: Tarea, esEstrategico: boolean = false) => {
        try {
            await clarityService.agregarAlFoco({ idTarea: tarea.idTarea, fecha, esEstrategico });
            // Also update status to 'EnCurso' if it's pending, to align with "Mover a Agenda" behavior
            if (tarea.estado === 'Pendiente') {
                await clarityService.actualizarTarea(tarea.idTarea, { estado: 'EnCurso' });
            }
            loadFocos();
            setShowSelector(false);
            setSearchTerm('');
            onUpdate?.();
        } catch (err) {
            showToast('Error al agregar', 'error');
        }
    };

    const handleToggleComplete = async (foco: FocoItem) => {
        setSavingId(foco.idFoco);
        try {
            await clarityService.actualizarFoco(foco.idFoco, fecha, { completado: !foco.completado });
            loadFocos();
            onUpdate?.();
        } catch { }
        finally { setSavingId(null); }
    };

    const handleToggleStrategic = async (foco: FocoItem) => {
        try {
            await clarityService.actualizarFoco(foco.idFoco, fecha, { esEstrategico: !foco.esEstrategico });
            loadFocos();
        } catch { }
    };

    const handleRemove = async (foco: FocoItem) => {
        try { await clarityService.quitarDelFoco(foco.idFoco); loadFocos(); } catch { }
    };

    // Filtros
    const tareasDisponibles = disponibles.filter(
        t => !focos.some(f => f.idTarea === t.idTarea) && !['Hecha', 'Descartada'].includes(t.estado)
    ).filter(t => !searchTerm || t.titulo.toLowerCase().includes(searchTerm.toLowerCase()));

    const arrastradosPendientes = arrastrados.filter(t => !focos.some(f => f.idTarea === t.idTarea) && t.estado !== 'Hecha');
    const arrastradosCompletados = arrastrados.filter(t => t.estado === 'Hecha');

    // Filter backlog to exclude what's already in focus or done
    const backlogPendientes = backlog.filter(t => !focos.some(f => f.idTarea === t.idTarea) && !['Hecha', 'Descartada'].includes(t.estado));

    const completados = focos.filter(f => f.completado).length;
    const pendientes = focos.filter(f => !f.completado);
    const completadosList = focos.filter(f => f.completado);
    const bloqueosActivos = bloqueos.filter(b => b.estado === 'Activo');
    const tareasConBloqueo = new Set(bloqueosActivos.map(b => b.idTarea));

    const getPrioColor = (prio: string) => {
        if (prio === 'Alta') return 'bg-red-500';
        if (prio === 'Media') return 'bg-amber-500';
        return 'bg-slate-400';
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 animate-pulse">
                <div className="flex items-center gap-2 text-slate-400">
                    <Loader2 className="animate-spin" size={18} />
                    <span className="text-sm">Cargando agenda...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* === SECCIÓN AYER === */}
            {(arrastradosPendientes.length > 0 || arrastradosCompletados.length > 0) && (
                <div className="border-b border-slate-100">
                    <button
                        onClick={() => setShowAyer(!showAyer)}
                        className="w-full px-4 py-2 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-slate-500" />
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Ayer</span>
                            <span className="text-[10px] text-slate-400">
                                {arrastradosCompletados.length} hechas · {arrastradosPendientes.length} pendientes
                            </span>
                        </div>
                        {showAyer ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                    </button>

                    {showAyer && (
                        <div className="p-3 space-y-2 bg-slate-50/50">
                            {/* Completadas ayer */}
                            {arrastradosCompletados.length > 0 && (
                                <div>
                                    <p className="text-[10px] text-emerald-600 font-bold mb-1 flex items-center gap-1">
                                        <CheckCircle2 size={10} /> COMPLETADAS
                                    </p>
                                    <div className="space-y-1">
                                        {arrastradosCompletados.slice(0, 3).map(t => (
                                            <div key={t.idTarea} className="flex items-center gap-2 px-2 py-1 bg-emerald-50 rounded border border-emerald-100">
                                                <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                                                <span className="text-xs text-emerald-700 line-through truncate">{t.titulo}</span>
                                            </div>
                                        ))}
                                        {arrastradosCompletados.length > 3 && (
                                            <p className="text-[10px] text-emerald-500 pl-2">+{arrastradosCompletados.length - 3} más</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Pendientes de ayer (no terminadas) */}
                            {arrastradosPendientes.length > 0 && (
                                <div>
                                    <p className="text-[10px] text-amber-600 font-bold mb-1 flex items-center gap-1">
                                        <Clock size={10} /> NO TERMINADAS
                                    </p>
                                    <div className="space-y-1">
                                        {arrastradosPendientes.map(t => (
                                            <div key={t.idTarea} className="flex items-center justify-between gap-2 px-2 py-1.5 bg-amber-50 rounded border border-amber-200 group hover:border-amber-400 transition-colors">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className={`w-2 h-2 rounded-full ${getPrioColor(t.prioridad)} shrink-0`}></span>
                                                    <span className="text-xs text-slate-700 truncate">{t.titulo}</span>
                                                </div>
                                                <button
                                                    onClick={() => handleAddToFoco(t)}
                                                    className="shrink-0 text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded font-bold hover:bg-amber-600 transition-colors opacity-80 group-hover:opacity-100"
                                                >
                                                    + Hoy
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* === SECCIÓN BACKLOG (NUEVO) === */}
            {backlogPendientes.length > 0 && (
                <div className="border-b border-slate-100">
                    <button
                        onClick={() => setShowBacklog(!showBacklog)}
                        className="w-full px-4 py-2 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <Inbox size={14} className="text-indigo-500" />
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Backlog</span>
                            <span className="text-[10px] text-slate-400">
                                {backlogPendientes.length} pendientes
                            </span>
                        </div>
                        {showBacklog ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                    </button>

                    {showBacklog && (
                        <div className="p-3 space-y-1 bg-slate-50/50">
                            {backlogPendientes.map(t => (
                                <div key={t.idTarea} className="flex items-center justify-between gap-2 px-2 py-1.5 bg-white rounded border border-slate-200 group hover:border-indigo-200 transition-colors">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className={`w-2 h-2 rounded-full ${getPrioColor(t.prioridad)} shrink-0`}></span>
                                        <span className="text-xs text-slate-700 truncate">{t.titulo}</span>
                                        {t.proyecto && <span className="text-[10px] text-slate-400 bg-slate-100 px-1 rounded">{t.proyecto.nombre}</span>}
                                    </div>
                                    <button
                                        onClick={() => handleAddToFoco(t)}
                                        className="shrink-0 text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-bold hover:bg-indigo-100 transition-colors"
                                    >
                                        Agendar hoy
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* === SECCIÓN HOY === */}
            <div className="px-4 py-3 flex justify-between items-center border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <Star className="text-indigo-600" size={16} />
                    </div>
                    <div>
                        <span className="text-sm font-bold text-slate-800">Mi Agenda de Hoy</span>
                        {focos.length > 0 && (
                            <p className="text-[10px] text-slate-400">{completados}/{focos.length} completadas</p>
                        )}
                    </div>
                </div>
                <button
                    onClick={() => setShowSelector(!showSelector)}
                    className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors"
                >
                    {showSelector ? <X size={16} /> : <Plus size={16} />}
                </button>
            </div>

            {/* Barra de progreso */}
            {focos.length > 0 && (
                <div className="px-4 py-2 bg-slate-50">
                    <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
                                style={{ width: `${(completados / focos.length) * 100}%` }}
                            />
                        </div>
                        <span className="text-xs font-bold text-slate-600">{Math.round((completados / focos.length) * 100)}%</span>
                    </div>
                </div>
            )}

            {/* Selector de tareas */}
            {showSelector && (
                <div className="p-3 border-b border-slate-100 bg-indigo-50/50">
                    <div className="relative mb-2">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                            type="text"
                            placeholder="Buscar tarea..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                            autoFocus
                        />
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                        {tareasDisponibles.length === 0 ? (
                            <p className="text-slate-400 text-xs text-center py-3">No hay tareas disponibles</p>
                        ) : (
                            tareasDisponibles.slice(0, 8).map(t => (
                                <div key={t.idTarea} className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-slate-100 hover:border-indigo-200 transition-colors">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className={`w-2 h-2 rounded-full ${getPrioColor(t.prioridad)} shrink-0`}></span>
                                        <span className="text-xs text-slate-700 truncate">{t.titulo}</span>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                        <button onClick={() => handleAddToFoco(t, true)} className="px-2 py-1 bg-purple-100 text-purple-600 rounded text-[10px] font-bold hover:bg-purple-200" title="Agregar como estratégico">★</button>
                                        <button onClick={() => handleAddToFoco(t, false)} className="px-2 py-1 bg-indigo-100 text-indigo-600 rounded text-[10px] font-bold hover:bg-indigo-200" title="Agregar">+</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Lista de tareas de hoy */}
            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {focos.length === 0 && !showSelector && (
                    <button onClick={() => setShowSelector(true)} className="w-full p-6 text-center text-slate-400 hover:bg-slate-50 transition-colors">
                        <Plus size={24} className="mx-auto mb-2 opacity-50" />
                        <span className="text-sm">Agregar primera tarea del día</span>
                    </button>
                )}

                {/* Tareas pendientes */}
                {pendientes.map(foco => {
                    const estaBloqueada = tareasConBloqueo.has(foco.idTarea);
                    const bloqueo = bloqueosActivos.find(b => b.idTarea === foco.idTarea);

                    return (
                        <div
                            key={foco.idFoco}
                            className={`px-4 py-3 flex items-start gap-3 group hover:bg-slate-50 transition-colors ${estaBloqueada ? 'bg-red-50 border-l-4 border-red-400' :
                                foco.esEstrategico ? 'bg-purple-50/50 border-l-4 border-purple-400' :
                                    foco.diasArrastre > 1 ? 'bg-amber-50/50 border-l-4 border-amber-400' : ''
                                }`}
                        >
                            <button
                                onClick={() => handleToggleComplete(foco)}
                                disabled={savingId === foco.idFoco}
                                className="shrink-0 mt-0.5"
                            >
                                {savingId === foco.idFoco ? (
                                    <Loader2 className="text-indigo-400 animate-spin" size={20} />
                                ) : estaBloqueada ? (
                                    <AlertTriangle className="text-red-400" size={20} />
                                ) : (
                                    <Circle className="text-slate-300 hover:text-indigo-500 transition-colors" size={20} />
                                )}
                            </button>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    {foco.esEstrategico && <Star className="text-purple-500 shrink-0" size={12} />}
                                    <p className={`text-sm font-medium truncate ${estaBloqueada ? 'text-red-700' : 'text-slate-800'}`}>
                                        {foco.tarea.titulo}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                    {foco.diasArrastre > 1 && (
                                        <span className="text-[10px] text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded font-medium">
                                            Día {foco.diasArrastre}
                                        </span>
                                    )}
                                    {estaBloqueada && bloqueo && (
                                        <span className="text-[10px] text-red-600 bg-red-100 px-1.5 py-0.5 rounded font-medium truncate max-w-[150px]" title={bloqueo.motivo}>
                                            ⚠ {bloqueo.destinoTexto || 'Bloqueada'}
                                        </span>
                                    )}
                                    {foco.tarea.proyecto && (
                                        <span className="text-[10px] text-slate-400">{foco.tarea.proyecto.nombre}</span>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <button onClick={() => handleToggleStrategic(foco)} className={`p-1 rounded ${foco.esEstrategico ? 'text-purple-500' : 'text-slate-300 hover:text-purple-400'}`}>
                                    <Star size={14} />
                                </button>
                                <button onClick={() => handleRemove(foco)} className="p-1 text-slate-300 hover:text-red-400">
                                    <X size={14} />
                                </button>
                            </div>
                        </div>
                    );
                })}

                {/* Tareas completadas hoy */}
                {completadosList.length > 0 && (
                    <>
                        <div className="px-4 py-2 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-wide flex items-center gap-1">
                            <CheckCircle2 size={12} /> Completadas hoy ({completadosList.length})
                        </div>
                        {completadosList.slice(0, 4).map(foco => (
                            <div key={foco.idFoco} className="px-4 py-2 flex items-center gap-3 opacity-60 hover:opacity-80 transition-opacity">
                                <button onClick={() => handleToggleComplete(foco)} disabled={savingId === foco.idFoco}>
                                    {savingId === foco.idFoco ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 className="text-emerald-500" size={18} />}
                                </button>
                                <p className="text-sm text-emerald-700 line-through truncate">{foco.tarea.titulo}</p>
                                {foco.diasArrastre > 1 && (
                                    <span className="text-[9px] text-emerald-500 shrink-0">tras {foco.diasArrastre}d</span>
                                )}
                            </div>
                        ))}
                        {completadosList.length > 4 && (
                            <div className="px-4 py-1 text-[10px] text-emerald-500">+{completadosList.length - 4} más</div>
                        )}
                    </>
                )}
            </div>

            {/* Resumen inferior */}
            {bloqueosActivos.length > 0 && (
                <div className="px-4 py-2 bg-red-50 border-t border-red-100 flex items-center gap-2 text-xs text-red-600">
                    <AlertTriangle size={14} />
                    <span className="font-medium">{bloqueosActivos.length} tarea{bloqueosActivos.length > 1 ? 's' : ''} bloqueada{bloqueosActivos.length > 1 ? 's' : ''}</span>
                </div>
            )}
        </div>
    );
};
