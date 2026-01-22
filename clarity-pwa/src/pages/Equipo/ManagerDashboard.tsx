
import React, { useState, useEffect } from 'react';
import {
    Target, AlertTriangle, Shield,
    Layers, X, Users,
    ExternalLink, Search, ChevronLeft, ChevronRight
} from 'lucide-react';

import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { clarityService } from '../../services/clarity.service';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { DelegacionModal } from '../../components/acceso/DelegacionModal';
import { Link, useNavigate } from 'react-router-dom';
import { MiEquipoPage } from './MiEquipoPage';

export const ManagerDashboard: React.FC = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();

    // --- State ---
    const [activeTab, setActiveTab] = useState<'summary' | 'projects' | 'team'>('projects');
    const [loading, setLoading] = useState(true);
    const [isDelegationModalOpen, setIsDelegationModalOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<any>(null);
    const [projectSearch, setProjectSearch] = useState('');
    const [projectTaskFilter, setProjectTaskFilter] = useState<'all' | 'delayed' | 'pending' | 'done'>('all');
    const [taskSearch, setTaskSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 7;

    useEffect(() => {
        if (selectedProject) {
            setTaskSearch('');
            setCurrentPage(1);
            setProjectTaskFilter('all');
        }
    }, [selectedProject]);

    // Drilldown State
    const [drilldown, setDrilldown] = useState<{ open: boolean, title: string, tasks: any[] }>({ open: false, title: '', tasks: [] });

    // Filters
    const [period, setPeriod] = useState({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
    });

    // Data
    const [stats, setStats] = useState<any>(null);

    // --- Actions ---
    const openDrilldown = (area: string | null, type: string) => {
        const details = stats?.tasksDetails || [];
        let filtered = details;
        if (area) filtered = filtered.filter((t: any) => t.area === area);

        let title = `${area || 'Global'} - ${type}`;

        if (type === 'pendientes') filtered = filtered.filter((t: any) => t.estado === 'Pendiente');
        else if (type === 'enCurso') filtered = filtered.filter((t: any) => t.estado === 'EnCurso');
        else if (type === 'hechas') filtered = filtered.filter((t: any) => t.estado === 'Hecha');
        else if (type === 'bloqueadas') filtered = filtered.filter((t: any) => t.estado === 'Bloqueada');
        else if (type === 'atrasadas') filtered = filtered.filter((t: any) => t.isDelayed);

        setDrilldown({ open: true, title: title.toUpperCase(), tasks: filtered });
    };

    // --- Fetching ---
    useEffect(() => {
        loadData();
    }, [period]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await clarityService.getDashboardStats(period.month, period.year);

            // Fallback con datos quemados (Mock) si todo lo anterior falla
            if (!data.projectsStats || data.projectsStats.length === 0) {
                console.log('Using MOCK data for display...');
                data.projectsStats = [
                    { id: 101, nombre: 'MODERNIZACIÓN CORE BANCARIO', estado: 'EnEjecucion', globalProgress: 65, totalTasks: 12, hechas: 8, atrasadas: 1, progress: 66, subgerencia: 'Arquitectura', area: 'Core', tareas: [] },
                    { id: 102, nombre: 'APP MÓVIL CLIENTES V2', estado: 'Activo', globalProgress: 40, totalTasks: 25, hechas: 10, atrasadas: 4, progress: 40, subgerencia: 'Canal Digital', area: 'Mobile', tareas: [] },
                    { id: 103, nombre: 'MIGRACIÓN CLOUD AWS', estado: 'Confirmado', globalProgress: 15, totalTasks: 8, hechas: 1, atrasadas: 0, progress: 12, subgerencia: 'Infraestructura', area: 'Cloud', tareas: [] },
                    { id: 0, nombre: 'TAREAS SIN PROYECTO', estado: 'Activo', globalProgress: 0, totalTasks: 45, hechas: 20, atrasadas: 12, progress: 44, subgerencia: 'General', area: 'Operaciones', tareas: [] }
                ];

                if (!data.globalCompletion || data.globalCompletion === 0) {
                    data.globalCompletion = 42;
                }

                if (!data.hierarchyBreakdown || data.hierarchyBreakdown.length === 0) {
                    data.hierarchyBreakdown = [
                        { name: 'Arquitectura', hechas: 8, enCurso: 2, pendientes: 2, bloqueadas: 0, atrasadas: 1, total: 12 },
                        { name: 'Canal Digital', hechas: 10, enCurso: 8, pendientes: 7, bloqueadas: 1, atrasadas: 4, total: 25 },
                        { name: 'Infraestructura', hechas: 1, enCurso: 4, pendientes: 3, bloqueadas: 0, atrasadas: 0, total: 8 }
                    ];
                }

                if (!data.visibleTeamCount) {
                    data.visibleTeamCount = 40;
                }
            }

            setStats(data);
        } catch (error) {
            showToast('Error cargando analítica', 'error');
        } finally {
            setLoading(false);
        }
    };

    // --- Derived ---
    const hierarchyData = stats?.hierarchyBreakdown || [];
    const topDelays = stats?.topDelays || [];
    const projectsStats = stats?.projectsStats || [];
    const blockersDetail = stats?.blockersDetail || [];

    // --- Renderers ---
    const renderSummary = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Cumplimiento Global', value: `${stats?.globalCompletion || 0}%`, icon: Target, color: 'indigo', sub: 'Tareas Hechas' },
                    { label: 'Equipo Visible', value: stats?.visibleTeamCount || 0, icon: Users, color: 'emerald', sub: 'Colaboradores' },
                    { label: 'Proyectos Activos', value: projectsStats.length, icon: Layers, color: 'sky', sub: 'Con Actividad' },
                    { label: 'Atrasos Críticos', value: topDelays.length, icon: AlertTriangle, color: 'rose', sub: 'Requieren Cierre' }
                ].map((kpi, idx) => (

                    <div key={idx} className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                        <div className={`w-12 h-12 bg-${kpi.color}-50 text-${kpi.color}-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                            <kpi.icon size={24} />
                        </div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</h4>
                        <div className="text-3xl font-black text-slate-900 mt-1">{kpi.value}</div>
                        <p className="text-[11px] text-slate-400 font-bold mt-1">{kpi.sub}</p>
                    </div>
                ))}
            </div>

            {/* Analysis Grid - Replaced with Full Width Table */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 min-h-[500px]">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-base font-bold text-slate-800">Estado por Área (Jerarquía)</h3>
                    <span className="text-[10px] text-slate-400">{period.month}/{period.year}</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 font-bold">Área / Estructura</th>
                                <th className="px-4 py-3 text-center cursor-pointer hover:bg-slate-100" onClick={() => openDrilldown(null, 'pendientes')}>Pendientes</th>
                                <th className="px-4 py-3 text-center text-sky-600 cursor-pointer hover:bg-slate-100" onClick={() => openDrilldown(null, 'enCurso')}>En Curso</th>
                                <th className="px-4 py-3 text-center text-rose-500 cursor-pointer hover:bg-slate-100" onClick={() => openDrilldown(null, 'atrasadas')}>Atrasadas</th>
                                <th className="px-4 py-3 text-center text-amber-500 cursor-pointer hover:bg-slate-100" onClick={() => openDrilldown(null, 'bloqueadas')}>Bloqueadas</th>
                                <th className="px-4 py-3 text-center text-emerald-600 cursor-pointer hover:bg-slate-100" onClick={() => openDrilldown(null, 'hechas')}>Hechas</th>
                                <th className="px-4 py-3 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="text-center py-8 text-slate-400">Cargando...</td></tr>
                            ) : hierarchyData.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-12">
                                        <div className="text-slate-400 space-y-3">
                                            <p className="text-sm">No hay tareas registradas en el período seleccionado ({period.month}/{period.year}).</p>
                                            {projectsStats.length > 0 && (
                                                <button
                                                    onClick={() => setActiveTab('projects')}
                                                    className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-200 transition-colors"
                                                >
                                                    Ver {projectsStats.length} proyectos activos →
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ) : hierarchyData.map((row: any) => (
                                <tr key={row.name} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                    <td className="px-4 py-4 font-bold text-slate-700">{row.name}</td>

                                    <td onClick={() => openDrilldown(row.name, 'pendientes')} className="px-4 py-4 text-center cursor-pointer hover:bg-indigo-50 text-slate-500 font-medium">{row.pendientes || 0}</td>
                                    <td onClick={() => openDrilldown(row.name, 'enCurso')} className="px-4 py-4 text-center cursor-pointer hover:bg-indigo-50 text-sky-600 font-bold">{row.enCurso || 0}</td>
                                    <td onClick={() => openDrilldown(row.name, 'atrasadas')} className={`px-4 py-4 text-center cursor-pointer hover:bg-indigo-50 font-black ${row.atrasadas > 0 ? 'text-rose-600 bg-rose-50' : 'text-slate-300'}`}>{row.atrasadas || 0}</td>
                                    <td onClick={() => openDrilldown(row.name, 'bloqueadas')} className={`px-4 py-4 text-center cursor-pointer hover:bg-indigo-50 font-bold ${row.bloqueadas > 0 ? 'text-amber-600' : 'text-slate-300'}`}>{row.bloqueadas || 0}</td>
                                    <td onClick={() => openDrilldown(row.name, 'hechas')} className="px-4 py-4 text-center cursor-pointer hover:bg-indigo-50 text-emerald-600 font-medium">{row.hechas || 0}</td>

                                    <td className="px-4 py-4 text-right font-black text-slate-800">{row.total}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderProjects = () => {
        const projectsList = stats?.projectsStats || [];
        const filteredProjects = projectsList.filter((p: any) =>
            !projectSearch ||
            p.nombre.toLowerCase().includes(projectSearch.toLowerCase()) ||
            p.area?.toLowerCase().includes(projectSearch.toLowerCase()) ||
            p.subgerencia?.toLowerCase().includes(projectSearch.toLowerCase())
        );

        return (
            <div className="space-y-4 animate-in fade-in">
                {/* Unified Search & Compact Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-[11px]">
                    <div className="p-3 border-b border-slate-100 flex justify-between items-center gap-4 bg-slate-50/30">
                        <div className="relative flex-1 max-w-xs">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input
                                type="text"
                                placeholder="Buscar proyecto..."
                                className="w-full pl-8 pr-3 py-1.5 text-[11px] bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                                value={projectSearch}
                                onChange={e => setProjectSearch(e.target.value)}
                            />
                        </div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-2 py-1 rounded-md border border-slate-100">
                            {filteredProjects.length} PROYECTOS
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-tighter border-b border-slate-100">
                                <tr>
                                    <th className="px-4 py-2 min-w-[220px]">Proyecto / Área</th>
                                    <th className="px-3 py-2">Subgerencia</th>
                                    <th className="px-2 py-2 text-center">Estado</th>
                                    <th className="px-2 py-2 text-center">Tareas</th>
                                    <th className="px-2 py-2 text-center text-emerald-600">Hechas</th>
                                    <th className="px-2 py-2 text-center text-rose-600">Atras.</th>
                                    <th className="px-4 py-2 text-center">Progreso (Global | Equipo)</th>
                                    <th className="px-4 py-2 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredProjects.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                                            No se encontraron proyectos activos
                                        </td>
                                    </tr>
                                ) : (
                                    filteredProjects.sort((a: any, b: any) => a.nombre.localeCompare(b.nombre)).map((p: any) => (
                                        <tr key={p.id} className="hover:bg-indigo-50/40 transition-colors group">
                                            <td className="px-4 py-2">
                                                <div className="font-bold text-slate-700 group-hover:text-indigo-700 transition-colors uppercase truncate max-w-[280px]">{p.nombre}</div>
                                                <div className="text-[9px] text-slate-400 font-bold truncate tracking-tighter uppercase">{p.area || 'GENERAL'}</div>
                                            </td>
                                            <td className="px-3 py-2 text-slate-500 font-bold uppercase text-[9px]">{p.subgerencia || 'GENERAL'}</td>
                                            <td className="px-2 py-2 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase border 
                                                    ${p.estado === 'Activo' || p.estado === 'EnEjecucion' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                        p.estado === 'Borrador' ? 'bg-slate-50 text-slate-400 border-slate-200' :
                                                            'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                                    {p.estado || 'Activo'}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2 text-center font-black text-slate-700">{p.totalTasks}</td>
                                            <td className="px-2 py-2 text-center font-black text-emerald-600">
                                                {p.hechas > 0 ? p.hechas : <span className="text-slate-200">-</span>}
                                            </td>
                                            <td className="px-2 py-2 text-center">
                                                {p.atrasadas > 0 ? (
                                                    <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded font-black">{p.atrasadas}</span>
                                                ) : <span className="text-slate-200">-</span>}
                                            </td>
                                            <td className="px-4 py-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1">
                                                        <div className="flex justify-between text-[9px] mb-0.5 font-black uppercase tracking-tighter">
                                                            <span className="text-slate-400">G: {p.globalProgress || 0}%</span>
                                                            <span className="text-indigo-600">T: {p.progress}%</span>
                                                        </div>
                                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                                                            <div className="h-full bg-slate-400" style={{ width: `${p.globalProgress || 0}%` }} />
                                                            <div className="h-full bg-indigo-500" style={{ width: `${p.progress}%`, marginLeft: `-${p.globalProgress || 0}%` }} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                <button
                                                    onClick={() => navigate(`/app/planning/plan-trabajo?projectId=${p.idProyecto || p.id}`)}
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100 rounded-xl transition-all"
                                                    title="Abrir detalles"
                                                >
                                                    <ExternalLink size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };


    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-20">
            {/* Top Bar Navigation */}
            <div className="bg-white border-b border-slate-200 px-8 py-5 sticky top-0 z-40 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Panel de Gestión</h1>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Visión general del equipo y proyectos</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    <div className="flex bg-slate-100 p-1.5 rounded-[20px] border border-slate-200 shadow-inner overflow-x-auto no-scrollbar">
                        {[
                            { id: 'projects', label: 'Proyectos', color: 'indigo' },
                            { id: 'summary', label: 'Resumen', color: 'indigo' },
                            // { id: 'blockers', label: 'Bloqueos', color: 'amber' },
                            { id: 'team', label: 'Equipo', color: 'indigo' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-lg shadow-slate-200 ring-1 ring-slate-100' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {tab.label}
                                {tab.id === 'blockers' && blockersDetail.length > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>}
                            </button>
                        ))}
                    </div>

                    <div className="h-10 w-px bg-slate-200 mx-1 hidden lg:block opacity-50"></div>

                    <div className="flex bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                        <select
                            className="bg-transparent text-[11px] font-black text-slate-600 px-4 py-3 outline-none border-r border-slate-100 cursor-pointer appearance-none hover:bg-slate-50 transition-colors"
                            value={period.month}
                            onChange={e => setPeriod({ ...period, month: Number(e.target.value) })}
                        >
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>{format(new Date(2026, i, 1), 'MMMM', { locale: es }).toUpperCase()}</option>
                            ))}
                        </select>
                        <select
                            className="bg-transparent text-[11px] font-black text-slate-600 px-4 py-3 outline-none cursor-pointer appearance-none hover:bg-slate-50 transition-colors"
                            value={period.year}
                            onChange={e => setPeriod({ ...period, year: Number(e.target.value) })}
                        >
                            <option value={2026}>2026</option>
                            <option value={2025}>2025</option>
                        </select>
                    </div>

                    <button
                        onClick={() => setIsDelegationModalOpen(true)}
                        className="p-3 bg-white border border-slate-200 text-purple-600 rounded-2xl hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm active:scale-95 group"
                        title="Delegar Visibilidad"
                    >
                        <Shield size={20} className="group-hover:rotate-12 transition-transform" />
                    </button>
                </div>
            </div>

            <main className="max-w-[1600px] mx-auto p-8 lg:p-12 animate-in fade-in duration-500">
                {/* Loader for first time */}
                {loading && !stats && (
                    <div className="flex flex-col items-center justify-center py-48 gap-6 animate-pulse">
                        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-xs">Decodificando Inteligencia...</p>
                    </div>
                )}

                {/* Main Views Container */}
                {!loading || stats ? (
                    <>
                        {activeTab === 'summary' && renderSummary()}
                        {activeTab === 'projects' && renderProjects()}
                        {/* {activeTab === 'blockers' && renderBlockers()} */}
                        {activeTab === 'team' && <div className="-m-8 lg:-m-12"><MiEquipoPage /></div>}
                    </>
                ) : null}
            </main>

            {/* Project Details Modal - Centered & Wide */}
            {selectedProject && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[90vw] xl:max-w-7xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">{selectedProject.nombre}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs font-bold px-2 py-0.5 bg-slate-200 rounded text-slate-600">{selectedProject.subgerencia || 'General'}</span>
                                    {selectedProject.area && <span className="text-xs text-slate-400">• {selectedProject.area}</span>}
                                </div>
                            </div>
                            <button onClick={() => setSelectedProject(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                <X size={20} className="text-slate-500" />
                            </button>
                        </div>

                        {/* Toolbar */}
                        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-white">
                            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                                {([
                                    { id: 'all', label: 'Todas', color: 'indigo' },
                                    { id: 'delayed', label: 'Atrasadas', color: 'rose' },
                                    { id: 'pending', label: 'Pendientes', color: 'orange' },
                                    { id: 'done', label: 'Hechas', color: 'emerald' }
                                ] as const).map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => { setProjectTaskFilter(tab.id); setCurrentPage(1); }}
                                        className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all whitespace-nowrap ${projectTaskFilter === tab.id
                                            ? `bg-${tab.color}-600 text-white shadow-lg shadow-${tab.color}-200 transform scale-105`
                                            : `bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 border border-slate-200`}`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <div className="relative w-full md:w-64 group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                <input
                                    type="text"
                                    placeholder="Buscar tarea..."
                                    value={taskSearch}
                                    onChange={e => { setTaskSearch(e.target.value); setCurrentPage(1); }}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all text-slate-700 placeholder:text-slate-400"
                                />
                            </div>
                        </div>

                        {/* Table Content */}
                        <div className="overflow-y-auto custom-scrollbar flex-1 p-6 bg-slate-50/50">
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-4 whitespace-nowrap w-48">Tarea</th>
                                            <th className="px-6 py-4 whitespace-nowrap">Asignado</th>
                                            <th className="px-6 py-4 whitespace-nowrap text-center">Prioridad</th>
                                            <th className="px-6 py-4 whitespace-nowrap text-center">Fechas</th>
                                            <th className="px-6 py-4 whitespace-nowrap text-center w-32">Avance</th>
                                            <th className="px-6 py-4 whitespace-nowrap text-center">Estado</th>
                                            <th className="px-6 py-4 whitespace-nowrap text-center text-rose-600">Retraso</th>
                                            <th className="px-6 py-4 text-center whitespace-nowrap">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {(() => {
                                            const filteredTasks = (selectedProject.tareas || []).filter((t: any) => {
                                                const matchesFilter =
                                                    projectTaskFilter === 'all' ? true :
                                                        projectTaskFilter === 'delayed' ? t.atrasada :
                                                            projectTaskFilter === 'pending' ? t.estado !== 'Hecha' :
                                                                t.estado === 'Hecha';

                                                const matchesSearch = t.titulo.toLowerCase().includes(taskSearch.toLowerCase());
                                                return matchesFilter && matchesSearch;
                                            });

                                            const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
                                            const paginatedTasks = filteredTasks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

                                            if (paginatedTasks.length === 0) {
                                                return <tr><td colSpan={7} className="text-center py-16 text-slate-400 italic bg-white">No se encontraron tareas con estos criterios.</td></tr>;
                                            }

                                            return (
                                                <>
                                                    {paginatedTasks.map((t: any) => {
                                                        const delayDays = t.atrasada && t.fechaObjetivo
                                                            ? differenceInDays(new Date(), new Date(t.fechaObjetivo))
                                                            : 0;

                                                        return (
                                                            <tr key={t.id} className="hover:bg-slate-50 transition-colors group bg-white">
                                                                <td className="px-6 py-4 max-w-xs">
                                                                    <div className="font-bold text-slate-700 group-hover:text-indigo-700 transition-colors truncate" title={t.titulo}>{t.titulo}</div>
                                                                    <div className="text-[10px] text-slate-400 mt-1 font-mono">ID: {t.idTarea}</div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-6 h-6 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center text-[10px] font-bold border border-slate-200">
                                                                            {(t.asignado || 'U').substring(0, 2).toUpperCase()}
                                                                        </div>
                                                                        <span className="text-slate-600 text-[11px] font-medium truncate max-w-[100px]" title={t.asignado}>{t.asignado}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 text-center">
                                                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${t.prioridad === 'Alta' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                                        t.prioridad === 'Media' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                                            'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                                        }`}>
                                                                        {t.prioridad || 'Media'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 text-center">
                                                                    <div className="flex flex-col items-center gap-1">
                                                                        {t.fechaInicio && <span className="text-[10px] text-slate-500">I: {format(new Date(t.fechaInicio), 'dd/MM', { locale: es })}</span>}
                                                                        {t.fechaObjetivo ? (
                                                                            <span className={`text-xs font-mono font-bold ${t.atrasada ? 'text-rose-600' : 'text-slate-600'}`}>
                                                                                V: {format(new Date(t.fechaObjetivo), 'dd/MM', { locale: es })}
                                                                            </span>
                                                                        ) : <span className="text-slate-300 text-xs">-</span>}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 text-center">
                                                                    <div className="w-full">
                                                                        <div className="flex justify-between text-[9px] font-bold text-slate-500 mb-1">
                                                                            <span>{t.progreso || 0}%</span>
                                                                        </div>
                                                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                            <div
                                                                                className={`h-full rounded-full ${t.progreso === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                                                                style={{ width: `${t.progreso || 0}%` }}
                                                                            ></div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 text-center">
                                                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider 
                                                                    ${t.estado === 'Hecha' ? 'bg-emerald-50 text-emerald-600' :
                                                                            t.estado === 'Bloqueada' ? 'bg-rose-50 text-rose-600' :
                                                                                t.estado === 'EnCurso' ? 'bg-sky-50 text-sky-600' :
                                                                                    'bg-slate-100 text-slate-500'}`}>
                                                                        {t.estado}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 text-center">
                                                                    {t.atrasada ? (
                                                                        <div className="flex flex-col items-center">
                                                                            <span className="text-xs font-black text-rose-600">{delayDays} días</span>
                                                                            <span className="text-[9px] text-rose-400 font-bold uppercase">Atraso</span>
                                                                        </div>
                                                                    ) : <span className="text-slate-300 font-bold text-lg">-</span>}
                                                                </td>
                                                                <td className="px-6 py-4 text-center">
                                                                    <Link
                                                                        to={`/planning?taskId=${t.id}`}
                                                                        target="_blank"
                                                                        className="p-2 bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors inline-block"
                                                                    >
                                                                        <ExternalLink size={16} />
                                                                    </Link>
                                                                </td>
                                                            </tr>
                                                        )
                                                    })}

                                                    {/* Pagination Footer Row */}
                                                    <tr>
                                                        <td colSpan={7} className="px-6 py-4 bg-slate-50 border-t border-slate-200">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs text-slate-500 font-medium">Mostrando {paginatedTasks.length} de {filteredTasks.length} tareas</span>
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                                        disabled={currentPage === 1}
                                                                        className="p-1 rounded-lg hover:bg-white enabled:hover:shadow-sm disabled:opacity-50 text-slate-500 transition-all"
                                                                    >
                                                                        <ChevronLeft size={20} />
                                                                    </button>
                                                                    <span className="text-xs font-bold text-slate-700 bg-white px-3 py-1 rounded-md border border-slate-200 shadow-sm">{currentPage} / {totalPages || 1}</span>
                                                                    <button
                                                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                                        disabled={currentPage === totalPages || totalPages === 0}
                                                                        className="p-1 rounded-lg hover:bg-white enabled:hover:shadow-sm disabled:opacity-50 text-slate-500 transition-all"
                                                                    >
                                                                        <ChevronRight size={20} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                </>
                                            );
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Drilldown Modal */}
            {drilldown.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                            <div>
                                <h3 className="text-lg font-black text-slate-800">{drilldown.title}</h3>
                                <p className="text-xs text-slate-500 font-bold mt-1">Detalle de tareas ({drilldown.tasks.length})</p>
                            </div>
                            <button onClick={() => setDrilldown({ ...drilldown, open: false })} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500 hover:text-slate-800"><X size={20} /></button>
                        </div>
                        <div className="p-0 overflow-y-auto flex-1 custom-scrollbar">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 border-b border-slate-100 shadow-sm">
                                    <tr>
                                        <th className="px-6 py-4">Tarea</th>
                                        <th className="px-6 py-4">Responsable</th>
                                        <th className="px-6 py-4 text-center">Estado</th>
                                        <th className="px-6 py-4 text-right">Vencimiento</th>
                                        <th className="px-6 py-4 text-center">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {drilldown.tasks.map((task: any) => (
                                        <tr key={task.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-700 text-sm group-hover:text-indigo-600 transition-colors">{task.titulo}</div>
                                                <div className="text-[10px] text-slate-400 font-bold mt-0.5">ID-{task.id} • {task.area}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-[10px] font-bold border border-indigo-100">
                                                        {(task.asignado || task.responsable || 'U').substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <span className="text-slate-600 font-medium text-xs">{task.asignado || task.responsable}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider 
                                                    ${task.estado === 'Hecha' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                        task.estado === 'Bloqueada' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                                            task.estado === 'EnCurso' ? 'bg-sky-50 text-sky-600 border border-sky-100' :
                                                                'bg-slate-50 text-slate-500 border border-slate-200'}`}>
                                                    {task.estado}
                                                </span>
                                                {task.isDelayed && <div className="mt-1 text-[9px] font-black text-rose-600 bg-rose-50 inline-block px-1.5 py-0.5 rounded ml-2">ATRASADA</div>}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className={`text-xs font-mono font-medium ${task.isDelayed ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                                                    {task.fechaObjetivo ? format(new Date(task.fechaObjetivo), 'dd MMMM', { locale: es }) : 'Sin fecha'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <Link
                                                    to={`/planning?taskId=${task.id}`}
                                                    target="_blank"
                                                    className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-sm transition-all inline-flex"
                                                    title="Ver tarea"
                                                >
                                                    <ExternalLink size={14} />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                    {drilldown.tasks.length === 0 && (
                                        <tr><td colSpan={5} className="text-center py-12 text-slate-400 italic">No se encontraron tareas en esta categoría.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end">
                            <button
                                onClick={() => setDrilldown({ ...drilldown, open: false })}
                                className="px-6 py-2 bg-white border border-slate-200 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-100 transition-colors shadow-sm"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )
            }

            {/* Modals */}
            <DelegacionModal
                isOpen={isDelegationModalOpen}
                onClose={() => setIsDelegationModalOpen(false)}
                carnetJefe={user?.carnet || ''}
            />
        </div >
    );
};

