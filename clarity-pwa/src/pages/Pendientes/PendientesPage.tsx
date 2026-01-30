import React, { useEffect, useState, useMemo } from 'react';
import { TopBar } from '../../components/layout/TopBar';
import type { Tarea, Proyecto } from '../../types/modelos';
import { Plus, Inbox, MoreHorizontal, Play, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { clarityService } from '../../services/clarity.service';
import { TaskDetailModalV2 as ReadTaskDetailModal } from '../../components/task-detail-v2/TaskDetailModalV2';
import { StatusBadge } from '../../components/ui/StatusBadge';

export const PendientesPage: React.FC = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [tasks, setTasks] = useState<Tarea[]>([]);
    const [projects, setProjects] = useState<Proyecto[]>([]);
    const [loading, setLoading] = useState(true);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState<number | '' | 'all'>('all');
    const [creationProjectId, setCreationProjectId] = useState<number | ''>(''); // Proyecto destino al crear
    const [selectedTask, setSelectedTask] = useState<Tarea | null>(null);
    const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
    const [menuPos, setMenuPos] = useState<{ top: number, right: number } | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // Filters & Pagination
    const [searchTerm, setSearchTerm] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Sorting State
    const [sortConfig, setSortConfig] = useState<{ key: keyof Tarea | 'proyecto'; direction: 'asc' | 'desc' }>({
        key: 'idTarea',
        direction: 'desc'
    });

    const handleSort = (key: keyof Tarea | 'proyecto') => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Filter tasks based on selected project, search, and priority
    const filteredTasks = useMemo(() => {
        let result = [...tasks];

        // Project Filter
        if (selectedProjectId !== 'all') {
            if (selectedProjectId === '') result = result.filter(t => !t.idProyecto);
            else result = result.filter(t => t.idProyecto === selectedProjectId);
        }

        // Priority Filter
        if (priorityFilter !== 'all') {
            result = result.filter(t => t.prioridad === priorityFilter);
        }

        // Search Filter
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(t =>
                t.titulo.toLowerCase().includes(lower) ||
                (t.descripcion || '').toLowerCase().includes(lower)
            );
        }

        // Sort Logic
        result.sort((a, b) => {
            let valA: any = a[sortConfig.key as keyof Tarea];
            let valB: any = b[sortConfig.key as keyof Tarea];

            if (sortConfig.key === 'proyecto') {
                valA = a.proyectoNombre || a.proyecto?.nombre || '';
                valB = b.proyectoNombre || b.proyecto?.nombre || '';
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [tasks, selectedProjectId, priorityFilter, searchTerm, sortConfig]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredTasks.length / ITEMS_PER_PAGE);
    const paginatedTasks = filteredTasks.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedProjectId, priorityFilter, searchTerm]);

    // Sync creation project with filter project
    useEffect(() => {
        if (typeof selectedProjectId === 'number') {
            setCreationProjectId(selectedProjectId);
        } else if (selectedProjectId === '') {
            setCreationProjectId('');
        }
    }, [selectedProjectId]);

    const fetchInitialData = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const [tasksData, projectsRes] = await Promise.all([
                clarityService.getMisTareas(),
                clarityService.getProyectos()
            ]);

            const tasksArray = Array.isArray(tasksData) ? tasksData : (tasksData as any)?.data || [];

            setTasks(tasksArray.filter((t: Tarea) => t.estado !== 'Hecha' && t.estado !== 'Descartada'));

            const projectItems = (projectsRes as any)?.items || projectsRes || [];
            setProjects(projectItems);
            if (projectItems.length > 0 && !selectedProjectId) {
                // setSelectedProjectId(projectItems[0].idProyecto);
            }
        } catch (err) {
            showToast("Error cargando datos.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, [user]);

    const handleCreateTask = async () => {
        if (!newTaskTitle.trim() || !user || isCreating) return;
        try {
            setIsCreating(true);
            await clarityService.postTarea({
                titulo: newTaskTitle,
                idUsuario: user.idUsuario,
                idResponsable: user.idUsuario, // Auto-assign to self
                idProyecto: creationProjectId !== '' ? creationProjectId : undefined,
                prioridad: 'Media',
                esfuerzo: 'M'
            } as any);
            setNewTaskTitle('');
            showToast("Tarea guardada", "success");
            fetchInitialData(); // Refresh list
        } catch (error) {
            showToast("Error al crear la tarea.", "error");
        } finally {
            setIsCreating(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleCreateTask();
    };

    const SortIcon = ({ column }: { column: keyof Tarea | 'proyecto' }) => {
        if (sortConfig.key !== column) return <span className="opacity-20 ml-1">↕</span>;
        return <span className="ml-1 text-indigo-600">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
    };

    return (
        <div className="bg-gray-50 min-h-screen pb-24 font-sans text-slate-800 relative">
            {activeMenuId && <div className="fixed inset-0 z-40" onClick={() => setActiveMenuId(null)} />}
            <TopBar title="Mis Tareas" />

            <div className="max-w-7xl mx-auto p-6 space-y-6">

                {/* Header & Controls */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                            <Inbox size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Mis Tareas Activas</h1>
                            <p className="text-xs text-gray-500">Gestión centralizada de pendientes</p>
                        </div>
                    </div>

                    <div className="flex-1 w-full md:w-auto flex flex-col md:flex-row gap-2 justify-end">
                        {/* Creation Input */}
                        <div className="w-full md:min-w-[400px] bg-indigo-50/50 border border-indigo-100 rounded-lg flex items-center px-2 py-1 text-sm focus-within:ring-2 focus-within:ring-indigo-100 transition-all gap-1">
                            <select
                                value={creationProjectId}
                                onChange={(e) => setCreationProjectId(e.target.value ? Number(e.target.value) : '')}
                                className="bg-transparent text-xs font-bold text-indigo-800 outline-none cursor-pointer max-w-[100px] truncate border-r border-indigo-200 pr-1 mr-1"
                                title="Proyecto Destino"
                            >
                                <option value="">📥 Inbox</option>
                                {projects.map(p => <option key={p.idProyecto} value={p.idProyecto}>{p.nombre}</option>)}
                            </select>
                            <input
                                className="bg-transparent outline-none w-full font-medium"
                                placeholder={isCreating ? "Creando..." : "+ Nueva Tarea Rápida..."}
                                value={newTaskTitle}
                                onChange={e => setNewTaskTitle(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={isCreating}
                            />
                            <button onClick={handleCreateTask} disabled={!newTaskTitle.trim() || isCreating} className="text-indigo-600 font-bold hover:text-indigo-800 disabled:opacity-30">
                                {isCreating ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600" />
                                ) : (
                                    <Plus size={18} />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filters Toolbar */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex gap-2 flex-1 w-full md:w-auto overflow-x-auto pb-1">
                        {/* Search */}
                        <div className="relative min-w-[220px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition-colors"
                                placeholder="Buscar en mis tareas..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Project Filter */}
                        <select
                            className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 cursor-pointer max-w-[200px] truncate"
                            value={selectedProjectId}
                            onChange={e => {
                                const v = e.target.value;
                                if (v === 'all') setSelectedProjectId('all');
                                else if (v === '') setSelectedProjectId('');
                                else setSelectedProjectId(Number(v));
                            }}
                        >
                            <option value="all">📁 Todos los Proyectos</option>
                            <option value="">📂 Sin Proyecto</option>
                            {projects.map(p => (
                                <option key={p.idProyecto} value={p.idProyecto}>{p.nombre}</option>
                            ))}
                        </select>

                        {/* Priority Filter */}
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <select
                                className="bg-white border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-indigo-500 cursor-pointer appearance-none"
                                value={priorityFilter}
                                onChange={e => setPriorityFilter(e.target.value)}
                            >
                                <option value="all">Todas Prioridades</option>
                                <option value="Alta">🔥 Alta</option>
                                <option value="Media">⚡ Media</option>
                                <option value="Baja">☕ Baja</option>
                            </select>
                        </div>
                    </div>

                    <div className="text-xs text-gray-500 font-medium whitespace-nowrap">
                        Mostrando {paginatedTasks.length} de {filteredTasks.length} tareas
                    </div>
                </div>

                {/* Data Grid */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-300">
                    <div className="overflow-x-auto overflow-y-visible">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-100 text-gray-500 text-[10px] uppercase tracking-wider font-black border-b border-gray-200">
                                    <th className="px-6 py-4 w-16 cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort('idTarea')}>
                                        ID <SortIcon column="idTarea" />
                                    </th>
                                    <th className="px-6 py-4 cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort('titulo')}>
                                        Título / Descripción <SortIcon column="titulo" />
                                    </th>
                                    <th className="px-6 py-4 w-48 cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort('proyecto')}>
                                        Proyecto <SortIcon column="proyecto" />
                                    </th>
                                    <th className="px-6 py-4 w-32 cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort('prioridad')}>
                                        Prioridad <SortIcon column="prioridad" />
                                    </th>
                                    <th className="px-6 py-4 w-32 cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort('estado')}>
                                        Estado <SortIcon column="estado" />
                                    </th>
                                    <th className="px-6 py-4 w-20 text-right">Opciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {loading && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                            Cargando inventario de tareas...
                                        </td>
                                    </tr>
                                )}
                                {!loading && filteredTasks.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                            <div className="flex flex-col items-center gap-2">
                                                <Search size={32} className="opacity-20" />
                                                <p>No se encontraron tareas con estos filtros.</p>
                                                <button onClick={() => { setSearchTerm(''); setPriorityFilter('all'); setSelectedProjectId('all'); }} className="text-indigo-600 text-xs font-bold hover:underline">
                                                    Limpiar filtros
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                {paginatedTasks.map((task) => (
                                    <tr key={task.idTarea} className="hover:bg-indigo-50/30 transition-colors group">
                                        <td className="px-6 py-4 font-mono text-gray-400 text-[10px]">#{task.idTarea}</td>
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-gray-800 leading-tight">{task.titulo}</p>
                                            {task.descripcion && <p className="text-[10px] text-gray-500 truncate max-w-xs mt-0.5">{task.descripcion}</p>}
                                        </td>
                                        <td className="px-6 py-4">
                                            {task.idProyecto ? (
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-black border border-indigo-100 uppercase truncate max-w-full">
                                                    {task.proyectoNombre || task.proyecto?.nombre || `Proyecto #${task.idProyecto}`}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-bold border border-slate-200 uppercase">
                                                    General
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold border ${task.prioridad === 'Alta' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                                task.prioridad === 'Media' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                    'bg-blue-50 text-blue-700 border-blue-100'
                                                }`}>
                                                {task.prioridad}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={task.estado} />
                                        </td>
                                        <td className="px-6 py-4 text-right relative">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        try {
                                                            await clarityService.actualizarTarea(task.idTarea, { estado: 'EnCurso' });
                                                            showToast('Tarea movida a Agenda', 'success');
                                                            fetchInitialData();
                                                        } catch (err) { showToast('Error al mover', 'error'); }
                                                    }}
                                                    className="p-2 rounded-full text-indigo-600 hover:bg-indigo-50 transition-colors"
                                                    title="Mover a Mi Agenda"
                                                >
                                                    <Play size={20} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // Calculate position relative to viewport
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        setMenuPos({ top: rect.bottom + 5, right: window.innerWidth - rect.right });
                                                        setActiveMenuId(activeMenuId === task.idTarea ? null : task.idTarea);
                                                    }}
                                                    className={`p-2 rounded-full transition-colors ${activeMenuId === task.idTarea ? 'bg-indigo-100 text-indigo-700' : 'text-gray-400 hover:text-indigo-600 hover:bg-gray-100'}`}
                                                >
                                                    <MoreHorizontal size={20} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent text-gray-500"
                            >
                                <ChevronLeft size={20} />
                            </button>

                            <div className="flex items-center gap-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(p => p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1))
                                    .map((p, i, arr) => (
                                        <React.Fragment key={p}>
                                            {i > 0 && arr[i - 1] !== p - 1 && <span className="px-2 text-gray-400">...</span>}
                                            <button
                                                onClick={() => setCurrentPage(p)}
                                                className={`w-8 h-8 rounded-lg text-sm font-bold transition-colors ${currentPage === p
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'text-gray-600 hover:bg-gray-100'
                                                    }`}
                                            >
                                                {p}
                                            </button>
                                        </React.Fragment>
                                    ))
                                }
                            </div>

                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent text-gray-500"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* GLOBAL ACTION MENU (Rendered outside table to avoid clipping) */}
            {activeMenuId && menuPos && (
                <div
                    className="fixed z-[100] w-56 bg-white rounded-xl shadow-2xl ring-1 ring-slate-900/10 text-left animate-in fade-in zoom-in-95 duration-100 origin-top-right"
                    style={{ top: menuPos.top, right: menuPos.right }}
                >
                    <div className="py-1">
                        <button
                            onClick={() => {
                                const t = tasks.find(x => x.idTarea === activeMenuId);
                                if (t) setSelectedTask(t);
                                setActiveMenuId(null);
                            }}
                            className="w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600 flex items-center gap-3 font-medium border-b border-gray-50"
                        >
                            <span>✏️</span> Editar Tarea
                        </button>

                        <button
                            onClick={async () => {
                                try {
                                    await clarityService.actualizarTarea(activeMenuId, { estado: 'EnCurso' });
                                    showToast('Tarea movida a Agenda', 'success');
                                    fetchInitialData();
                                } catch (err) { showToast('Error al mover', 'error'); }
                                setActiveMenuId(null);
                            }}
                            className="w-full px-4 py-3 text-sm text-indigo-700 hover:bg-indigo-50 flex items-center gap-3 font-bold border-b border-indigo-50"
                        >
                            <Play size={16} /> Mover a Agenda
                        </button>

                        <button
                            onClick={async () => {
                                try {
                                    await clarityService.actualizarTarea(activeMenuId, { estado: 'Hecha' });
                                    showToast('Tarea completada', 'success');
                                    setTasks(prev => prev.filter(t => t.idTarea !== activeMenuId));
                                } catch (err) { showToast('Error al completar', 'error'); }
                                setActiveMenuId(null);
                            }}
                            className="w-full px-4 py-3 text-sm text-emerald-700 hover:bg-emerald-50 flex items-center gap-3 font-bold border-b border-emerald-50"
                        >
                            <span>✅</span> Completar
                        </button>

                        <button
                            onClick={async () => {
                                try {
                                    await clarityService.actualizarTarea(activeMenuId, { estado: 'Descartada' });
                                    showToast('Tarea descartada', 'success');
                                    setTasks(prev => prev.filter(t => t.idTarea !== activeMenuId));
                                } catch (err) { showToast('Error al descartar', 'error'); }
                                setActiveMenuId(null);
                            }}
                            className="w-full px-4 py-3 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-3 font-medium"
                        >
                            <span>🗑️</span> Descartar
                        </button>
                    </div>
                </div>
            )}
            {/* Global Action Menu outside of table scope */}


            {
                selectedTask && (
                    <ReadTaskDetailModal
                        task={selectedTask}
                        onClose={() => setSelectedTask(null)}
                        onUpdate={() => {
                            fetchInitialData();
                        }}
                    />
                )
            }
        </div >
    );
};
