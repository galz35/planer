// ProyectosPage.tsx
// ✅ “Proyecto” como celda principal (Nombre arriba + metadata abajo)
// ✅ Quité columnas viejas: Gerencia/Subgerencia/Área/Estado/Cronograma/Progreso (ya no van en thead)
// ✅ Pero agregué: Estado + Progreso dentro del bloque “Proyecto” (con iconos y badges)
// ✅ Acciones quedan igual (columna Acción)
// ✅ Paginación real: selector 5/10/12/20/50 + números + primera/última
// ✅ Expanded row se queda (detalle) y ahí muestro campos completos también
// NOTA: Mantengo tu lógica de API + fallback intacta
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
    LayoutGrid,
    Search,
    Plus,
    Edit2,
    Lock as LockIcon,
    Filter,
    X,
    Target,
    CheckCircle,
    ChevronDown,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    MoreHorizontal,
    Download,
} from 'lucide-react';

import { clarityService } from '../../services/clarity.service';
import { planningService } from '../../services/planning.service';
import type { Proyecto } from '../../types/modelos';
import { useToast } from '../../context/ToastContext';

const LIMITES = [5, 10, 12, 20, 50];

export const ProyectosPage: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();

    // =========================
    // LISTA + CARGA
    // =========================
    const [projects, setProjects] = useState<Proyecto[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');

    // =========================
    // PAGINACIÓN
    // =========================
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [limit, setLimit] = useState<number>(12);

    // Cuando la API devuelve TODO (sin paginar), paginamos localmente
    const [modoLocalPaging, setModoLocalPaging] = useState(false);
    const [listaCompleta, setListaCompleta] = useState<Proyecto[] | null>(null);

    // =========================
    // FILTROS
    // =========================
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        estado: '',
        gerencia: '',
        subgerencia: '',
        area: '',
        tipo: '',
    });

    // =========================
    // ROW EXPAND
    // =========================
    const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
    const toggleRow = (id: number) => setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));

    // =========================
    // MENÚ ACCIONES (DROPDOWN) - sin <details> para evitar glitches
    // =========================
    const [menuOpen, setMenuOpen] = useState<Record<number, boolean>>({});
    const menuRefs = useRef<Record<number, HTMLDivElement | null>>({});

    const toggleMenu = (id: number) => setMenuOpen(prev => ({ ...prev, [id]: !prev[id] }));
    const closeMenu = (id: number) => setMenuOpen(prev => ({ ...prev, [id]: false }));

    useEffect(() => {
        const onDocClick = (e: MouseEvent) => {
            const target = e.target as Node;

            const algunAbierto = Object.entries(menuOpen).some(([id, open]) => {
                if (!open) return false;
                const ref = menuRefs.current[Number(id)];
                return ref && ref.contains(target);
            });

            if (!algunAbierto) setMenuOpen({});
        };

        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, [menuOpen]);

    // =========================
    // MODAL
    // =========================
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Proyecto | null>(null);
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        fechaInicio: '',
        fechaFin: '',
        area: '',
        subgerencia: '',
        gerencia: '',
        tipo: 'administrativo',
    });

    // Estructura org (para selects)
    const [orgStructure, setOrgStructure] = useState<{ gerencia: string; subgerencia: string; area: string }[]>([]);

    useEffect(() => {
        clarityService
            .getEstructuraUsuarios()
            .then(res => setOrgStructure(res || []))
            .catch(console.error);
    }, []);

    const uniqueGerencias = useMemo(() => {
        return [...new Set(orgStructure.map(x => x.gerencia).filter(Boolean))].sort();
    }, [orgStructure]);

    const filterUniqueSubgerencias = useMemo(() => {
        if (!filters.gerencia) return [];
        return [...new Set(orgStructure.filter(x => x.gerencia === filters.gerencia).map(x => x.subgerencia).filter(Boolean))].sort();
    }, [orgStructure, filters.gerencia]);

    const filterUniqueAreas = useMemo(() => {
        if (!filters.gerencia) return [];
        let filtered = orgStructure.filter(x => x.gerencia === filters.gerencia);
        if (filters.subgerencia) filtered = filtered.filter(x => x.subgerencia === filters.subgerencia);
        return [...new Set(filtered.map(x => x.area).filter(Boolean))].sort();
    }, [orgStructure, filters.gerencia, filters.subgerencia]);

    const formUniqueSubgerencias = useMemo(() => {
        if (!formData.gerencia) return [];
        return [...new Set(orgStructure.filter(x => x.gerencia === formData.gerencia).map(x => x.subgerencia).filter(Boolean))].sort();
    }, [orgStructure, formData.gerencia]);

    const formUniqueAreas = useMemo(() => {
        if (!formData.subgerencia) return [];
        return [...new Set(orgStructure.filter(x => x.gerencia === formData.gerencia && x.subgerencia === formData.subgerencia).map(x => x.area).filter(Boolean))].sort();
    }, [orgStructure, formData.gerencia, formData.subgerencia]);

    // =========================
    // HELPERS UI (Estado / Progreso)
    // =========================
    const badgeEstado = (estado?: string) => {
        const e = (estado || '').toLowerCase();

        if (e.includes('borrador')) return 'bg-amber-50 text-amber-700 border-amber-200';
        if (e.includes('activo') || e.includes('enejecucion') || e.includes('encurso')) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
        if (e.includes('deten')) return 'bg-rose-50 text-rose-700 border-rose-200';
        if (e.includes('termin') || e.includes('final')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (e.includes('confirm')) return 'bg-slate-100 text-slate-700 border-slate-200';

        return 'bg-slate-100 text-slate-600 border-slate-200';
    };

    const iconoEstado = (estado?: string) => {
        const e = (estado || '').toLowerCase();

        if (e.includes('borrador')) return <CheckCircle size={14} className="text-amber-600" />;
        if (e.includes('activo') || e.includes('enejecucion') || e.includes('encurso')) return <Target size={14} className="text-indigo-600" />;
        if (e.includes('deten')) return <X size={14} className="text-rose-600" />;
        if (e.includes('termin') || e.includes('final')) return <CheckCircle size={14} className="text-emerald-600" />;
        if (e.includes('confirm')) return <LockIcon size={14} className="text-slate-600" />;

        return <Target size={14} className="text-slate-500" />;
    };

    const renderProgreso = (p: Proyecto) => {
        const prog = Number((p as any).progreso ?? 0);
        if (!Number.isFinite(prog)) return null;

        // Chip progreso
        const clase =
            prog >= 100 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200';

        return (
            <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-xl text-xs font-black border ${clase}`}>
                <span className="w-2 h-2 rounded-full bg-current opacity-60" />
                {prog}%
            </span>
        );
    };
    /* ✅ Alternativa limpia (si quieres tipado fuerte) */
    const setMenuRef = (id: number) => (el: HTMLDivElement | null) => {
        menuRefs.current[id] = el;
    };
    // =========================
    // CARGA DE PROYECTOS (SOLUCIÓN A “PAGINACIÓN NO FUNCIONA”)
    // - Si la API NO pagina (devuelve array completo), activamos modoLocalPaging
    // - Guardamos listaCompleta y hacemos slice por page/limit
    // =========================
    const aplicarPaginacionLocal = (all: Proyecto[], p: number, lim: number) => {
        const totalItems = all.length;
        const lp = Math.max(1, Math.ceil(totalItems / lim));
        const safePage = Math.min(Math.max(1, p), lp);

        const ini = (safePage - 1) * lim;
        const fin = ini + lim;

        setModoLocalPaging(true);
        setListaCompleta(all);
        setTotal(totalItems);
        setLastPage(lp);
        setPage(safePage);
        setProjects(all.slice(ini, fin));
    };

    const loadProjects = async (p?: number) => {
        setLoading(true);

        const currentPage = p || page;

        try {
            // 1) Intento normal (API paginada)
            const result: any = await clarityService.getProyectos({
                page: currentPage,
                limit,
                nombre: searchTerm,
                ...filters,
            });

            // CASO A: API devuelve { items, total, lastPage } (paginado real)
            if (result && Array.isArray(result.items)) {
                const items = result.items as Proyecto[];
                const totalItems = Number(result.total ?? items.length);
                const lp = Number(result.lastPage ?? 1);

                // Si la API ignora limit y nos devuelve todo (o demasiado),
                // activamos paginación local para que el UI funcione bien.
                const pareceNoPaginado = items.length > limit && (lp === 1 || totalItems === items.length);

                if (pareceNoPaginado) {
                    aplicarPaginacionLocal(items, currentPage, limit);
                } else {
                    setModoLocalPaging(false);
                    setListaCompleta(null);

                    setProjects(items);
                    setTotal(totalItems);
                    setLastPage(Math.max(1, lp));
                    if (p) setPage(p);
                }

                setLoading(false);
                return;
            }

            // CASO B: API devuelve array directo (sin wrapper)
            if (Array.isArray(result)) {
                aplicarPaginacionLocal(result as Proyecto[], currentPage, limit);
                setLoading(false);
                return;
            }

            // 2) Fallback: planningService.getMyProjects (también paginación local)
            const myProjects: any[] = await planningService.getMyProjects();
            if (myProjects && myProjects.length > 0) {
                const mapped: Proyecto[] = myProjects.map(x => ({
                    idProyecto: x.id,
                    nombre: x.nombre,
                    tipo: x.tipo,
                    gerencia: x.gerencia,
                    subgerencia: x.subgerencia,
                    area: x.area,
                    estado: x.estado,
                    fechaInicio: x.fechaInicio,
                    fechaFin: x.fechaFin,
                    progreso: x.progress,
                    descripcion: x.descripcion,
                })) as any;

                aplicarPaginacionLocal(mapped, currentPage, limit);
                setLoading(false);
                return;
            }

            // Nada
            setProjects([]);
            setTotal(0);
            setLastPage(1);
            setPage(1);
        } catch (error) {
            console.error(error);
            showToast('Error cargando proyectos', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Debounce cuando cambian filtros/búsqueda/limit => reset + recargar
    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1);
            setModoLocalPaging(false);
            setListaCompleta(null);
            loadProjects(1);
        }, 250);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm, filters, limit]);

    // =========================
    // HANDLERS PAGINACIÓN
    // =========================
    const handlePageChange = (newPage: number) => {
        const safePage = Math.min(Math.max(1, newPage), lastPage);

        // Si estamos en local paging, NO pegamos a API: solo slice
        if (modoLocalPaging && listaCompleta) {
            const ini = (safePage - 1) * limit;
            const fin = ini + limit;

            setPage(safePage);
            setProjects(listaCompleta.slice(ini, fin));
            return;
        }

        setPage(safePage);
        loadProjects(safePage);
    };

    const handleLimitChange = (newLimit: number) => {
        setLimit(newLimit);

        // Si local paging, recalcular inmediatamente
        if (modoLocalPaging && listaCompleta) {
            aplicarPaginacionLocal(listaCompleta, 1, newLimit);
            return;
        }

        // En paginación real, el useEffect dispara recarga
    };

    // pages con ellipsis
    const pages = useMemo(() => {
        const lp = Math.max(1, lastPage);
        const p = Math.min(Math.max(1, page), lp);

        const out: Array<number | '...'> = [];
        const windowSize = 1;

        const push = (v: number | '...') => out.push(v);

        push(1);
        if (p - windowSize > 2) push('...');

        for (let i = Math.max(2, p - windowSize); i <= Math.min(lp - 1, p + windowSize); i++) push(i);

        if (p + windowSize < lp - 1) push('...');
        if (lp > 1) push(lp);

        // remover duplicados simples
        return out.filter((v, idx) => out.indexOf(v) === idx);
    }, [page, lastPage]);

    const handleExportExcel = () => {
        if (!projects || projects.length === 0) {
            showToast('No hay datos para exportar', 'warning');
            return;
        }

        const headers = ['ID', 'Proyecto', 'Descripción', 'Estado', 'Progreso', 'Tipo', 'Gerencia', 'Subgerencia', 'Área', 'F. Inicio', 'F. Fin'];
        const rows = projects.map(p => [
            p.idProyecto,
            p.nombre,
            (p as any).descripcion || '',
            p.estado || '',
            (p.progreso || 0) + '%',
            p.tipo || 'administrativo',
            p.gerencia || '',
            p.subgerencia || '',
            p.area || '',
            (p as any).fechaInicio ? format(new Date((p as any).fechaInicio), 'yyyy-MM-dd') : '',
            (p as any).fechaFin ? format(new Date((p as any).fechaFin), 'yyyy-MM-dd') : ''
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Proyectos_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Archivo CSV generado', 'success');
    };

    // =========================
    // MODAL: CRUD
    // =========================
    const openModal = (p?: Proyecto) => {
        if (p) {
            setEditingProject(p);
            setFormData({
                nombre: p.nombre,
                descripcion: (p as any).descripcion || '',
                fechaInicio: (p as any).fechaInicio ? format(new Date((p as any).fechaInicio), 'yyyy-MM-dd') : '',
                fechaFin: (p as any).fechaFin ? format(new Date((p as any).fechaFin), 'yyyy-MM-dd') : '',
                area: p.area || '',
                subgerencia: p.subgerencia || '',
                gerencia: p.gerencia || '',
                tipo: p.tipo || 'administrativo',
            });
        } else {
            setEditingProject(null);
            setFormData({ nombre: '', descripcion: '', fechaInicio: '', fechaFin: '', area: '', subgerencia: '', gerencia: '', tipo: 'administrativo' });
        }
        setIsModalOpen(true);
    };

    const handleCreateOrUpdate = async () => {
        if (!formData.nombre.trim()) return;

        setSaving(true);

        const payload: any = {
            nombre: formData.nombre,
            descripcion: formData.descripcion,
            fechaInicio: (formData as any).fechaInicio || undefined,
            fechaFin: (formData as any).fechaFin || undefined,
            area: formData.area || undefined,
            subgerencia: formData.subgerencia || undefined,
            gerencia: formData.gerencia || undefined,
            tipo: formData.tipo || 'administrativo',
        };

        try {
            if (editingProject) {
                await clarityService.updateProyecto(editingProject.idProyecto, payload);
                showToast('Proyecto actualizado', 'success');
            } else {
                const newProj: any = await clarityService.postProyecto(formData.nombre, undefined, formData.descripcion, formData.tipo);
                await clarityService.updateProyecto(newProj.idProyecto, payload);
                showToast('Proyecto creado', 'success');
            }

            setIsModalOpen(false);
            loadProjects(1);
        } catch (error) {
            console.error(error);
            showToast('Error guardando proyecto', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (p: Proyecto) => {
        if (!window.confirm(`¿Eliminar proyecto "${p.nombre}"?`)) return;

        try {
            await clarityService.deleteProyecto(p.idProyecto);

            // Si es local paging, borrar de listaCompleta para que la UI se ajuste bien
            if (modoLocalPaging && listaCompleta) {
                const nueva = listaCompleta.filter(x => x.idProyecto !== p.idProyecto);
                aplicarPaginacionLocal(nueva, page, limit);
            } else {
                loadProjects(page);
            }

            showToast('Proyecto eliminado', 'success');
        } catch (error) {
            console.error(error);
            showToast('Error eliminando proyecto', 'error');
        }
    };

    // =========================
    // UI
    // =========================
    return (
        <div className="min-h-screen bg-slate-50 p-4 lg:p-6 pb-20 font-sans">
            {/* HEADER */}
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
                        className={`p-2 border rounded-xl transition-all shadow-sm ${showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                        title="Filtros avanzados"
                    >
                        <Filter size={20} />
                    </button>

                    <button
                        onClick={handleExportExcel}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm shadow-emerald-200"
                        title="Exportar a CSV/Excel"
                    >
                        <Download size={18} /> Exportar
                    </button>

                    <button
                        onClick={() => openModal()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm shadow-indigo-200"
                    >
                        <Plus size={18} /> Nuevo Proyecto
                    </button>
                </div>
            </div>

            {/* FILTROS */}
            {showFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-4 animate-in slide-in-from-top-2 duration-200">
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
                            <option value="Detenido">Detenido</option>
                            <option value="Terminado">Terminado</option>
                            <option value="Borrador">Borrador</option>
                            <option value="Confirmado">Confirmado</option>
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase px-1">Tipo</label>
                        <select
                            className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 outline-none"
                            value={filters.tipo}
                            onChange={e => setFilters({ ...filters, tipo: e.target.value })}
                        >
                            <option value="">Cualquier tipo</option>
                            <option value="administrativo">Administrativo</option>
                            <option value="Logistica">Logística</option>
                            <option value="AMX">AMX</option>
                            <option value="Estrategico">Estratégico</option>
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
                            {uniqueGerencias.map(g => (
                                <option key={g} value={g}>
                                    {g}
                                </option>
                            ))}
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
                            {filterUniqueSubgerencias.map(s => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
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
                            {filterUniqueAreas.map(a => (
                                <option key={a} value={a}>
                                    {a}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {/* TABLA */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto min-h-[420px]">
                    <table className="w-full text-left border-collapse table-fixed">
                        <thead className="bg-slate-50 text-slate-500 font-black border-b border-slate-200 sticky top-0 z-30 text-[10px] uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-4 w-12 text-center"></th>
                                <th className="px-3 py-4 w-[25%] lg:w-[30%]">Proyecto</th>
                                <th className="px-3 py-4 hidden xl:table-cell">Gerencia</th>
                                <th className="px-3 py-4 hidden xl:table-cell">Subgerencia</th>
                                <th className="px-3 py-4 hidden xl:table-cell">Área</th>
                                <th className="px-3 py-4 hidden md:table-cell">Tipo</th>
                                <th className="px-3 py-4 hidden md:table-cell w-[120px]">Estado</th>
                                <th className="px-3 py-4 hidden md:table-cell w-[120px]">Progreso</th>
                                <th className="px-6 py-4 text-right w-[100px]">Acción</th>
                            </tr>
                            {/* FILTROS POR COLUMNA (Datatable style) */}
                            <tr className="bg-white border-b border-slate-100">
                                <th className="px-4 py-2"></th>
                                <th className="px-3 py-2">
                                    <div className="relative">
                                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300" size={12} />
                                        <input
                                            type="text"
                                            placeholder="Filtrar..."
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            className="w-full pl-7 pr-2 py-1.5 text-[10px] font-bold border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                                        />
                                    </div>
                                </th>
                                <th className="px-3 py-2 hidden xl:table-cell">
                                    <select
                                        className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-[9px] font-black text-slate-600 outline-none"
                                        value={filters.gerencia}
                                        onChange={e => setFilters({ ...filters, gerencia: e.target.value, subgerencia: '', area: '' })}
                                    >
                                        <option value="">TODAS</option>
                                        {uniqueGerencias.map(g => (
                                            <option key={g} value={g}>{g}</option>
                                        ))}
                                    </select>
                                </th>
                                <th className="px-3 py-2 hidden xl:table-cell">
                                    <select
                                        className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-[9px] font-black text-slate-600 outline-none disabled:opacity-50"
                                        value={filters.subgerencia}
                                        onChange={e => setFilters({ ...filters, subgerencia: e.target.value, area: '' })}
                                        disabled={!filters.gerencia}
                                    >
                                        <option value="">TODAS</option>
                                        {filterUniqueSubgerencias.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </th>
                                <th className="px-3 py-2 hidden xl:table-cell">
                                    <select
                                        className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-[9px] font-black text-slate-600 outline-none disabled:opacity-50"
                                        value={filters.area}
                                        onChange={e => setFilters({ ...filters, area: e.target.value })}
                                        disabled={!filters.gerencia}
                                    >
                                        <option value="">TODAS</option>
                                        {filterUniqueAreas.map(a => (
                                            <option key={a} value={a}>{a}</option>
                                        ))}
                                    </select>
                                </th>
                                <th className="px-3 py-2 hidden md:table-cell">
                                    <select
                                        className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-[9px] font-black text-slate-600 outline-none"
                                        value={filters.tipo}
                                        onChange={e => setFilters({ ...filters, tipo: e.target.value })}
                                    >
                                        <option value="">TODOS</option>
                                        <option value="administrativo">ADMIN</option>
                                        <option value="Logistica">LOGISTICA</option>
                                        <option value="AMX">AMX</option>
                                        <option value="Estrategico">ESTRAT.</option>
                                    </select>
                                </th>
                                <th className="px-3 py-2 hidden md:table-cell">
                                    <select
                                        className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-[9px] font-black text-slate-600 outline-none"
                                        value={filters.estado}
                                        onChange={e => setFilters({ ...filters, estado: e.target.value })}
                                    >
                                        <option value="">TODOS</option>
                                        <option value="Activo">ACTIVO</option>
                                        <option value="Terminado">HECHO</option>
                                        <option value="Borrador">BORRADOR</option>
                                        <option value="Detenido">PAUSA</option>
                                    </select>
                                </th>
                                <th className="px-3 py-2 hidden md:table-cell"></th>
                                <th className="px-6 py-2 text-right">
                                    <button
                                        onClick={() => {
                                            setSearchTerm('');
                                            setFilters({ estado: '', gerencia: '', subgerencia: '', area: '', tipo: '' });
                                        }}
                                        className="p-1 px-2 text-[9px] font-black bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-md transition-colors"
                                        title="Limpiar filtros"
                                    >
                                        LIMPIAR
                                    </button>
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-20 text-center">
                                        <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                        <p className="mt-3 text-slate-400 font-bold text-sm uppercase tracking-widest">Sincronizando...</p>
                                    </td>
                                </tr>
                            ) : projects.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-20 text-center text-slate-400 italic font-medium">
                                        No se encontraron proyectos bajo estos criterios.
                                    </td>
                                </tr>
                            ) : (
                                projects.map(p => (
                                    <React.Fragment key={p.idProyecto}>
                                        <tr
                                            tabIndex={0}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') navigate(`/app/planning/plan-trabajo?projectId=${p.idProyecto}`);
                                            }}
                                            className="group cursor-pointer transition-colors hover:bg-indigo-50/40 focus:outline-none focus:bg-indigo-50/60"
                                            onClick={() => navigate(`/app/planning/plan-trabajo?projectId=${p.idProyecto}`)}
                                        >
                                            {/* EXPAND */}
                                            <td
                                                className="px-4 py-5 align-top"
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    toggleRow(p.idProyecto);
                                                }}
                                            >
                                                <button
                                                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-700 transition-all"
                                                    title="Ver detalle"
                                                >
                                                    {expandedRows[p.idProyecto] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                                </button>
                                            </td>

                                            {/* PROYECTO */}
                                            <td className="px-3 py-5">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 group-hover:bg-white group-hover:shadow-sm transition-all">
                                                        <Target size={22} />
                                                    </div>

                                                    <div className="min-w-0 flex-1 overflow-hidden">
                                                        {/* NOMBRE */}
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <div className="font-black text-slate-900 break-words whitespace-normal group-hover:text-indigo-700 transition-colors text-sm" title={p.nombre}>
                                                                {p.nombre}
                                                            </div>

                                                            {(p.enllavado || p.estado === 'Confirmado' || p.estado === 'EnEjecucion') && (
                                                                <LockIcon size={14} className="text-amber-500 shrink-0" />
                                                            )}
                                                        </div>

                                                        {/* SUB-INFO PARA MÓVILES O PANTALLAS PEQUEÑAS */}
                                                        <div className="mt-1 flex xl:hidden flex-wrap items-center gap-2 text-[10px] font-bold text-slate-400 uppercase truncate">
                                                            <span className="truncate max-w-[100px]">{p.gerencia || 'Global'}</span>
                                                            <span className="text-slate-200">/</span>
                                                            <span className="truncate max-w-[100px]">{p.subgerencia || 'General'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* COLUMNAS EXCEL-STYLE */}
                                            <td className="px-3 py-5 hidden xl:table-cell">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                                    <span className="text-xs font-bold text-slate-600 truncate max-w-[150px]">{p.gerencia || 'N/A'}</span>
                                                </div>
                                            </td>

                                            <td className="px-3 py-5 hidden xl:table-cell">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-1 h-3 bg-indigo-100 rounded-full" />
                                                    <span className="text-xs font-bold text-slate-500 truncate max-w-[150px]">{p.subgerencia || 'N/A'}</span>
                                                </div>
                                            </td>

                                            <td className="px-3 py-5 hidden xl:table-cell">
                                                <span className="text-xs font-bold text-slate-600 uppercase tracking-tighter text-[10px]">{p.area || 'N/A'}</span>
                                            </td>

                                            <td className="px-3 py-5 hidden md:table-cell">
                                                {p.tipo && (
                                                    <span className="inline-flex px-2 py-0.5 rounded-lg text-[9px] font-black bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase">
                                                        {p.tipo}
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-3 py-5 hidden md:table-cell">
                                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-black border ${badgeEstado(p.estado)}`}>
                                                    {iconoEstado(p.estado)}
                                                    {(p.estado || 'N/A').toUpperCase()}
                                                </span>
                                            </td>

                                            <td className="px-3 py-5 hidden md:table-cell">
                                                <div className="w-full max-w-[80px]">
                                                    {renderProgreso(p)}
                                                </div>
                                            </td>

                                            {/* ACCIÓN (dropdown real) */}
                                            <td className="px-6 py-5 text-right align-top">
                                                <div
                                                    ref={setMenuRef(p.idProyecto)}
                                                    className="relative inline-block"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button
                                                        onClick={() => toggleMenu(p.idProyecto)}
                                                        className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm"
                                                        title="Acciones"
                                                    >
                                                        <MoreHorizontal size={18} />
                                                    </button>

                                                    {menuOpen[p.idProyecto] && (
                                                        <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-20">
                                                            <button
                                                                onClick={() => {
                                                                    closeMenu(p.idProyecto);
                                                                    navigate(`/app/planning/plan-trabajo?projectId=${p.idProyecto}`);
                                                                }}
                                                                className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-indigo-50"
                                                            >
                                                                Abrir plan
                                                            </button>

                                                            <button
                                                                onClick={() => {
                                                                    closeMenu(p.idProyecto);
                                                                    openModal(p);
                                                                }}
                                                                className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                                                            >
                                                                Editar
                                                            </button>

                                                            <button
                                                                onClick={() => {
                                                                    closeMenu(p.idProyecto);
                                                                    handleDelete(p);
                                                                }}
                                                                className="w-full text-left px-4 py-3 text-sm font-bold text-rose-700 hover:bg-rose-50"
                                                            >
                                                                Eliminar
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>

                                        {/* EXPANDED: SOLO DESCRIPCIÓN */}
                                        {expandedRows[p.idProyecto] && (
                                            <tr className="bg-slate-50/60">
                                                <td colSpan={9} className="px-6 pb-6">
                                                    <div className="ml-[68px] mt-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                                                        <p className="text-xs font-black text-slate-400 uppercase mb-2">Descripción</p>
                                                        <p className="text-sm md:text-base text-slate-700 leading-relaxed">
                                                            {(p as any).descripcion || 'Sin descripción detallada.'}
                                                        </p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PAGINACIÓN COMPLETA (FUNCIONA EN API PAGINADA Y EN LOCAL PAGING) */}
                {!loading && total > 0 && (
                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-col lg:flex-row items-center justify-between gap-3">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto">
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                Mostrando <span className="text-slate-900 font-black">{projects.length}</span> de{' '}
                                <span className="text-indigo-600 font-black">{total}</span> registros
                            </p>

                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase">Filas</span>
                                <select
                                    value={limit}
                                    onChange={e => handleLimitChange(Number(e.target.value))}
                                    className="h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700 outline-none shadow-sm"
                                >
                                    {LIMITES.map(x => (
                                        <option key={x} value={x}>
                                            {x}
                                        </option>
                                    ))}
                                </select>

                                {modoLocalPaging && (
                                    <span className="ml-2 text-[10px] font-black px-2 py-1 rounded-lg bg-slate-200 text-slate-700">
                                        LOCAL
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handlePageChange(1)}
                                disabled={page === 1}
                                className="w-10 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all shadow-sm"
                                title="Primera"
                            >
                                <ChevronsLeft size={16} />
                            </button>

                            <button
                                onClick={() => handlePageChange(page - 1)}
                                disabled={page === 1}
                                className="px-4 h-9 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all shadow-sm"
                            >
                                Anterior
                            </button>

                            <div className="hidden sm:flex items-center gap-1">
                                {pages.map((x, idx) =>
                                    x === '...' ? (
                                        <div key={`dots-${idx}`} className="px-2 text-slate-400 font-black">
                                            ...
                                        </div>
                                    ) : (
                                        <button
                                            key={x}
                                            onClick={() => handlePageChange(x)}
                                            className={`min-w-[38px] h-9 px-3 rounded-xl text-xs font-black border transition-all shadow-sm ${x === page
                                                ? 'bg-indigo-600 text-white border-indigo-600'
                                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                                }`}
                                        >
                                            {x}
                                        </button>
                                    )
                                )}
                            </div>

                            <div className="sm:hidden h-9 flex items-center px-4 bg-indigo-600 text-white text-xs font-black rounded-xl shadow-md">
                                {page} / {lastPage}
                            </div>

                            <button
                                onClick={() => handlePageChange(page + 1)}
                                disabled={page === lastPage}
                                className="px-4 h-9 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all shadow-sm"
                            >
                                Siguiente
                            </button>

                            <button
                                onClick={() => handlePageChange(lastPage)}
                                disabled={page === lastPage}
                                className="w-10 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all shadow-sm"
                                title="Última"
                            >
                                <ChevronsRight size={16} />
                            </button>

                            <div className="hidden md:flex h-9 items-center px-4 bg-slate-900 text-white text-xs font-black rounded-xl shadow-sm">
                                {page} / {lastPage}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 scale-in-center animate-in zoom-in-95">
                            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                                        {editingProject ? <Edit2 size={20} /> : <Plus size={20} />}
                                    </div>
                                    <h2 className="text-lg font-black text-slate-900 tracking-tight">{editingProject ? 'Configurar Proyecto' : 'Nuevo Proyecto'}</h2>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                                >
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
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tipo de Proyecto</label>
                                        <select
                                            className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
                                            value={formData.tipo}
                                            onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                                        >
                                            <option value="administrativo">Administrativo</option>
                                            <option value="Logistica">Logística</option>
                                            <option value="AMX">AMX</option>
                                            <option value="Estrategico">Estratégico</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Gerencia Dueña</label>
                                        <select
                                            className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
                                            value={formData.gerencia}
                                            onChange={e => setFormData({ ...formData, gerencia: e.target.value, subgerencia: '', area: '' })}
                                        >
                                            <option value="">Seleccionar Gerencia...</option>
                                            {uniqueGerencias.map(g => (
                                                <option key={g} value={g}>
                                                    {g}
                                                </option>
                                            ))}
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
                                                {formUniqueSubgerencias.map(s => (
                                                    <option key={s} value={s}>
                                                        {s}
                                                    </option>
                                                ))}
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
                                                {formUniqueAreas.map(a => (
                                                    <option key={a} value={a}>
                                                        {a}
                                                    </option>
                                                ))}
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
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-2.5 text-sm font-black text-slate-500 hover:text-slate-800 hover:bg-white rounded-xl transition-all"
                                >
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
                )
            }
        </div>
    );
};


/*
CÓMO ENTENDÍ TU PEDIDO (resumen real)
- Querías: “Proyecto” como celda principal con el nombre arriba y debajo ver “cómo se mira” el resto.
- Luego pediste: quitar columnas viejas (ya no quieres thead con Gerencia/Subgerencia/Área/Estado).
- Pero sí querías mostrar Estado + Progreso ahí mismo dentro de la celda Proyecto con icono/badge.
- Y que la columna Acción quedara igual (botones a la derecha).
Eso fue lo que apliqué.
*/
