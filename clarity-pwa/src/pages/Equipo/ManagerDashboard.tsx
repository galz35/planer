
import React, { useState, useEffect } from 'react';
import {
    Target, AlertTriangle, Shield,
    CheckCircle2, Layers, X,
    ArrowRight, ExternalLink, Search, ChevronLeft, ChevronRight,
    Calendar, ListTodo, Plus, Clock, Edit2
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { clarityService } from '../../services/clarity.service';
import { planningService } from '../../services/planning.service';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useEquipo } from '../../hooks/useEquipo';
import { DelegacionModal } from '../../components/acceso/DelegacionModal';
import { Link, useNavigate } from 'react-router-dom';

export const ManagerDashboard: React.FC = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const todayStr = new Date().toISOString().split('T')[0];

    // --- State ---
    const [activeTab, setActiveTab] = useState<'summary' | 'projects' | 'blockers' | 'team'>('projects');
    const [loading, setLoading] = useState(true);
    const [isDelegationModalOpen, setIsDelegationModalOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<any>(null);
    const [projectSearch, setProjectSearch] = useState('');
    const [projectTaskFilter, setProjectTaskFilter] = useState<'all' | 'delayed' | 'pending' | 'done'>('all');
    const [taskSearch, setTaskSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    // Blockers State
    const [blockerSearch, setBlockerSearch] = useState('');
    const [blockerPage, setBlockerPage] = useState(1);
    // Team State
    const [teamSearch, setTeamSearch] = useState('');
    const [teamPage, setTeamPage] = useState(1);

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

    const selectedMember: any = null; const setSelectedMember = (_?: any) => { }; // Deprecated modal state mock

    // Filters
    const [period, setPeriod] = useState({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
    });

    // Data
    const { miembros } = useEquipo(todayStr);
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

            // Si no hay proyectos o es un array vacío, intentamos con la API de proyectos por visibilidad (Mi Jerarquía)
            if (!data.projectsStats || data.projectsStats.length === 0) {
                console.log('Dashboard stats returned 0 projects. Attempting fallback with getMyProjects...');
                try {
                    const projects = await planningService.getMyProjects();
                    if (projects && projects.length > 0) {
                        data.projectsStats = projects;

                        // Si globalCompletion es 0, recalculamos basándonos en los proyectos encontrados
                        if (!data.globalCompletion || data.globalCompletion === 0) {
                            const total = projects.reduce((acc: number, p: any) => acc + (p.totalTasks || 0), 0);
                            const done = projects.reduce((acc: number, p: any) => acc + (p.hechas || 0), 0);
                            data.globalCompletion = total > 0 ? Math.round((done / total) * 100) : 0;
                        }
                    }
                } catch (pError) {
                    console.error('Error fetching fallback projects:', pError);
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
                    { label: 'Planes Confirmados', value: stats?.totalActivePlans || 0, icon: CheckCircle2, color: 'emerald', sub: `${period.month}/${period.year}` },
                    { label: 'Atrasos Críticos', value: topDelays.length, icon: AlertTriangle, color: 'rose', sub: 'Requieren Cierre' },
                    { label: 'Bloqueos Activos', value: blockersDetail.length, icon: Layers, color: 'amber', sub: 'Impacto Operativo' }
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
        const filteredProjects = projectsStats.filter((p: any) =>
            !projectSearch ||
            p.nombre.toLowerCase().includes(projectSearch.toLowerCase()) ||
            p.area?.toLowerCase().includes(projectSearch.toLowerCase()) ||
            p.subgerencia?.toLowerCase().includes(projectSearch.toLowerCase())
        ).sort((a: any, b: any) => {
            if (a.nombre === 'General') return 1;
            if (b.nombre === 'General') return -1;
            return 0;
        });

        return (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Cartera de Proyectos</h2>
                        <p className="text-xs text-slate-500 mt-1 font-medium">Avance y estado de iniciativas ({filteredProjects.length})</p>
                    </div>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Buscar proyecto, área..."
                            className="pl-4 pr-10 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-64 transition-all shadow-sm"
                            value={projectSearch}
                            onChange={e => setProjectSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 whitespace-nowrap">Proyecto</th>
                                <th className="px-6 py-4 whitespace-nowrap">Área</th>
                                <th className="px-6 py-4 text-center whitespace-nowrap">Progreso</th>
                                <th className="px-6 py-4 text-center whitespace-nowrap text-purple-600">% Esperado</th>
                                <th className="px-6 py-4 text-center whitespace-nowrap">Desviación</th>
                                <th className="px-6 py-4 text-center whitespace-nowrap text-sky-600">En Curso</th>
                                <th className="px-6 py-4 text-center whitespace-nowrap text-emerald-600">Hechas</th>
                                <th className="px-6 py-4 text-center whitespace-nowrap">Total</th>
                                <th className="px-6 py-4 text-right whitespace-nowrap">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredProjects.map((p: any) => {
                                const deviation = p.deviation ?? (p.progress - (p.expectedProgress || 0));
                                const deviationColor = deviation >= 0 ? 'text-emerald-600 bg-emerald-50'
                                    : deviation >= -10 ? 'text-amber-600 bg-amber-50'
                                        : 'text-rose-600 bg-rose-50';
                                const deviationIcon = deviation >= 0 ? '↑' : '↓';

                                return (
                                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800">{p.nombre}</div>
                                            <div className="text-xs text-slate-400 mt-0.5">ID: {p.id}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-slate-700 font-medium">{p.subgerencia || 'General'}</div>
                                            <div className="text-xs text-slate-500">{p.area || '-'}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`text-sm font-black ${p.progress >= 80 ? 'text-emerald-600' : p.progress >= 30 ? 'text-indigo-600' : 'text-slate-500'}`}>
                                                {p.progress}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-sm font-bold text-purple-600">
                                                {p.expectedProgress ?? 0}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 rounded-lg text-xs font-black ${deviationColor}`}>
                                                {deviationIcon} {Math.abs(deviation)}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center font-bold text-sky-600">{p.enCurso || 0}</td>
                                        <td className="px-6 py-4 text-center font-bold text-emerald-600">{p.hechas || 0}</td>
                                        <td className="px-6 py-4 text-center font-bold text-slate-600">{p.totalTasks}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => setSelectedProject(p)}
                                                className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors"
                                            >
                                                Ver Detalle
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredProjects.length === 0 && (
                                <tr><td colSpan={9} className="text-center py-12 text-slate-400">No se encontraron proyectos con ese criterio.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderBlockers = () => (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h3 className="font-bold text-slate-800">Bloqueos Activos ({blockersDetail.length})</h3>
                    <Link to="/app/equipo/bloqueos" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 mt-1">
                        Gestionar <ArrowRight size={12} />
                    </Link>
                </div>
                <div className="relative w-full md:w-64 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar bloqueo..."
                        value={blockerSearch}
                        onChange={e => { setBlockerSearch(e.target.value); setBlockerPage(1); }}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all text-slate-700"
                    />
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-3 font-semibold">Tarea / Proyecto</th>
                            <th className="px-6 py-3 font-semibold">Reportado Por</th>
                            <th className="px-6 py-3 font-semibold">Motivo</th>
                            <th className="px-6 py-3 text-center font-semibold">Antigüedad</th>
                            <th className="px-6 py-3 text-right font-semibold">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {(() => {
                            const filtered = blockersDetail.filter((b: any) =>
                                b.tarea.toLowerCase().includes(blockerSearch.toLowerCase()) ||
                                b.proyecto?.toLowerCase().includes(blockerSearch.toLowerCase()) ||
                                b.usuario?.toLowerCase().includes(blockerSearch.toLowerCase()) ||
                                b.motivo.toLowerCase().includes(blockerSearch.toLowerCase())
                            );
                            const totalPages = Math.ceil(filtered.length / itemsPerPage);
                            const paginated = filtered.slice((blockerPage - 1) * itemsPerPage, blockerPage * itemsPerPage);

                            if (paginated.length === 0) return <tr><td colSpan={5} className="text-center py-12 text-slate-400 italic">No se encontraron bloqueos.</td></tr>;

                            return (
                                <>
                                    {paginated.map((b: any) => (
                                        <tr key={b.id} className="hover:bg-slate-50/50">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-700">{b.tarea}</div>
                                                <div className="text-xs text-slate-400 mt-0.5 font-medium">{b.proyecto || 'General'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 border border-slate-200">
                                                        {(b.usuario || 'U').substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <span className="text-slate-600 text-xs font-medium">{b.usuario}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={b.motivo}>{b.motivo}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${b.dias > 3 ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                                                    {b.dias} días
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Link to="/app/equipo/bloqueos" className="text-indigo-600 hover:text-indigo-800 font-bold text-xs underline decoration-indigo-200 underline-offset-2">Resolver</Link>
                                            </td>
                                        </tr>
                                    ))}
                                    {totalPages > 1 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-3 border-t border-slate-100">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs text-slate-400">Página {blockerPage} de {totalPages}</span>
                                                    <div className="flex gap-2">
                                                        <button disabled={blockerPage === 1} onClick={() => setBlockerPage(p => p - 1)} className="p-1 rounded disabled:opacity-30 hover:bg-slate-100"><ChevronLeft size={16} /></button>
                                                        <button disabled={blockerPage === totalPages} onClick={() => setBlockerPage(p => p + 1)} className="p-1 rounded disabled:opacity-30 hover:bg-slate-100"><ChevronRight size={16} /></button>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            );
                        })()}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderTeam = () => (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h3 className="font-bold text-slate-800">Miembros del Equipo ({miembros.length})</h3>
                    <p className="text-xs text-slate-500 mt-1">Desempeño y estado actual</p>
                </div>
                <div className="relative w-full md:w-64 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar miembro..."
                        value={teamSearch}
                        onChange={e => { setTeamSearch(e.target.value); setTeamPage(1); }}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all text-slate-700"
                    />
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-3 font-semibold">Colaborador</th>
                            <th className="px-6 py-3 font-semibold">Estado de Ánimo</th>
                            <th className="px-6 py-3 text-center font-semibold text-indigo-600">Hoy</th>
                            <th className="px-6 py-3 text-center font-semibold text-sky-600">En Curso</th>
                            <th className="px-6 py-3 text-center font-semibold">Retrasos</th>
                            <th className="px-6 py-3 text-center font-semibold">Bloqueos</th>
                            <th className="px-6 py-3 text-right font-semibold">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {(() => {
                            const filtered = miembros.filter((m: any) =>
                                m.usuario.nombre.toLowerCase().includes(teamSearch.toLowerCase()) ||
                                (m.usuario.area || '').toLowerCase().includes(teamSearch.toLowerCase())
                            );
                            const totalPages = Math.ceil(filtered.length / itemsPerPage);
                            const paginated = filtered.slice((teamPage - 1) * itemsPerPage, teamPage * itemsPerPage);

                            if (paginated.length === 0) return <tr><td colSpan={7} className="text-center py-12 text-slate-400 italic">No se encontraron miembros.</td></tr>;

                            return (
                                <>
                                    {paginated.map((m: any) => (
                                        <tr key={m.usuario.idUsuario} className="hover:bg-slate-50/50">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 border border-slate-200">
                                                        {m.usuario.nombre.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-700">{m.usuario.nombre}</div>
                                                        <div className="text-xs text-slate-400">{m.usuario.area || 'General'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {m.checkin ? (
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${m.checkin.estadoAnimo === 'Tope' ? 'bg-emerald-50 text-emerald-600' : m.checkin.estadoAnimo === 'Bajo' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                                                        {m.checkin.estadoAnimo}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 text-xs italic">Sin reporte</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {(m.tareasHoy || 0) > 0 ? (
                                                    <span className="bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg text-xs font-black animate-pulse">
                                                        {m.tareasHoy}
                                                    </span>
                                                ) : (
                                                    <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded text-xs font-bold">✓</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`font-bold ${(m.tareasEnCurso || 0) > 0 ? 'text-sky-600' : 'text-slate-300'}`}>
                                                    {m.tareasEnCurso || 0}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`font-bold ${m.tareasVencidas > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                                                    {m.tareasVencidas}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {m.bloqueosActivos > 0 ? (
                                                    <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-bold">{m.bloqueosActivos}</span>
                                                ) : (
                                                    <span className="text-slate-300">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => navigate(`/app/agenda/${m.usuario.idUsuario}`)}
                                                    className="text-indigo-600 hover:text-indigo-800 font-bold text-xs underline decoration-indigo-200 underline-offset-2 flex items-center justify-end gap-1 ml-auto"
                                                >
                                                    <ListTodo size={14} />
                                                    Ver Agenda
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {totalPages > 1 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-3 border-t border-slate-100">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs text-slate-400">Página {teamPage} de {totalPages}</span>
                                                    <div className="flex gap-2">
                                                        <button disabled={teamPage === 1} onClick={() => setTeamPage(p => p - 1)} className="p-1 rounded disabled:opacity-30 hover:bg-slate-100"><ChevronLeft size={16} /></button>
                                                        <button disabled={teamPage === totalPages} onClick={() => setTeamPage(p => p + 1)} className="p-1 rounded disabled:opacity-30 hover:bg-slate-100"><ChevronRight size={16} /></button>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            );
                        })()}
                    </tbody>
                </table>
            </div>
        </div>
    );

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
                            { id: 'blockers', label: 'Bloqueos', color: 'amber' },
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

                {/* Member Agenda Modal */}
                {selectedMember && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-slate-50 w-full max-w-[95vw] h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-50 duration-300 border border-slate-200">
                            {/* Modal Header */}
                            <div className="bg-white px-8 py-5 border-b border-slate-200 flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-lg font-bold text-indigo-600 border border-indigo-200 shadow-sm">
                                        {selectedMember.usuario.nombre.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                            Agenda de {selectedMember.usuario.nombre}
                                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] uppercase font-bold tracking-wider border border-slate-200">Modo Edición</span>
                                        </h2>
                                        <p className="text-sm text-slate-500 font-medium">Gestión directa de tareas y prioridades</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all active:scale-95">
                                        <Plus size={16} /> Nueva Tarea
                                    </button>
                                    <div className="h-8 w-px bg-slate-200 mx-2"></div>
                                    <button
                                        onClick={() => setSelectedMember(null)}
                                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Content - Agenda View */}
                            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-slate-50/50">
                                {/* Sidebar Info */}
                                <div className="w-full lg:w-80 bg-white border-r border-slate-200 p-6 overflow-y-auto hidden lg:block">
                                    <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wide">Resumen Semanal</h3>
                                    <div className="space-y-4">
                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                            <div className="text-xs text-slate-400 font-bold uppercase mb-1">Carga de Trabajo</div>
                                            <div className="flex items-end gap-2">
                                                <span className="text-2xl font-black text-slate-800">85%</span>
                                                <span className="text-xs font-bold text-amber-500 mb-1">Alta</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 w-[85%]"></div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                                                <div className="text-2xl font-black text-emerald-600">12</div>
                                                <div className="text-[10px] font-bold text-emerald-700 uppercase">Completadas</div>
                                            </div>
                                            <div className="p-4 bg-white rounded-xl border border-slate-200 text-center">
                                                <div className="text-2xl font-black text-slate-700">5</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase">Pendientes</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-8">
                                        <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wide">Accesos Rápidos</h3>
                                        <div className="space-y-2">
                                            <button className="w-full text-left px-4 py-3 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 text-sm font-medium transition-colors flex items-center gap-3 border border-slate-100 font-bold">
                                                <Calendar size={16} /> Ver Calendario Completo
                                            </button>
                                            <button className="w-full text-left px-4 py-3 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 text-sm font-medium transition-colors flex items-center gap-3 border border-slate-100 font-bold">
                                                <Clock size={16} /> Historial de Actividad
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Tasks Columns */}
                                <div className="flex-1 overflow-x-auto p-6 lg:p-8">
                                    <div className="flex gap-6 h-full min-w-[800px]">
                                        {['Hoy', 'Mañana', 'Esta Semana'].map((col, idx) => (
                                            <div key={idx} className="flex-1 flex flex-col h-full bg-slate-100/50 rounded-2xl border border-slate-200/60 p-1">
                                                <div className="p-3 flex justify-between items-center">
                                                    <h4 className="font-bold text-slate-700 text-sm">{col}</h4>
                                                    <span className="text-xs bg-white px-2 py-0.5 rounded-full text-slate-400 font-bold border border-slate-200">3</span>
                                                </div>
                                                <div className="flex-1 p-2 space-y-3 overflow-y-auto custom-scrollbar">
                                                    {/* Mock Tasks */}
                                                    {[1, 2, 3].map(t => (
                                                        <div key={t} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group relative">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${t === 1 ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                                                    {t === 1 ? 'Alta' : 'Normal'}
                                                                </span>
                                                                <button className="text-slate-300 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <Edit2 size={14} />
                                                                </button>
                                                            </div>
                                                            <div className="font-bold text-slate-700 text-sm mb-1 leading-snug">
                                                                {idx === 0 ? 'Revisión de avances del proyecto Alpha' : idx === 1 ? 'Preparar presentación mensual' : 'Actualizar documentación técnica'}
                                                            </div>
                                                            <div className="text-xs text-slate-400 font-medium truncate">
                                                                Proyecto: {idx === 0 ? 'Alpha' : 'General'}
                                                            </div>
                                                            <div className="mt-3 pt-3 border-t border-slate-50 flex justify-between items-center">
                                                                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded">
                                                                    <Clock size={10} /> 2h est.
                                                                </div>
                                                                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400 border border-slate-200">
                                                                    {selectedMember.usuario.nombre.substring(0, 1)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <button className="w-full py-3 border border-dashed border-slate-300 rounded-xl text-slate-400 text-xs font-bold hover:bg-white hover:border-indigo-300 hover:text-indigo-500 transition-all flex items-center justify-center gap-2">
                                                        <Plus size={14} /> Añadir Tarea
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {!loading || stats ? (
                    <>
                        {activeTab === 'summary' && renderSummary()}
                        {activeTab === 'projects' && renderProjects()}
                        {activeTab === 'blockers' && renderBlockers()}
                        {activeTab === 'team' && renderTeam()}
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
                                            <th className="px-6 py-4 whitespace-nowrap w-1/3">Tarea</th>
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
                                                                    <div className="text-[10px] text-slate-400 mt-1 font-mono">ID: {t.id}</div>
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
                                                        {task.responsable.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <span className="text-slate-600 font-medium text-xs">{task.responsable}</span>
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

