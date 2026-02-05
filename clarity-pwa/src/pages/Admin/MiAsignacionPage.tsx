import React, { useEffect, useState } from 'react';
import {
    Clock, AlertTriangle, CheckCircle2, Folder, RefreshCw,
    ChevronDown, ChevronRight, ExternalLink, Calendar,
    ListTodo, LayoutList, CheckCircle
} from 'lucide-react';
import { clarityService } from '../../services/clarity.service';
import { useToast } from '../../context/ToastContext';

interface Tarea {
    idTarea: number;
    idProyecto: number;
    titulo: string;
    estado: string;
    prioridad: string;
    progreso: number;
    fechaObjetivo: string;
    diasAtraso: number;
    esAtrasada: boolean;
    proyectoNombre: string;
}

interface Proyecto {
    idProyecto: number;
    nombre: string;
    progresoProyecto: number;
    misTareas: Tarea[];
}

const MiAsignacionPage: React.FC = () => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [proyectos, setProyectos] = useState<Proyecto[]>([]);
    const [resumen, setResumen] = useState<any>(null);
    const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await clarityService.getMiAsignacion('pendientes');
            setProyectos(data.proyectos || []);
            setResumen(data.resumen || null);

            // Por defecto todo retraído
            setExpandedProjects(new Set());
        } catch (error) {
            console.error(error);
            showToast('Error al cargar asignaciones', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const toggleProject = (id: number) => {
        const newSet = new Set(expandedProjects);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedProjects(newSet);
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('es-NI', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const getPrioridadStyle = (prioridad: string) => {
        switch (prioridad) {
            case 'Alta': return 'text-rose-600 bg-rose-50 border-rose-100';
            case 'Media': return 'text-amber-600 bg-amber-50 border-amber-100';
            default: return 'text-blue-600 bg-blue-50 border-blue-100';
        }
    };

    if (loading && proyectos.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Cargando tus asignaciones...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header Profesional */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                            <LayoutList className="text-indigo-600 w-8 h-8" />
                            Mi Asignación
                        </h1>
                        <p className="text-slate-500 mt-1">Control unificado de tus tareas por proyecto</p>
                    </div>
                    <button
                        onClick={loadData}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 shadow-sm hover:shadow-md hover:bg-slate-50 transition-all active:scale-95"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Sincronizar
                    </button>
                </div>

                {/* Dashboard de Status */}
                {resumen && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                <ListTodo size={24} />
                            </div>
                            <div>
                                <div className="text-2xl font-black text-slate-800">{resumen.totalTareas}</div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pendientes</div>
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <div className="text-2xl font-black text-rose-600">{resumen.tareasAtrasadas}</div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Atrasadas</div>
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                                <Clock size={24} />
                            </div>
                            <div>
                                <div className="text-2xl font-black text-amber-600">{resumen.tareasHoy}</div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Para Hoy</div>
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                                <CheckCircle size={24} />
                            </div>
                            <div>
                                <div className="text-2xl font-black text-emerald-600">{resumen.tareasCompletadas}</div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Completas</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tabla Agrupada por Proyecto */}
                <div className="space-y-4">
                    {proyectos.length === 0 ? (
                        <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200 mt-10">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="w-10 h-10 text-slate-300" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-700">¡Todo al día!</h3>
                            <p className="text-slate-400">No tienes tareas pendientes asignadas en proyectos activos.</p>
                        </div>
                    ) : (
                        proyectos.map((proyecto) => {
                            const isExpanded = expandedProjects.has(proyecto.idProyecto);
                            const hasAtraso = proyecto.misTareas.some(t => t.esAtrasada);

                            return (
                                <div key={proyecto.idProyecto} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
                                    {/* Header Proyecto */}
                                    <div
                                        onClick={() => toggleProject(proyecto.idProyecto)}
                                        className={`px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors ${isExpanded ? 'bg-slate-50/50 border-b border-slate-100' : ''}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-lg ${hasAtraso ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-500'}`}>
                                                {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-bold text-slate-800 leading-tight">{proyecto.nombre}</h2>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                                        <Folder size={12} />
                                                        {proyecto.misTareas.length} TAREAS
                                                    </span>
                                                    {hasAtraso && (
                                                        <span className="text-[10px] font-black bg-rose-100 text-rose-600 px-2 py-0.5 rounded uppercase">Atención requerida</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="hidden md:flex items-center gap-6">
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Progreso Global</span>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                                                            style={{ width: `${proyecto.progresoProyecto}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-sm font-black text-slate-700">{Math.round(proyecto.progresoProyecto)}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Cuerpo - Tabla de Tareas */}
                                    {isExpanded && (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead className="bg-[#fcfcfd]">
                                                    <tr>
                                                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tarea Asignada</th>
                                                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:table-cell">Estado / Prioridad</th>
                                                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Entrega</th>
                                                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Avance</th>
                                                        <th className="px-6 py-3 text-right"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {proyecto.misTareas.map((tarea) => (
                                                        <tr
                                                            key={tarea.idTarea}
                                                            onClick={() => window.open(`/app/planning/plan-trabajo?projectId=${tarea.idProyecto}&taskId=${tarea.idTarea}`, '_blank')}
                                                            className={`group hover:bg-indigo-50/30 cursor-pointer transition-colors ${tarea.esAtrasada ? 'bg-rose-50/20' : ''}`}
                                                        >
                                                            <td className="px-6 py-4">
                                                                <div className="font-bold text-slate-700 group-hover:text-indigo-600 transition-colors truncate max-w-[200px] md:max-w-xs">
                                                                    {tarea.titulo}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 hidden md:table-cell">
                                                                <div className="flex items-center gap-3">
                                                                    <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-[10px] font-black uppercase">
                                                                        {tarea.estado}
                                                                    </span>
                                                                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase border ${getPrioridadStyle(tarea.prioridad)}`}>
                                                                        {tarea.prioridad}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex flex-col">
                                                                    <span className={`text-xs font-bold flex items-center gap-1.5 ${tarea.esAtrasada ? 'text-rose-600' : 'text-slate-600'}`}>
                                                                        <Calendar size={12} />
                                                                        {formatDate(tarea.fechaObjetivo)}
                                                                    </span>
                                                                    {tarea.esAtrasada && (
                                                                        <span className="text-[10px] font-black text-rose-500 uppercase">{tarea.diasAtraso} días de atraso</span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                        <div
                                                                            className="h-full bg-indigo-400 rounded-full transition-all"
                                                                            style={{ width: `${tarea.progreso}%` }}
                                                                        />
                                                                    </div>
                                                                    <span className="text-xs font-black text-slate-500">{tarea.progreso}%</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all ml-auto">
                                                                    <ExternalLink size={14} />
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            <div className="p-4 bg-slate-50/50 text-center border-t border-slate-50">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        window.open(`/app/planning/plan-trabajo?projectId=${proyecto.idProyecto}`, '_blank');
                                                    }}
                                                    className="text-xs font-black text-indigo-600 uppercase tracking-widest hover:underline"
                                                >
                                                    Abrir Gestión de Proyecto Completa →
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default MiAsignacionPage;
