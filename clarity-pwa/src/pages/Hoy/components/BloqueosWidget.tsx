import React, { useState, useEffect } from 'react';
import { clarityService } from '../../../services/clarity.service';
import { AlertTriangle, CheckCircle2, Clock, User, MessageSquare, Loader2, X, Send } from 'lucide-react';
import type { Tarea, Bloqueo } from '../../../types/modelos';

interface Props {
    userId: number;
    onUpdate?: () => void;
}

export const BloqueosWidget: React.FC<Props> = ({ userId, onUpdate }) => {
    const [loading, setLoading] = useState(true);
    const [bloqueos, setBloqueos] = useState<Bloqueo[]>([]);
    const [tareasBloqueadas, setTareasBloqueadas] = useState<Tarea[]>([]);
    const [selectedBloqueo, setSelectedBloqueo] = useState<Bloqueo | null>(null);
    const [resolucion, setResolucion] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, [userId]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Cargar bloqueos del día
            const today = new Date().toISOString().split('T')[0];
            const miDiaData = await clarityService.getMiDia(today);
            setBloqueos(miDiaData?.bloqueosActivos || []);

            // Cargar tareas bloqueadas
            const tasks = await clarityService.getMisTareas({});
            const bloqueadas = tasks?.filter((t: Tarea) => t.estado === 'Bloqueada') || [];
            setTareasBloqueadas(bloqueadas);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleResolver = async (bloqueoId: number) => {
        if (!resolucion.trim()) return;
        setSaving(true);
        try {
            // Solo actualizamos el estado local por ahora
            // TODO: Implementar API de resolverBloqueo
            console.log('Resolver bloqueo:', bloqueoId, resolucion);
            setSelectedBloqueo(null);
            setResolucion('');
            await loadData();
            onUpdate?.();
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const handleDesbloquear = async (taskId: number) => {
        setSaving(true);
        try {
            await clarityService.actualizarTarea(taskId, { estado: 'EnCurso' } as any);
            await loadData();
            onUpdate?.();
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const getDaysAgo = (dateStr?: string) => {
        if (!dateStr) return 0;
        const date = new Date(dateStr);
        const now = new Date();
        return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center">
                <Loader2 className="animate-spin mx-auto text-red-500 mb-2" size={24} />
                <p className="text-gray-400 text-sm">Cargando bloqueos...</p>
            </div>
        );
    }

    const bloqueosActivos = bloqueos.filter(b => b.estado === 'Activo');
    const bloqueosResueltos = bloqueos.filter(b => b.estado === 'Resuelto').slice(0, 5);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-orange-500 text-white p-4 rounded-xl">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <AlertTriangle size={20} /> Centro de Bloqueos
                        </h2>
                        <p className="text-sm text-red-200">Gestiona impedimentos</p>
                    </div>
                    <div className="text-right">
                        <p className="text-3xl font-black">{bloqueosActivos.length + tareasBloqueadas.length}</p>
                        <p className="text-sm text-red-200">activos</p>
                    </div>
                </div>
            </div>

            {/* Sin bloqueos */}
            {bloqueosActivos.length === 0 && tareasBloqueadas.length === 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
                    <CheckCircle2 size={48} className="mx-auto text-green-500 mb-3" />
                    <h3 className="text-lg font-bold text-green-700">¡Sin Bloqueos!</h3>
                    <p className="text-sm text-green-600">Todas tus tareas están desbloqueadas</p>
                </div>
            )}

            {/* Tareas Bloqueadas */}
            {tareasBloqueadas.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 bg-red-50 border-b border-red-100">
                        <h3 className="text-sm font-bold text-red-700 flex items-center gap-2">
                            <AlertTriangle size={14} /> Tareas con Estado Bloqueado ({tareasBloqueadas.length})
                        </h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {tareasBloqueadas.map(task => (
                            <div key={task.idTarea} className="p-4 hover:bg-gray-50">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-800">{task.titulo}</h4>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                            <span className="flex items-center gap-1">
                                                <Clock size={12} /> {getDaysAgo(task.fechaObjetivo || undefined)} días
                                            </span>
                                            {task.proyecto && (
                                                <span>📁 {task.proyecto.nombre}</span>
                                            )}
                                        </div>
                                        {task.motivoBloqueo && (
                                            <p className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                                                {task.motivoBloqueo}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleDesbloquear(task.idTarea)}
                                        disabled={saving}
                                        className="shrink-0 px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-bold hover:bg-green-600 disabled:opacity-50"
                                    >
                                        Desbloquear
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Bloqueos Formales */}
            {bloqueosActivos.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
                        <h3 className="text-sm font-bold text-amber-700 flex items-center gap-2">
                            <MessageSquare size={14} /> Bloqueos Reportados ({bloqueosActivos.length})
                        </h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {bloqueosActivos.map(bloqueo => (
                            <div key={bloqueo.idBloqueo} className="p-4 hover:bg-gray-50">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-800">{bloqueo.tarea?.titulo || 'Tarea'}</h4>
                                        <p className="text-sm text-gray-600 mt-1">{bloqueo.motivo}</p>
                                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                                            {bloqueo.idDestinoUsuario && (
                                                <span className="flex items-center gap-1">
                                                    <User size={12} /> Responsable: #{bloqueo.idDestinoUsuario}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <Clock size={12} /> {getDaysAgo(bloqueo.fechaCreacion)} días
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedBloqueo(bloqueo)}
                                        className="shrink-0 px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-sm font-bold hover:bg-indigo-600"
                                    >
                                        Resolver
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Historial de Resueltos */}
            {bloqueosResueltos.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 bg-green-50 border-b border-green-100">
                        <h3 className="text-sm font-bold text-green-700 flex items-center gap-2">
                            <CheckCircle2 size={14} /> Resueltos Recientemente
                        </h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {bloqueosResueltos.map(bloqueo => (
                            <div key={bloqueo.idBloqueo} className="p-3 opacity-60">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 size={14} className="text-green-500" />
                                    <span className="text-sm text-gray-600 line-through">{bloqueo.motivo}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal de Resolución */}
            {selectedBloqueo && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-xl">
                        <div className="px-4 py-3 bg-indigo-600 text-white flex justify-between items-center">
                            <h3 className="font-bold">Resolver Bloqueo</h3>
                            <button onClick={() => setSelectedBloqueo(null)} className="p-1 hover:bg-white/20 rounded">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <p className="text-xs text-gray-400 uppercase font-bold">Bloqueo</p>
                                <p className="text-sm text-gray-700">{selectedBloqueo.motivo}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 uppercase font-bold">¿Cómo se resolvió?</label>
                                <textarea
                                    value={resolucion}
                                    onChange={(e) => setResolucion(e.target.value)}
                                    rows={3}
                                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                                    placeholder="Describe cómo se resolvió el bloqueo..."
                                />
                            </div>
                            <button
                                onClick={() => handleResolver(selectedBloqueo.idBloqueo)}
                                disabled={saving || !resolucion.trim()}
                                className="w-full py-2.5 bg-green-500 text-white rounded-lg font-bold text-sm hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                Marcar como Resuelto
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
