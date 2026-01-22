
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { clarityService } from '../../services/clarity.service';
import { planningService } from '../../services/planning.service';
import type { Proyecto } from '../../types/modelos';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    Search, Calendar, LayoutList, Shield, Users,
    TrendingUp, Briefcase, ChevronRight, CheckCircle2,
    BarChart3
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { DelegacionModal } from '../../components/acceso/DelegacionModal';
import { MiEquipoPage } from './MiEquipoPage';

export const DashboardManager: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showToast } = useToast();

    // -- STATE --
    const [activeTab, setActiveTab] = useState<'projects' | 'team'>('projects');
    const [isDelegationModalOpen, setIsDelegationModalOpen] = useState(false);

    // Data State
    const [projects, setProjects] = useState<Proyecto[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');

    // -- EFFECT: LOAD DATA (SAFE METHOD) --
    useEffect(() => {
        loadProjects();
    }, [searchTerm]);

    const loadProjects = async () => {
        setLoading(true);
        try {
            // Usamos clarityService que es el más robusto y probado
            const result = await clarityService.getProyectos({
                limit: 50,
                nombre: searchTerm
            });

            if (result) {
                let items = result.items || [];
                // Si no hay resultados y no buscamos nada, intentamos cargar "mis proyectos" por si acaso
                if (items.length === 0 && !searchTerm) {
                    const myProjects = await planningService.getMyProjects();
                    items = myProjects?.map(p => ({
                        idProyecto: p.id,
                        nombre: p.nombre,
                        gerencia: p.gerencia,
                        subgerencia: p.subgerencia,
                        area: p.area,
                        estado: p.estado,
                        fechaInicio: p.fechaInicio,
                        fechaFin: p.fechaFin,
                        progreso: p.progress
                    })) || [];
                }
                setProjects(items);
            }
        } catch (error) {
            console.error(error);
            showToast('Error cargando proyectos', 'error');
        } finally {
            setLoading(false);
        }
    };

    // -- KPIS (Calculados localmente para velocidad) --
    const stats = useMemo(() => {
        const total = projects.length;
        const avg = total > 0 ? Math.round(projects.reduce((acc, p) => acc + (p.progreso || 0), 0) / total) : 0;
        const complete = projects.filter(p => (p.progreso || 0) === 100).length;
        const active = projects.filter(p => (p.progreso || 0) < 100 && (p.progreso || 0) > 0).length;
        return { total, avg, complete, active };
    }, [projects]);

    // -- RENDER TABLE --
    const renderTable = () => (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
            {/* Toolbar */}
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
                <div className="flex items-center gap-2">
                    <div className="bg-white p-1.5 rounded-lg border border-slate-200 text-slate-500 shadow-sm">
                        <LayoutList size={16} />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest text-slate-500">Portafolio de Proyectos</span>
                    <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-2 py-0.5 rounded-full border border-indigo-100">
                        {projects.length}
                    </span>
                </div>

                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                        type="text"
                        placeholder="Buscar..."
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <th className="px-6 py-4 w-[40%]">Detalle Proyecto</th>
                            <th className="px-6 py-4 w-[25%]">Area / Gerencia</th>
                            <th className="px-6 py-4 w-[20%] text-center">Avance</th>
                            <th className="px-6 py-4 w-[15%] text-right">Estado</th>
                            <th className="px-6 py-4 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="py-24 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-xs font-bold text-slate-400">Cargando datos...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : projects.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-16 text-center text-slate-400 text-xs font-medium italic">
                                    No se encontraron proyectos activos
                                </td>
                            </tr>
                        ) : (
                            projects.map((p) => (
                                <tr
                                    key={p.idProyecto}
                                    onClick={() => navigate(`/app/planning/plan-trabajo?projectId=${p.idProyecto}`)}
                                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-[13px] font-bold text-slate-700 group-hover:text-indigo-600 transition-colors mb-1">
                                                {p.nombre}
                                            </span>
                                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold uppercase">
                                                <Calendar size={10} />
                                                {p.fechaInicio ? format(new Date(p.fechaInicio), 'dd MMM yyyy', { locale: es }) : '--'}
                                                -
                                                {p.fechaFin ? format(new Date(p.fechaFin), 'dd MMM yyyy', { locale: es }) : '--'}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-bold text-slate-600">{p.area || 'General'}</span>
                                            <span className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]">{p.subgerencia || '-'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col items-center w-full max-w-[120px] mx-auto">
                                            <div className="flex justify-between w-full mb-1">
                                                <span className="text-[10px] font-bold text-slate-400">Total</span>
                                                <span className={`text-[10px] font-black ${(p.progreso || 0) === 100 ? 'text-emerald-600' : 'text-indigo-600'}`}>
                                                    {p.progreso || 0}%
                                                </span>
                                            </div>
                                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${(p.progreso || 0) === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                                    style={{ width: `${p.progreso || 0}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-black uppercase border tracking-wide ${p.estado === 'EnEjecucion' || p.estado === 'Confirmado' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                p.estado === 'Cerrado' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                                                    'bg-indigo-50 text-indigo-600 border-indigo-100'
                                            }`}>
                                            {p.estado}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-slate-300">
                                        <ChevronRight size={16} className="group-hover:text-indigo-400 transition-colors" />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="bg-slate-50 border-t border-slate-100 px-6 py-3 flex justify-between items-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sistema de Gestión</span>
                <span className="text-[10px] text-slate-300 font-mono">{new Date().toLocaleDateString()}</span>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#fcfcfd] font-sans pb-24">

            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm backdrop-blur-md bg-white/95">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-slate-900 rounded-xl shadow-lg shadow-slate-200 text-white">
                                <BarChart3 size={20} />
                            </div>
                            <div>
                                <h1 className="text-lg font-black text-slate-800 tracking-tight">Panel de Control</h1>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gestión Estratégica</p>
                            </div>
                        </div>

                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button
                                onClick={() => setActiveTab('projects')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'projects' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <Briefcase size={14} /> Proyectos
                            </button>
                            <button
                                onClick={() => setActiveTab('team')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'team' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <Users size={14} /> Equipo
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8">
                {activeTab === 'projects' ? (
                    <div className="space-y-8">
                        {/* KPI Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in slide-in-from-bottom-4 duration-700">
                            {[
                                { label: 'Total Proyectos', val: stats.total, icon: Briefcase, color: 'indigo' },
                                { label: 'Promedio Avance', val: `${stats.avg}%`, icon: TrendingUp, color: 'emerald' },
                                { label: '100% Completados', val: stats.complete, icon: CheckCircle2, color: 'blue' },
                                { label: 'En Ejecución', val: stats.active, icon: Shield, color: 'amber' },
                            ].map((k, i) => (
                                <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-slate-200 transition-colors">
                                    <div className={`p-3 rounded-xl bg-${k.color}-50 text-${k.color}-600 group-hover:scale-110 transition-transform`}>
                                        <k.icon size={20} />
                                    </div>
                                    <div>
                                        <div className="text-2xl font-black text-slate-800">{k.val}</div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{k.label}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {renderTable()}
                    </div>
                ) : (
                    <MiEquipoPage />
                )}
            </main>

            {/* Delegation Button */}
            <button
                onClick={() => setIsDelegationModalOpen(true)}
                className="fixed bottom-8 right-8 w-12 h-12 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-all z-50 group"
            >
                <Shield size={20} className="group-hover:rotate-12 transition-transform" />
            </button>

            <DelegacionModal
                isOpen={isDelegationModalOpen}
                onClose={() => setIsDelegationModalOpen(false)}
                carnetJefe={user?.carnet || ''}
            />
        </div>
    );
};
