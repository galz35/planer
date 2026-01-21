
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { clarityService } from '../../services/clarity.service';
import { planningService } from '../../services/planning.service';
import type { Proyecto } from '../../types/modelos';
import { format } from 'date-fns';
import {
    LayoutGrid, Search, Plus, Trash2, Edit2, Lock, ArrowRight, Filter, X, Building2, Calendar, Target, CheckCircle
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const ProyectosPage: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();

    // Core List State
    const [projects, setProjects] = useState<Proyecto[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Pagination State
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);

    // Filters State
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        estado: '',
        gerencia: '',
        subgerencia: '',
        area: ''
    });

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Proyecto | null>(null);
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        fechaInicio: '',
        fechaFin: '',
        area: '',
        subgerencia: '',
        gerencia: ''
    });

    const [orgStructure, setOrgStructure] = useState<{ gerencia: string, subgerencia: string, area: string }[]>([]);

    useEffect(() => {
        clarityService.getEstructuraUsuarios()
            .then(res => setOrgStructure(res || []))
            .catch(console.error);
    }, []);

    const loadProjects = async (p?: number) => {
        setLoading(true);
        try {
            const currentPage = p || page;
            const result = await clarityService.getProyectos({
                page: currentPage,
                limit: 12, // Optimal for list view
                nombre: searchTerm,
                ...filters
            });
            if (result) {
                let items = result.items || [];
                let totalItems = result.total || 0;
                let finalLastPage = result.lastPage || 1;

                // Si no hay resultados y no hay filtros activos, intentamos con la API de visibilidad
                if (items.length === 0 && !searchTerm && !filters.estado && !filters.gerencia) {
                    try {
                        const myProjects = await planningService.getMyProjects();
                        if (myProjects && myProjects.length > 0) {
                            // Mapear al formato de Proyecto si es necesario
                            items = myProjects.map(p => ({
                                idProyecto: p.id,
                                nombre: p.nombre,
                                tipo: p.tipo,
                                gerencia: p.gerencia,
                                subgerencia: p.subgerencia,
                                area: p.area,
                                estado: p.estado,
                                fechaInicio: p.fechaInicio,
                                fechaFin: p.fechaFin,
                                progreso: p.progress
                            }));
                            totalItems = items.length;
                            finalLastPage = 1;
                        }
                    } catch (pError) {
                        console.error('Error fetching fallback projects in ProyectosPage:', pError);
                    }
                }

                setProjects(items);
                setTotal(totalItems);
                setLastPage(finalLastPage);
                if (p) setPage(p);
            }
        } catch (error) {
            console.error(error);
            showToast('Error cargando proyectos', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            loadProjects(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, filters]);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= lastPage) {
            setPage(newPage);
            loadProjects(newPage);
        }
    };

    const uniqueGerencias = useMemo(() => {
        return [...new Set(orgStructure.map(x => x.gerencia).filter(Boolean))].sort();
    }, [orgStructure]);

    const filterUniqueSubgerencias = useMemo(() => {
        if (!filters.gerencia) return [];
        return [...new Set(orgStructure
            .filter(x => x.gerencia === filters.gerencia)
            .map(x => x.subgerencia)
            .filter(Boolean)
        )].sort();
    }, [orgStructure, filters.gerencia]);

    const filterUniqueAreas = useMemo(() => {
        if (!filters.gerencia) return [];
        let filtered = orgStructure.filter(x => x.gerencia === filters.gerencia);
        if (filters.subgerencia) {
            filtered = filtered.filter(x => x.subgerencia === filters.subgerencia);
        }
        return [...new Set(filtered.map(x => x.area).filter(Boolean))].sort();
    }, [orgStructure, filters.gerencia, filters.subgerencia]);

    const formUniqueSubgerencias = useMemo(() => {
        if (!formData.gerencia) return [];
        return [...new Set(orgStructure
            .filter(x => x.gerencia === formData.gerencia)
            .map(x => x.subgerencia)
            .filter(Boolean)
        )].sort();
    }, [orgStructure, formData.gerencia]);

    const formUniqueAreas = useMemo(() => {
        if (!formData.subgerencia) return [];
        return [...new Set(orgStructure
            .filter(x => x.gerencia === formData.gerencia && x.subgerencia === formData.subgerencia)
            .map(x => x.area)
            .filter(Boolean)
        )].sort();
    }, [orgStructure, formData.gerencia, formData.subgerencia]);

    const handleCreateOrUpdate = async () => {
        if (!formData.nombre.trim()) return;
        setSaving(true);
        const payload = {
            nombre: formData.nombre,
            descripcion: formData.descripcion,
            fechaInicio: formData.fechaInicio || undefined,
            fechaFin: formData.fechaFin || undefined,
            area: formData.area || undefined,
            subgerencia: formData.subgerencia || undefined,
            gerencia: formData.gerencia || undefined
        };
        try {
            if (editingProject) {
                await clarityService.updateProyecto(editingProject.idProyecto, payload);
                showToast('Proyecto actualizado', 'success');
            } else {
                const newProj: any = await clarityService.postProyecto(formData.nombre, undefined, formData.descripcion);
                await clarityService.updateProyecto(newProj.idProyecto, payload);
                showToast('Proyecto creado', 'success');
            }
            setIsModalOpen(false);
            loadProjects(1);
        } catch (error) {
            showToast('Error guardando proyecto', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (p: Proyecto) => {
        if (!window.confirm(`¿Eliminar proyecto "${p.nombre}"?`)) return;
        try {
            await clarityService.deleteProyecto(p.idProyecto);
            loadProjects(page);
            showToast('Proyecto eliminado', 'success');
        } catch (error) {
            showToast('Error eliminando proyecto', 'error');
        }
    };

    const openModal = (p?: Proyecto) => {
        if (p) {
            setEditingProject(p);
            setFormData({
                nombre: p.nombre,
                descripcion: p.descripcion || '',
                fechaInicio: p.fechaInicio ? format(new Date(p.fechaInicio), 'yyyy-MM-dd') : '',
                fechaFin: p.fechaFin ? format(new Date(p.fechaFin), 'yyyy-MM-dd') : '',
                area: p.area || '',
                subgerencia: p.subgerencia || '',
                gerencia: p.gerencia || ''
            });
        } else {
            setEditingProject(null);
            setFormData({ nombre: '', descripcion: '', fechaInicio: '', fechaFin: '', area: '', subgerencia: '', gerencia: '' });
        }
        setIsModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 lg:p-6 pb-20 font-sans">
            {/* --- HEADER (Inspired by Mi Equipo) --- */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        <LayoutGrid className="w-8 h-8 text-indigo-600" />
                        Portafolio de Proyectos
                    </h1>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider ml-10">Control y Seguimiento Estratégico</p>
                </div>

                <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                    <div className="relative flex-1 lg:flex-none">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar proyecto..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl w-full lg:w-64 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`p-2 border rounded-xl transition-all shadow-sm ${showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        title="Filtros avanzados"
                    >
                        <Filter size={20} />
                    </button>
                    <button
                        onClick={() => openModal()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm shadow-indigo-200"
                    >
                        <Plus size={18} /> Nuevo Proyecto
                    </button>
                </div>
            </div>

            {/* --- FILTERS (Collapsible) --- */}
            {showFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase px-1">Estado</label>
                        <select
                            className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 outline-none"
                            value={filters.estado}
                            onChange={e => setFilters({ ...filters, estado: e.target.value })}
                        >
                            <option value="">Cualquier estado</option>
                            <option value="Activo">Activo</option>
                            <option value="EnCurso">En Curso</option>
                            <option value="Detenido">Detenid...</option>
                            <option value="Terminado">Termina...</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase px-1">Gerencia</label>
                        <select
                            className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 outline-none"
                            value={filters.gerencia}
                            onChange={e => setFilters({ ...filters, gerencia: e.target.value, subgerencia: '', area: '' })}
                        >
                            <option value="">Todas las gerencias</option>
                            {uniqueGerencias.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase px-1">Subgerencia</label>
                        <select
                            className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 outline-none disabled:opacity-50"
                            value={filters.subgerencia}
                            onChange={e => setFilters({ ...filters, subgerencia: e.target.value, area: '' })}
                            disabled={!filters.gerencia}
                        >
                            <option value="">Todas las subgerencias</option>
                            {filterUniqueSubgerencias.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase px-1">Área</label>
                        <select
                            className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 outline-none disabled:opacity-50"
                            value={filters.area}
                            onChange={e => setFilters({ ...filters, area: e.target.value })}
                            disabled={!filters.gerencia}
                        >
                            <option value="">Todas las áreas</option>
                            {filterUniqueAreas.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>
                </div>
            )}

            {/* --- TABLE (Clean & Efficient) --- */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 sticky top-0 z-10 text-[10px] uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 w-[30%]">Proyecto</th>
                                <th className="px-4 py-4 hidden md:table-cell">Organización</th>
                                <th className="px-4 py-4 text-center">Estado</th>
                                <th className="px-4 py-4 hidden sm:table-cell">Cronograma</th>
                                <th className="px-4 py-4 text-center">Progreso</th>
                                <th className="px-6 py-4 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                        <p className="mt-3 text-slate-400 font-bold text-xs uppercase tracking-widest">Sincronizando...</p>
                                    </td>
                                </tr>
                            ) : projects.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center text-slate-400 italic font-medium">
                                        No se encontraron proyectos activos bajo estos criterios.
                                    </td>
                                </tr>
                            ) : (
                                projects.map(p => (
                                    <tr
                                        key={p.idProyecto}
                                        className="hover:bg-indigo-50/40 transition-colors group cursor-pointer"
                                        onClick={() => navigate(`/app/planning/plan-trabajo?projectId=${p.idProyecto}`)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 group-hover:bg-white group-hover:shadow-sm transition-all">
                                                    <Target size={20} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-black text-slate-800 truncate flex items-center gap-2 group-hover:text-indigo-600 transition-colors">
                                                        {p.nombre}
                                                        {(p.enllavado || p.estado === 'Confirmado' || p.estado === 'EnEjecucion') && <Lock size={14} className="text-amber-500" />}
                                                    </div>
                                                    <div className="text-[11px] text-slate-400 font-medium line-clamp-1">{p.descripcion || 'Sin descripción adicional'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 hidden md:table-cell">
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-600">
                                                    <Building2 size={12} className="text-slate-400" />
                                                    {p.gerencia || 'Global'}
                                                </div>
                                                <span className="text-[10px] text-slate-400 font-bold ml-4.5">{p.subgerencia || 'General'}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <div onClick={(e) => e.stopPropagation()}>
                                                {p.estado === 'Borrador' ? (
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            if (window.confirm(`¿Confirmar planificación del proyecto "${p.nombre}"?\n\nEsto bloqueará las fechas y requerirá aprobación para cambios futuros.`)) {
                                                                try {
                                                                    await clarityService.confirmarProyecto(p.idProyecto);
                                                                    showToast('Proyecto confirmado exitosamente', 'success');
                                                                    loadProjects();
                                                                } catch (err) {
                                                                    showToast('Error al confirmar proyecto', 'error');
                                                                }
                                                            }
                                                        }}
                                                        className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-lg hover:bg-emerald-200 transition-colors border border-emerald-200 shadow-sm"
                                                        title="Clic para confirmar planificación"
                                                    >
                                                        <CheckCircle size={12} />
                                                        CONFIRMAR
                                                    </button>
                                                ) : (
                                                    <span className={`inline-flex px-2 py-1 rounded-lg text-[10px] font-black border transition-all ${p.estado === 'Activo' || p.estado === 'EnEjecucion' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                                                        p.estado === 'Confirmado' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                            'bg-slate-100 text-slate-500 border-slate-200'
                                                        }`}>
                                                        {p.estado.toUpperCase()}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 hidden sm:table-cell">
                                            <div className="flex flex-col gap-1 text-[11px] font-bold text-slate-500">
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={12} className="text-indigo-400" />
                                                    {p.fechaInicio ? format(new Date(p.fechaInicio), 'dd MMM yy') : '--'}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-[1px] bg-slate-200 ml-1.5" />
                                                    {p.fechaFin ? format(new Date(p.fechaFin), 'dd MMM yy') : '--'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <div className="flex flex-col items-center gap-1.5">
                                                <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-700 ${(p.progreso || 0) === 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                                                        style={{ width: `${p.progreso || 0}%` }}
                                                    />
                                                </div>
                                                <span className="text-[10px] font-black text-slate-900">{p.progreso || 0}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                                                <button
                                                    onClick={() => openModal(p)}
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-sm rounded-xl border border-transparent hover:border-indigo-100 transition-all"
                                                    title="Configurar"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(p)}
                                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white hover:shadow-sm rounded-xl border border-transparent hover:border-rose-100 transition-all"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/app/planning/plan-trabajo?projectId=${p.idProyecto}`)}
                                                    className="ml-2 w-9 h-9 flex items-center justify-center bg-slate-900 text-white rounded-xl hover:bg-indigo-600 shadow-lg shadow-slate-200 transition-all font-black text-lg"
                                                >
                                                    <ArrowRight size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* --- FOOTER / PAGINATION --- */}
                {!loading && projects.length > 0 && (
                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                            Mostrando <span className="text-slate-900 font-black">{projects.length}</span> de <span className="text-indigo-600 font-black">{total}</span> registros
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handlePageChange(page - 1)}
                                disabled={page === 1}
                                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all shadow-sm"
                            >
                                Anterior
                            </button>
                            <div className="h-8 flex items-center px-4 bg-indigo-600 text-white text-xs font-black rounded-xl shadow-md">
                                {page} / {lastPage}
                            </div>
                            <button
                                onClick={() => handlePageChange(page + 1)}
                                disabled={page === lastPage}
                                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all shadow-sm"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* --- MODAL (Clean Dialog) --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 scale-in-center animate-in zoom-in-95">
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                                    {editingProject ? <Edit2 size={20} /> : <Plus size={20} />}
                                </div>
                                <h2 className="text-lg font-black text-slate-900 tracking-tight">{editingProject ? 'Configurar Proyecto' : 'Nuevo Proyecto'}</h2>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nombre Estratégico</label>
                                <input
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
                                    value={formData.nombre}
                                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                    placeholder="Ej: Transformación Digital 2026"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Objetivo / Descripción</label>
                                <textarea
                                    className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all resize-none shadow-inner"
                                    rows={3}
                                    value={formData.descripcion}
                                    onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                                    placeholder="Resumen ejecutivo del alcance..."
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4 bg-slate-50/50 p-6 rounded-[24px] border border-slate-200">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Gerencia Dueña</label>
                                    <select
                                        className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
                                        value={formData.gerencia}
                                        onChange={e => setFormData({ ...formData, gerencia: e.target.value, subgerencia: '', area: '' })}
                                    >
                                        <option value="">Seleccionar Gerencia...</option>
                                        {uniqueGerencias.map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Subgerencia</label>
                                        <select
                                            className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 disabled:opacity-50"
                                            value={formData.subgerencia}
                                            onChange={e => setFormData({ ...formData, subgerencia: e.target.value, area: '' })}
                                            disabled={!formData.gerencia}
                                        >
                                            <option value="">Seleccionar...</option>
                                            {formUniqueSubgerencias.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Área</label>
                                        <select
                                            className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 disabled:opacity-50"
                                            value={formData.area}
                                            onChange={e => setFormData({ ...formData, area: e.target.value })}
                                            disabled={!formData.subgerencia}
                                        >
                                            <option value="">Seleccionar...</option>
                                            {formUniqueAreas.map(a => <option key={a} value={a}>{a}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-5">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Lanzamiento</label>
                                    <input
                                        type="date"
                                        className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                                        value={formData.fechaInicio}
                                        onChange={e => setFormData({ ...formData, fechaInicio: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cierre Est.</label>
                                    <input
                                        type="date"
                                        className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                                        value={formData.fechaFin}
                                        onChange={e => setFormData({ ...formData, fechaFin: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="px-8 py-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-black text-slate-500 hover:text-slate-800 hover:bg-white rounded-xl transition-all">
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateOrUpdate}
                                disabled={saving}
                                className="px-10 py-2.5 bg-slate-900 text-white font-black rounded-xl hover:bg-indigo-600 shadow-xl shadow-slate-200 transition-all text-sm disabled:opacity-50 flex items-center gap-2"
                            >
                                {saving ? 'Guardando...' : 'Guardar Proyecto'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
