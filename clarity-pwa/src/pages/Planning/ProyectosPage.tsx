// ProyectosPage.tsx
// ✅ “Proyecto” como celda principal (Nombre arriba + metadata abajo)
// ✅ Quité columnas viejas: Gerencia/Subgerencia/Área/Estado/Cronograma/Progreso (ya no van en thead)
// ✅ Pero agregué: Estado + Progreso dentro del bloque “Proyecto” (con iconos y badges)
// ✅ Acciones quedan igual (columna Acción)
// ✅ Paginación real: selector 5/10/12/20/50 + números + primera/última
// ✅ Expanded row se queda (detalle) y ahí muestro campos completos también
// NOTA: Mantengo tu lógica de API + fallback intacta
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    LayoutGrid,
    Search,
    Plus,
    Edit2,
    Lock as LockIcon,
    X,
    Target,
    CheckCircle,
    ChevronDown,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Copy, // Added Copy icon
    MoreHorizontal,
    Download,
    AlertCircle,
} from 'lucide-react';
import Swal from 'sweetalert2';

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
    const [searchParams, setSearchParams] = useSearchParams();
    const [projects, setProjects] = useState<Proyecto[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Clone Logic
    const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
    const [projectToClone, setProjectToClone] = useState<Proyecto | null>(null);
    const [cloneName, setCloneName] = useState('');

    // Init from URL
    const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');

    // =========================
    // PAGINACIÓN
    // =========================
    const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [limit, setLimit] = useState<number>(12);

    // Cuando la API devuelve TODO (sin paginar), paginamos localmente
    const [modoLocalPaging, setModoLocalPaging] = useState(false);
    const [listaCompleta, setListaCompleta] = useState<Proyecto[] | null>(null);

    // =========================
    // FILTROS
    // =========================
    const [filters, setFilters] = useState({
        estado: searchParams.get('estado') || '',
        gerencia: searchParams.get('gerencia') || '',
        subgerencia: searchParams.get('subgerencia') || '',
        area: searchParams.get('area') || '',
        tipo: searchParams.get('tipo') || '',
        fechaInicio: searchParams.get('fechaInicio') || '',
        minProgreso: searchParams.get('minProgreso') || '',
        soloConAtraso: searchParams.get('soloConAtraso') || '',
    });

    // Sync URL - Persistir filtros y paginación para permitir "Regresar" sin perder estado
    useEffect(() => {
        const p: any = {};
        if (page > 1) p.page = page.toString();
        if (searchTerm) p.q = searchTerm;

        // Agregar filtros si tienen valor
        Object.entries(filters).forEach(([key, value]) => {
            if (value) p[key] = value;
        });

        setSearchParams(p, { replace: true });
    }, [page, searchTerm, filters]);

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

    const calculateDelay = (p: Proyecto) => {
        const start = (p as any).fechaInicio ? new Date((p as any).fechaInicio) : null;
        const end = (p as any).fechaFin ? new Date((p as any).fechaFin) : null;
        const progress = Number((p as any).progreso ?? 0);
        const today = new Date();

        if (!start || !end) return 0;
        if (progress >= 100) return 0;
        if (today < start) return 0;

        const totalDuration = end.getTime() - start.getTime();
        const elapsed = today.getTime() - start.getTime();

        if (totalDuration <= 0) return today > end ? 100 - progress : 0;

        const expected = Math.min(100, (elapsed / totalDuration) * 100);
        const delay = Math.max(0, expected - progress);
        return Math.round(delay);
    };

    const renderAtraso = (p: Proyecto) => {
        const delay = calculateDelay(p);
        if (delay <= 0) return <span className="text-[10px] font-bold text-slate-300">0%</span>;

        const color = delay > 30 ? 'text-rose-600 bg-rose-50 border-rose-100' : 'text-amber-600 bg-amber-50 border-amber-100';

        return (
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-black border ${color}`}>
                {delay}%
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
    const aplicarPaginacionLocal = (source: Proyecto[], p: number, lim: number) => {
        setListaCompleta(source);
        setModoLocalPaging(true);

        // FILTRADO LOCAL TIPO DATATABLE
        let filtered = [...source];

        if (searchTerm) {
            const low = searchTerm.toLowerCase();
            filtered = filtered.filter(x => x.nombre.toLowerCase().includes(low));
        }
        if (filters.estado) {
            filtered = filtered.filter(x => (x.estado || '').toLowerCase().includes(filters.estado.toLowerCase()));
        }
        if (filters.gerencia) {
            filtered = filtered.filter(x => x.gerencia === filters.gerencia);
        }
        if (filters.subgerencia) {
            filtered = filtered.filter(x => x.subgerencia === filters.subgerencia);
        }
        if (filters.area) {
            filtered = filtered.filter(x => x.area === filters.area);
        }
        if (filters.tipo) {
            filtered = filtered.filter(x => x.tipo === filters.tipo);
        }
        if (filters.fechaInicio) {
            filtered = filtered.filter(x => (x as any).fechaInicio && (x as any).fechaInicio >= filters.fechaInicio);
        }
        if (filters.minProgreso) {
            const min = Number(filters.minProgreso);
            filtered = filtered.filter(x => Number((x as any).progreso ?? 0) >= min);
        }
        if (filters.soloConAtraso === 'true') {
            filtered = filtered.filter(x => calculateDelay(x) > 0);
        }

        const totalItems = filtered.length;
        const lp = Math.max(1, Math.ceil(totalItems / lim));
        const safePage = Math.min(Math.max(1, p), lp);

        const ini = (safePage - 1) * lim;
        const fin = ini + lim;

        setTotal(totalItems);
        setLastPage(lp);
        setPage(safePage);
        setProjects(filtered.slice(ini, fin));
    };

    const loadProjects = async (p?: number) => {
        setLoading(true);

        const currentPage = p || page;

        try {
            console.log('[Frontend] Requesting projects with:', {
                page: currentPage,
                limit,
                nombre: searchTerm,
                ...filters,
            });

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { fechaInicio: _unused1, minProgreso: _unused2, soloConAtraso: _unused3, ...apiFilters } = filters as any;

            // 1) Intento normal (API paginada) - Fetch everything for fast local filtering
            // IMPORTANT: We fetch WITHOUT searchTerm to have the FULL list in listaCompleta for local filtering
            const result: any = await clarityService.getProyectos({
                page: 1,
                limit: 2000,
                ...apiFilters,
            });

            // CASO A: API devuelve { items, total, lastPage } (paginado real)
            if (result && Array.isArray(result.items)) {
                const items = result.items as Proyecto[];
                const totalItems = Number(result.total ?? items.length);
                const lp = Number(result.lastPage ?? 1);

                // Guardar siempre en listaCompleta para permitir filtrado local posterior
                setListaCompleta(items);

                // Si la API ignora limit o si hay filtros que solo manejamos localmente
                const useLocal = items.length > limit || filters.fechaInicio || filters.minProgreso || filters.soloConAtraso;

                if (useLocal) {
                    aplicarPaginacionLocal(items, currentPage, limit);
                } else {
                    setModoLocalPaging(false);
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

    // React only to limit or hard reloads
    useEffect(() => {
        loadProjects(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [limit]);

    // React to SEARCH and FILTERS locally if possible, or reload
    useEffect(() => {
        if (listaCompleta) {
            aplicarPaginacionLocal(listaCompleta, 1, limit);
        } else {
            loadProjects(1);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm, filters]);

    // =========================
    // HANDLERS PAGINACIÓN
    // =========================
    const handlePageChange = (newPage: number) => {
        const safePage = Math.min(Math.max(1, newPage), lastPage);

        // Si estamos en local paging, aplicamos filtros de nuevo y cortamos
        if (modoLocalPaging && listaCompleta) {
            aplicarPaginacionLocal(listaCompleta, safePage, limit);
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

    const renderPaginationBar = (isTop = false) => {
        if (loading || total === 0) return null;
        return (
            <div className={`${isTop ? 'mb-6' : 'mt-6'} px-6 py-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4 transition-all`}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto text-center sm:text-left">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                        Mostrando <span className="text-slate-900 font-black">{projects.length}</span> de{' '}
                        <span className="text-indigo-600 font-black">{total}</span>
                    </p>

                    <div className="flex items-center justify-center sm:justify-start gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Filas</span>
                        <select
                            value={limit}
                            onChange={e => handleLimitChange(Number(e.target.value))}
                            className="h-8 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-700 outline-none shadow-sm focus:bg-white transition-all"
                        >
                            {LIMITES.map(x => (
                                <option key={x} value={x}>
                                    {x}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => handlePageChange(1)}
                        disabled={page === 1}
                        className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all shadow-sm"
                        title="Primera"
                    >
                        <ChevronsLeft size={16} />
                    </button>

                    <button
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page === 1}
                        className="px-4 h-10 bg-white border border-slate-200 rounded-xl text-[11px] font-black text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all shadow-sm uppercase"
                    >
                        Anterior
                    </button>

                    <div className="hidden sm:flex items-center gap-1.5">
                        {pages.map((x, idx) =>
                            x === '...' ? (
                                <div key={`dots-${idx}`} className="px-2 text-slate-400 font-black">
                                    ...
                                </div>
                            ) : (
                                <button
                                    key={x}
                                    onClick={() => handlePageChange(x)}
                                    className={`min-w-[40px] h-10 px-3 rounded-xl text-[11px] font-black border transition-all shadow-sm ${x === page
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-100'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                        }`}
                                >
                                    {x}
                                </button>
                            )
                        )}
                    </div>

                    <div className="sm:hidden h-10 flex items-center px-4 bg-indigo-600 text-white text-[11px] font-black rounded-xl shadow-md">
                        {page} / {lastPage}
                    </div>

                    <button
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page === lastPage}
                        className="px-4 h-10 bg-white border border-slate-200 rounded-xl text-[11px] font-black text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all shadow-sm uppercase"
                    >
                        Siguiente
                    </button>

                    <button
                        onClick={() => handlePageChange(lastPage)}
                        disabled={page === lastPage}
                        className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all shadow-sm"
                        title="Última"
                    >
                        <ChevronsRight size={16} />
                    </button>
                </div>
            </div>
        );
    };

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
        const result = await Swal.fire({
            title: '¿Eliminar Proyecto?',
            text: `Se eliminará "${p.nombre}" y todas sus tareas asociadas. Nota: Solo se permite eliminar proyectos creados el día de hoy para evitar pérdida accidental de datos históricos.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Sí, eliminar todo',
            cancelButtonText: 'Cancelar',
            reverseButtons: true,
            customClass: {
                popup: 'rounded-2xl border border-slate-200 shadow-2xl'
            }
        });

        if (!result.isConfirmed) return;

        try {
            await clarityService.deleteProyecto(p.idProyecto);

            // Si es local paging, borrar de listaCompleta para que la UI se ajuste bien
            if (modoLocalPaging && listaCompleta) {
                const nueva = listaCompleta.filter(x => x.idProyecto !== p.idProyecto);
                aplicarPaginacionLocal(nueva, page, limit);
            } else {
                loadProjects(page);
            }

            Swal.fire({
                title: 'Proyecto Eliminado',
                text: 'El proyecto y sus dependencias se eliminaron correctamente.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });
        } catch (error: any) {
            console.error('[Delete] Error:', error);
            const msg = error.response?.data?.message || 'No se pudo eliminar el proyecto. Verifique que no tenga tareas de días anteriores o pida asistencia.';

            Swal.fire({
                title: 'No se pudo eliminar',
                text: msg,
                icon: 'error',
                confirmButtonColor: '#4f46e5'
            });
        }
    };

    const handleCloneClick = (p: Proyecto) => {
        setProjectToClone(p);
        setCloneName(`Copia de ${p.nombre}`);
        setIsCloneModalOpen(true);
    };

    const submitClone = async () => {
        if (!projectToClone || !cloneName.trim()) return;
        setSaving(true); // Use saving state for clone operation
        try {
            await clarityService.cloneProyecto(projectToClone.idProyecto, cloneName);
            setIsCloneModalOpen(false);
            setProjectToClone(null);
            setCloneName('');
            showToast('Proyecto clonado con éxito', 'success');
            loadProjects(1); // Reload projects from the first page
        } catch (error) {
            console.error('Error clonando proyecto:', error);
            showToast('Error al clonar el proyecto.', 'error');
        } finally {
            setSaving(false);
        }
    };

    // =========================
    // UI
    // =========================
    return (
        <div className="min-h-screen bg-slate-50 p-4 lg:p-6 pb-20 font-sans">
            <div className="max-w-8xl mx-auto">
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

                {/* VIEWPORT CONTROLLER: MOBILE vs DESKTOP */}
                <div className="space-y-6">

                    {renderPaginationBar(true)}

                    {/* MOBILE VIEW (Search & Cards) */}
                    <div className="md:hidden space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar proyecto..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3.5 border border-slate-200 rounded-2xl bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-slate-700"
                            />
                        </div>

                        {/* Active Filters Summary (Mobile) */}
                        {(searchTerm || Object.values(filters).some(v => v !== '')) && (
                            <div className="flex items-center justify-between bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
                                <span className="text-[10px] font-black text-indigo-600 uppercase">Filtros Activos</span>
                                <button
                                    onClick={() => {
                                        setSearchTerm('');
                                        setFilters({ estado: '', gerencia: '', subgerencia: '', area: '', tipo: '', fechaInicio: '', minProgreso: '', soloConAtraso: '' });
                                    }}
                                    className="text-[10px] font-black text-rose-600 uppercase hover:underline"
                                >
                                    Limpiar Todo
                                </button>
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-4">
                            {loading ? (
                                <div className="py-20 text-center bg-white rounded-2xl border border-slate-100">
                                    <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                    <p className="mt-3 text-slate-400 font-bold text-xs uppercase tracking-widest">Cargando portafolio...</p>
                                </div>
                            ) : projects.length === 0 ? (
                                <div className="p-10 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
                                    <Target size={40} className="mx-auto text-slate-200 mb-4" />
                                    <p className="text-slate-400 italic font-medium">No hay proyectos que coincidan.</p>
                                </div>
                            ) : (
                                projects.map(p => (
                                    <div
                                        key={p.idProyecto}
                                        onClick={() => navigate(`/app/planning/plan-trabajo?projectId=${p.idProyecto}`)}
                                        className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm active:scale-[0.98] transition-all relative group"
                                    >
                                        <div className="flex justify-between items-start gap-4 mb-4">
                                            <div className="flex gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center shrink-0 border border-slate-100 group-active:bg-indigo-50 group-active:text-indigo-500 transition-colors">
                                                    <Target size={24} />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-black text-slate-900 leading-tight mb-1 break-words">{p.nombre}</h3>
                                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-bold text-slate-400 uppercase">
                                                        <span>{p.gerencia || 'Global'}</span>
                                                        <span className="text-slate-200">•</span>
                                                        <span>{p.area || 'N/A'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="relative" onClick={e => e.stopPropagation()}>
                                                <button
                                                    onClick={() => toggleMenu(p.idProyecto)}
                                                    className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                                                >
                                                    <MoreHorizontal size={20} />
                                                </button>

                                                {menuOpen[p.idProyecto] && (
                                                    <div className="absolute right-0 mt-2 w-44 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-20">
                                                        <button onClick={() => { closeMenu(p.idProyecto); navigate(`/app/planning/plan-trabajo?projectId=${p.idProyecto}`); }} className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 border-b border-slate-50">Abrir</button>
                                                        <button onClick={() => { closeMenu(p.idProyecto); openModal(p); }} className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 border-b border-slate-50">Editar</button>
                                                        <button onClick={() => { closeMenu(p.idProyecto); handleDelete(p); }} className="w-full text-left px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50">Eliminar</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-50">
                                            <div className="space-y-1">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado</p>
                                                <span className={`inline-flex px-2 py-0.5 rounded-lg text-[9px] font-black border ${badgeEstado(p.estado)}`}>
                                                    {p.estado}
                                                </span>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Progreso</p>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${p.progreso || 0}%` }} />
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-700">{Math.round(p.progreso || 0)}%</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Delay indicator inline if exists */}
                                        {calculateDelay(p) > 0 && (
                                            <div className="mt-3 bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-lg flex items-center justify-between">
                                                <span className="text-[9px] font-black text-rose-600 uppercase flex items-center gap-1.5">
                                                    <AlertCircle size={10} />
                                                    Atraso Crítico
                                                </span>
                                                <span className="text-[10px] font-black text-rose-600">{calculateDelay(p)}%</span>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* DESKTOP TABLE VIEW */}
                    <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="w-full overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse table-auto">
                                <thead className="bg-slate-50 text-slate-500 font-black border-b border-slate-200 sticky top-0 z-30 text-[10px] uppercase tracking-wider shadow-sm">
                                    <tr>
                                        <th className="px-4 py-4 w-12 text-center"></th>
                                        <th className="px-3 py-4 min-w-[280px]">Proyecto</th>
                                        <th className="px-3 py-4 hidden xl:table-cell">Gerencia</th>
                                        <th className="px-3 py-4 hidden xl:table-cell">Subgerencia</th>
                                        <th className="px-3 py-4 hidden xl:table-cell">Área</th>
                                        <th className="px-3 py-4 hidden lg:table-cell">Tipo</th>
                                        <th className="px-3 py-4 hidden lg:table-cell w-[120px]">Fecha</th>
                                        <th className="px-3 py-4 hidden md:table-cell w-[120px]">Estado</th>
                                        <th className="px-3 py-4 hidden lg:table-cell w-[100px]">Progreso</th>
                                        <th className="px-3 py-4 hidden xl:table-cell w-[100px]">% Atraso</th>
                                        <th className="px-6 py-4 text-right w-[80px]">Acción</th>
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
                                                disabled={!filters.subgerencia}
                                            >
                                                <option value="">TODAS</option>
                                                {filterUniqueAreas.map(a => (
                                                    <option key={a} value={a}>{a}</option>
                                                ))}
                                            </select>
                                        </th>
                                        <th className="px-3 py-2 hidden lg:table-cell">
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
                                        <th className="px-3 py-2 hidden lg:table-cell">
                                            <input
                                                type="date"
                                                className="w-full h-8 px-1 bg-slate-50 border border-slate-200 rounded-lg text-[9px] font-black text-slate-600 outline-none"
                                                value={filters.fechaInicio}
                                                onChange={e => setFilters({ ...filters, fechaInicio: e.target.value })}
                                            />
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
                                        <th className="px-3 py-2 hidden lg:table-cell text-center">
                                            <input
                                                type="number"
                                                placeholder="%"
                                                className="w-full h-8 px-1 bg-slate-50 border border-slate-200 rounded-lg text-[9px] font-black text-slate-600 outline-none text-center"
                                                value={filters.minProgreso}
                                                onChange={e => setFilters({ ...filters, minProgreso: e.target.value })}
                                            />
                                        </th>
                                        <th className="px-3 py-2 hidden xl:table-cell">
                                            <select
                                                className="w-full h-8 px-1 bg-slate-50 border border-slate-200 rounded-lg text-[9px] font-black text-slate-600 outline-none"
                                                value={filters.soloConAtraso}
                                                onChange={e => setFilters({ ...filters, soloConAtraso: e.target.value })}
                                            >
                                                <option value="">TODOS</option>
                                                <option value="true">ATRASO</option>
                                            </select>
                                        </th>
                                        <th className="px-6 py-2 text-right">
                                            <button
                                                onClick={() => {
                                                    setSearchTerm('');
                                                    setFilters({ estado: '', gerencia: '', subgerencia: '', area: '', tipo: '', fechaInicio: '', minProgreso: '', soloConAtraso: '' });
                                                }}
                                                className="p-1 px-2 text-[8px] font-black bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-md transition-colors"
                                                title="Limpiar"
                                            >
                                                RESET
                                            </button>
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={11} className="px-6 py-20 text-center">
                                                <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                                <p className="mt-3 text-slate-400 font-bold text-sm uppercase tracking-widest">Sincronizando...</p>
                                            </td>
                                        </tr>
                                    ) : projects.length === 0 ? (
                                        <tr>
                                            <td colSpan={11} className="px-6 py-20 text-center text-slate-400 italic font-medium">
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
                                                                <div className="lg:hidden text-[10px] text-slate-500 mt-1 uppercase">
                                                                    {(p as any).fechaInicio ? format(new Date((p as any).fechaInicio), 'dd MMM yyyy', { locale: es }) : '-'}
                                                                </div>
                                                            </div>

                                                            {/* SUB-INFO PARA MÓVILES O PANTALLAS PEQUEÑAS */}
                                                            <div className="mt-1 flex xl:hidden flex-wrap items-center gap-2 text-[10px] font-bold text-slate-400 uppercase truncate">
                                                                <span className="truncate max-w-[100px]">{p.gerencia || 'Global'}</span>
                                                                <span className="text-slate-200">/</span>
                                                                <span className="truncate max-w-[100px]">{p.subgerencia || 'General'}</span>
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

                                                    <td className="px-3 py-5 hidden lg:table-cell">
                                                        {p.tipo && (
                                                            <span className="inline-flex px-2 py-0.5 rounded-lg text-[9px] font-black bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase">
                                                                {p.tipo}
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* FECHA (New) */}
                                                    <td className="px-3 py-5 hidden lg:table-cell">
                                                        <span className="text-xs font-bold text-slate-600 uppercase">
                                                            {(p as any).fechaInicio ? format(new Date((p as any).fechaInicio), 'dd MMM yyyy', { locale: es }) : '-'}
                                                        </span>
                                                    </td>

                                                    <td className="px-3 py-5 hidden md:table-cell">
                                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-black border ${badgeEstado(p.estado)}`}>
                                                            {iconoEstado(p.estado)}
                                                            {(p.estado || 'N/A').toUpperCase()}
                                                        </span>
                                                    </td>

                                                    <td className="px-3 py-5 hidden lg:table-cell text-center">
                                                        {renderProgreso(p)}
                                                    </td>

                                                    <td className="px-3 py-5 hidden xl:table-cell text-center">
                                                        {renderAtraso(p)}
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
                                                                            handleCloneClick(p);
                                                                        }}
                                                                        className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                                                    >
                                                                        <Copy size={14} className="text-slate-400" />
                                                                        Clonar
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
                                                {
                                                    expandedRows[p.idProyecto] && (
                                                        <tr className="bg-slate-50/60">
                                                            <td colSpan={11} className="px-6 pb-6">
                                                                <div className="ml-[68px] mt-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                                                                    <p className="text-xs font-black text-slate-400 uppercase mb-2">Descripción</p>
                                                                    <p className="text-sm md:text-base text-slate-700 leading-relaxed">
                                                                        {(p as any).descripcion || 'Sin descripción detallada.'}
                                                                    </p>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )
                                                }
                                            </React.Fragment>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {renderPaginationBar(false)}
                </div>
            </div>

            {/* MODAL CLONAR */}
            {isCloneModalOpen && projectToClone && (
                <>
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 transition-opacity" onClick={() => setIsCloneModalOpen(false)} />
                    <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 p-6 animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-black text-slate-800 mb-4">Clonar Proyecto</h3>
                        <p className="text-sm text-slate-500 mb-4">
                            Se creará una copia del proyecto <strong>{projectToClone.nombre}</strong> con todas sus tareas (estado pendiente, sin responsables).
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nuevo Nombre del Proyecto</label>
                                <input
                                    autoFocus
                                    type="text"
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={cloneName}
                                    onChange={e => setCloneName(e.target.value)}
                                    placeholder="Nombre del nuevo proyecto..."
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 mt-6">
                            <button
                                onClick={() => setIsCloneModalOpen(false)}
                                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={submitClone}
                                disabled={!cloneName.trim()}
                                className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 disabled:shadow-none"
                            >
                                {saving ? 'Clonando...' : 'Clonar Proyecto'}
                            </button>
                        </div>
                    </div>
                </>
            )}

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
                                            <option value="CENAM">CENAM</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Gerencia</label>
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
        </div >
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
