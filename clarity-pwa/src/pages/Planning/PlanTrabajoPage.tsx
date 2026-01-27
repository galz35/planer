import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { clarityService } from '../../services/clarity.service';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import type { Tarea, Proyecto } from '../../types/modelos';
import { CreateTaskModal } from '../../components/ui/CreateTaskModal';
import { TipoBadge } from '../../components/ui/TipoBadge';
import { StatusBadge } from '../../components/ui/StatusBadge';

import { AvanceMensualModal } from './components/AvanceMensualModal';
import {
    LayoutGrid, List, Calendar as CalendarIcon, ChevronDown, Plus,
    Briefcase, Lock, MoreVertical, Search, CheckCircle, ChevronLeft, ChevronRight,
    User, Unlock, AlertCircle, Trash2, X, Map as MapIcon, Link2
} from 'lucide-react';
import {
    format,
    eachDayOfInterval,
    isWeekend,
    differenceInDays,
    startOfMonth,
    endOfMonth,
    addMonths,
    subMonths,
    isAfter,
    startOfDay
} from 'date-fns';
import { es } from 'date-fns/locale';

// --- TYPES ---
type ViewMode = 'list' | 'board' | 'gantt' | 'roadmap';
interface TeamMember { idUsuario: number; nombre: string; correo: string; carnet?: string; }
interface Comment { id: number; user: string; text: string; timestamp: string; }

// --- COMPONENTS ---

/* ---------- HOOKS DE RENDIMIENTO (NUEVO) ---------- */
function useOutsideClick<T extends HTMLElement>(onOutside: () => void, enabled: boolean) {
    const ref = useRef<T | null>(null);

    useEffect(() => {
        if (!enabled) return;
        const onDown = (e: MouseEvent) => {
            if (!ref.current) return;
            if (!ref.current.contains(e.target as Node)) onOutside();
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, [enabled, onOutside]);

    return ref;
}

function useDebouncedValue<T>(value: T, ms = 200) {
    const [v, setV] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setV(value), ms);
        return () => clearTimeout(t);
    }, [value, ms]);
    return v;
}

/* ---------- UI COMPONENTS (Refactorizados) ---------- */
const ViewTabs: React.FC<{ value: ViewMode; onChange: (v: ViewMode) => void }> = ({ value, onChange }) => {
    const btn = (k: ViewMode, Icon: any, title: string) => (
        <button
            type="button"
            onClick={() => onChange(k)}
            title={title}
            className={`p-2 rounded-lg transition-all ${value === k
                ? "bg-white shadow-sm text-slate-900 scale-105 border border-slate-200"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                }`}
        >
            <Icon size={18} />
        </button>
    );

    return (
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner gap-1">
            {btn("list", List, "Lista Detallada")}
            {btn("board", LayoutGrid, "Tablero Kanban")}
            {btn("gantt", CalendarIcon, "Cronograma")}
            {btn("roadmap", MapIcon, "Roadmap")}
        </div>
    );
};

// StatusBadge moved to shared component



const UserAvatar: React.FC<{ name: string, color?: string }> = ({ name, color }) => (
    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm ${color || 'bg-slate-600'}`}>
        {(name || '?').charAt(0).toUpperCase()}
    </div>
);

// --- COMPLEX COMPONENTS ---

const QuickAssignDropdown: React.FC<{
    currentAssignee: { id: number, nombre: string } | null;
    team: TeamMember[];
    onAssign: (userId: number) => void;
}> = ({ currentAssignee, team, onAssign }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');

    const filteredTeam = team.filter(m =>
        (m.nombre || '').toLowerCase().includes(search.toLowerCase()) ||
        (m.correo || '').toLowerCase().includes(search.toLowerCase()) ||
        (m.carnet || '').toLowerCase().includes(search.toLowerCase())
    );

    const ref = useOutsideClick<HTMLDivElement>(() => setIsOpen(false), isOpen);

    return (
        <div className="relative quick-assign-container" ref={ref}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 hover:bg-slate-100 p-1 rounded-full pr-2 transition-colors border border-transparent hover:border-slate-200"
            >
                {currentAssignee ? (
                    <UserAvatar name={currentAssignee.nombre} />
                ) : (
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 border-dashed">
                        <User size={12} />
                    </div>
                )}
                <span className="text-xs text-slate-600 truncate max-w-[80px] hidden md:block">
                    {currentAssignee ? (currentAssignee.nombre || 'Usuario').split(' ')[0] : 'Asignar'}
                </span>
                <ChevronDown size={10} className="text-slate-400" />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-2 border-b border-slate-50 bg-slate-50/50">
                        <input
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-slate-300"
                            placeholder="Buscar miembro..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()} // Stop click
                            autoFocus
                        />
                    </div>
                    <div className="max-h-48 overflow-y-auto p-1">
                        {filteredTeam.map(member => (
                            <button
                                key={member.idUsuario}
                                onClick={() => { onAssign(member.idUsuario); setIsOpen(false); }}
                                className="w-full flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg transition-colors text-left group"
                            >
                                <UserAvatar name={member.nombre} />
                                <span className="text-xs text-slate-600 font-medium group-hover:text-slate-900">{member.nombre}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};



// --- LOCKED FIELD COMPONENT ---
const LockedField: React.FC<{
    isLocked: boolean;
    label?: string;
    onProposal: () => void;
    children: React.ReactNode;
}> = ({ isLocked, label, onProposal, children }) => {
    return (
        <div className="relative group w-full">
            {label && <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{label}</label>}
            {children}
            {isLocked && (
                <div className="absolute top-0 right-0 z-10">
                    <button
                        onClick={onProposal}
                        className="bg-slate-50 p-1.5 rounded-bl-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors shadow-sm border-l border-b border-white"
                        title="Campo protegido / Aprobado. Solicitar cambio."
                    >
                        <Lock size={12} />
                    </button>
                </div>
            )}
        </div>
    );
};

// --- VIEWS ---

const RoadmapView: React.FC<{ projects: Proyecto[] }> = ({ projects }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-6">
            {projects.map(p => (
                <div key={p.idProyecto} className="group bg-white rounded-3xl border border-slate-200/60 p-8 shadow-sm hover:shadow-2xl transition-all hover:-translate-y-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />

                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="font-black text-2xl text-slate-900 mb-2 tracking-tight group-hover:text-indigo-600 transition-colors">{p.nombre}</h3>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                    <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black">Proyecto Activo</p>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-2xl">
                                <Briefcase className="w-6 h-6 text-slate-400" />
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100">
                                <div className="flex justify-between text-xs mb-3">
                                    <span className="font-black text-slate-500 uppercase tracking-wider">Progreso Global</span>
                                    <span className="font-black text-slate-900">0%</span>
                                </div>
                                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                                    <div className="h-full bg-slate-900 w-0 transition-all duration-1000" />
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex -space-x-2">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500">
                                            +
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-center gap-4 text-[11px] font-bold text-slate-400">
                                    <span className="flex items-center gap-1.5"><CalendarIcon size={14} /> {format(new Date(), 'MMM yy')}</span>
                                    <span className="flex items-center gap-1.5"><List size={14} /> 0 Tareas</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const BoardView: React.FC<{ tasks: Tarea[], team: TeamMember[], onAssign: (tid: number, uid: number) => void, onTaskClick: (t: Tarea) => void }> = ({ tasks, team, onAssign, onTaskClick }) => {
    const columns = ['Pendiente', 'En Curso', 'Bloqueada', 'Revisión', 'Hecha'];

    // Status color mapping for board headers
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Pendiente': return 'bg-slate-400';
            case 'En Curso': return 'bg-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.5)]';
            case 'Bloqueada': return 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]';
            case 'Revisión': return 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]';
            case 'Revision': return 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]'; // Fallback
            case 'Hecha': return 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]';
            default: return 'bg-slate-400';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'Pendiente': return 'Por Hacer';
            case 'En Curso': return 'En Ejecución';
            case 'Bloqueada': return 'Bloqueada';
            case 'Revisión': return 'En Revisión';
            case 'Revision': return 'En Revisión';
            case 'Hecha': return 'Completado';
            default: return status;
        }
    };

    return (
        <div className="flex gap-6 h-full overflow-x-auto pb-6 px-4">
            {columns.map(status => (
                <div key={status} className="w-[320px] shrink-0 flex flex-col bg-slate-100/40 rounded-3xl border border-slate-200/50 max-h-full backdrop-blur-sm">
                    <div className="p-5 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(status)}`} />
                            <h3 className="font-black text-[11px] text-slate-500 uppercase tracking-[0.2em]">{getStatusLabel(status)}</h3>
                        </div>
                        <span className="bg-white/80 border border-slate-200 text-slate-900 text-[10px] font-black px-3 py-1 rounded-full shadow-sm">
                            {tasks.filter(t => t.estado === status || (status === 'En Curso' && t.estado === 'EnCurso') || (status === 'Revisión' && (t.estado === 'Revision' || t.estado === 'Revisión'))).length}
                        </span>
                    </div>
                    <div className="px-3 pb-4 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                        {tasks.filter(t => t.estado === status || (status === 'En Curso' && t.estado === 'EnCurso') || (status === 'Revisión' && (t.estado === 'Revision' || t.estado === 'Revisión'))).map(task => (
                            <div key={task.idTarea} onClick={() => onTaskClick(task)} className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl transition-all group cursor-pointer active:scale-[0.98] border-b-4 border-b-slate-100 hover:border-b-indigo-500">
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-[10px] text-slate-400 font-black tracking-widest uppercase">ID-{task.idTarea}</span>
                                    <div className="flex items-center gap-2">
                                        {(task as any).isLockedByManager && <Lock size={10} className="text-indigo-400" />}
                                        <TipoBadge tipo={task.tipo} />
                                    </div>
                                </div>
                                <h4 className="text-sm font-black text-slate-800 leading-relaxed mb-4 group-hover:text-indigo-600 transition-colors uppercase tracking-tight line-clamp-2">{task.titulo}</h4>
                                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                                    <QuickAssignDropdown
                                        currentAssignee={task.asignados && task.asignados.length > 0 ? { id: task.asignados[0].idUsuario, nombre: task.asignados[0].usuario?.nombre || 'U' } : null}
                                        team={team}
                                        onAssign={(uid) => onAssign(task.idTarea, uid)}
                                    />
                                    {task.fechaObjetivo && (
                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-lg text-[10px] font-black text-slate-500">
                                            <CalendarIcon size={12} className="text-slate-400" />
                                            {format(new Date(task.fechaObjetivo), 'dd MMM')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

const GanttView: React.FC<{ tasks: Tarea[] }> = ({ tasks }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const days = useMemo(() => {
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);
        return eachDayOfInterval({ start, end });
    }, [currentDate]);

    return (
        <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-4">
                    <h3 className="font-bold text-slate-700">{format(currentDate, 'MMMM yyyy', { locale: es })}</h3>
                    <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-1">
                        <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-1 hover:bg-slate-100 rounded"><ChevronLeft size={16} /></button>
                        <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-1 hover:bg-slate-100 rounded"><ChevronRight size={16} /></button>
                    </div>
                </div>
            </div>
            <div className="flex-1 overflow-auto">
                <div className="min-w-max">
                    <div className="flex border-b border-slate-100">
                        <div className="w-64 shrink-0 p-3 border-r border-slate-100 font-bold text-xs text-slate-500 bg-slate-50 sticky left-0 z-10">Tarea</div>
                        {days.map(day => (
                            <div key={day.toString()} className={`w-10 shrink-0 p-2 text-center border-r border-slate-50 text-[10px] font-bold ${isWeekend(day) ? 'bg-slate-50 text-slate-300' : 'text-slate-600'}`}>
                                {format(day, 'd')}
                            </div>
                        ))}
                    </div>
                    {tasks.map(task => (
                        <div key={task.idTarea} className="flex border-b border-slate-50 hover:bg-slate-50/50">
                            <div className="w-64 shrink-0 p-3 border-r border-slate-100 text-xs font-medium text-slate-700 truncate sticky left-0 bg-white z-10 flex items-center gap-2">
                                <StatusBadge status={task.estado} />
                                {task.titulo}
                            </div>
                            {days.map(day => {
                                const isTaskDay = task.fechaInicioPlanificada && task.fechaObjetivo &&
                                    isAfter(day, new Date(task.fechaInicioPlanificada)) &&
                                    isAfter(new Date(task.fechaObjetivo), day);
                                return (
                                    <div key={day.toString()} className={`w-10 shrink-0 border-r border-slate-50 h-10 relative ${isWeekend(day) ? 'bg-slate-50/50' : ''}`}>
                                        {isTaskDay && (
                                            <div className="absolute inset-y-2 inset-x-0 bg-slate-800 rounded-full opacity-80" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- MAIN PAGE ---

export const PlanTrabajoPage: React.FC = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [searchParams] = useSearchParams();
    const projectIdFromUrl = searchParams.get('projectId');

    // Mode & Selection
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [projects, setProjects] = useState<Proyecto[]>([]);
    const [selectedProject, setSelectedProject] = useState<Proyecto | null>(null);
    const [tasks, setTasks] = useState<Tarea[]>([]);
    const [team, setTeam] = useState<TeamMember[]>([]);

    // Security / Permissions Mock
    // Permisos automÃ¡ticos basados en el usuario
    const canManageProject = useMemo(() => {
        if (!user) return false;

        // 1. Admin Global siempre tiene permiso
        if (user.rolGlobal === 'Admin' || user.rolGlobal === 'Administrador') return true;

        // 2. JerarquÃ­a: Si es Jefe y el proyecto pertenece a su nodo organizacional
        // Nota: user.idOrg debe coincidir con project.idNodoDuenio
        if (user.rolGlobal === 'Jefe' && selectedProject?.idNodoDuenio) {
            // Si el usuario tiene idOrg, verificamos coincidencia
            return user.idOrg === selectedProject.idNodoDuenio;
        }

        return false;
    }, [user, selectedProject]);

    // Usar canManageProject en lugar de un estado manual
    const isManagerMode = canManageProject;

    // Modals
    const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);

    // Loading
    const [loading, setLoading] = useState(false);
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Filters
    const [filterText, setFilterText] = useState('');
    const [filterAssignee, setFilterAssignee] = useState<number | ''>('');
    const [isAssigneeFilterOpen, setIsAssigneeFilterOpen] = useState(false);
    const [assigneeFilterSearch, setAssigneeFilterSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 7; // Items per page

    // Hierarchy Filters
    // Project Selector State
    const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
    const [projectSearch, setProjectSearch] = useState('');

    const [hierarchyCatalog, setHierarchyCatalog] = useState<any[]>([]);
    const [hFilters, setHFilters] = useState({ gerencia: '', subgerencia: '', area: '' });

    // Derived state for Hierarchy Dropdowns
    const uniqueGerencias = useMemo(() => Array.from(new Set(hierarchyCatalog.map((c: any) => c.ogerencia).filter(Boolean))), [hierarchyCatalog]);

    const uniqueSubgerencias = useMemo(() => {
        if (!hFilters.gerencia) return [];
        return Array.from(new Set(hierarchyCatalog.filter((c: any) => c.ogerencia === hFilters.gerencia).map((c: any) => c.subgerencia).filter(Boolean)));
    }, [hierarchyCatalog, hFilters.gerencia]);

    const uniqueAreas = useMemo(() => {
        if (!hFilters.subgerencia) return [];
        return Array.from(new Set(hierarchyCatalog.filter((c: any) => c.subgerencia === hFilters.subgerencia).map((c: any) => c.area).filter(Boolean)));
    }, [hierarchyCatalog, hFilters.subgerencia]);

    // Filtered Projects helper
    const filteredProjects = useMemo(() => {
        return projects.filter(p => {
            const matchText = p.nombre.toLowerCase().includes(projectSearch.toLowerCase());
            const matchG = !hFilters.gerencia || p.gerencia === hFilters.gerencia;
            const matchS = !hFilters.subgerencia || p.subgerencia === hFilters.subgerencia;
            const matchA = !hFilters.area || p.area === hFilters.area;
            return matchText && matchG && matchS && matchA;
        });
    }, [projects, projectSearch, hFilters]);


    // DETAIL PANEL STATE
    const [selectedTask, setSelectedTask] = useState<Tarea | null>(null);
    const [isPanelOpen, setIsPanelOpen] = useState(false);

    // Comments & Blockers State
    const [comments, setComments] = useState<Record<number, Comment[]>>({});
    const [newComment, setNewComment] = useState('');

    // Blocker Reporting State
    const [isReportingBlocker, setIsReportingBlocker] = useState(false);
    const [blockerReason, setBlockerReason] = useState('');
    const [blockerArea, setBlockerArea] = useState('');

    // New Project Modal State
    const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [isCreatingProject, setIsCreatingProject] = useState(false);

    // Avance Mensual Modal State (para tareas LARGA)
    const [isAvanceMensualOpen, setIsAvanceMensualOpen] = useState(false);

    // INLINE SUBTASK CREATION STATE
    const [creationParentId, setCreationParentId] = useState<number | null>(null);
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

    // EXPANDED TASKS STATE (Hierarchical View)
    const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());

    const toggleExpand = (taskId: number) => {
        setExpandedTasks(prev => {
            const next = new Set(prev);
            if (next.has(taskId)) next.delete(taskId);
            else next.add(taskId);
            return next;
        });
    };




    const openTaskDetails = (task: Tarea) => {
        setSelectedTask({ ...task });
        setIsPanelOpen(true);
    };

    const handleAddComment = () => {
        if (!selectedTask || !newComment.trim()) return;
        const newC: Comment = {
            id: Date.now(),
            user: "Yo",
            text: newComment,
            timestamp: "Ahora"
        };
        setComments(prev => ({
            ...prev,
            [selectedTask.idTarea]: [...(prev[selectedTask.idTarea] || []), newC]
        }));
        setNewComment('');
        showToast('Comentario agregado', 'success');
    };

    const handleReportBlocker = () => {
        if (!selectedTask) return;
        // In a real scenario, we would send blockerReason and blockerArea to the backend
        setSelectedTask({ ...selectedTask, estado: 'Bloqueada' });
        showToast('Tarea marcada como bloqueada', 'error');
        setIsReportingBlocker(false);
        setBlockerReason('');
        setBlockerArea('');
    };

    const handleSaveChanges = async () => {
        if (!selectedTask) return;
        setIsSaving(true);
        try {
            const { data } = await api.patch(`/tareas/${selectedTask.idTarea}`, {
                titulo: selectedTask.titulo,
                estado: selectedTask.estado,
                prioridad: selectedTask.prioridad,
                progreso: selectedTask.progreso,
                descripcion: selectedTask.descripcion,
                fechaInicioPlanificada: selectedTask.fechaInicioPlanificada || null,
                fechaObjetivo: selectedTask.fechaObjetivo || null,
                tipo: selectedTask.tipo,
                linkEvidencia: selectedTask.linkEvidencia
            });

            // Handle Approval Response
            const payload = data.data || data;
            if (payload?.requiresApproval) {
                showToast(payload.message || 'Cambio enviado para aprobación', 'info');
                loadTasks(); // Reload to reflect true state
                setIsPanelOpen(false);
                return;
            }

            // Update local list
            setTasks(prev => prev.map(t => t.idTarea === selectedTask.idTarea ? { ...t, ...selectedTask } : t));

            showToast('Cambios guardados', 'success');
            setIsPanelOpen(false);
        } catch (error: any) {
            console.error(error);
            let msg = error.response?.data?.message || 'Error al guardar cambios';
            if (Array.isArray(msg)) msg = msg.join(', ');
            msg = String(msg);

            // Check if approval is required
            if (msg && String(msg).toLowerCase().includes('requieren aprobación') || String(msg).toLowerCase().includes('approval')) {
                if (window.confirm('🔒 Esta tarea requiere aprobación para cambios sensibles.\n\n¿Deseas enviar una solicitud de cambio oficial?')) {
                    const motivo = prompt('Motivo del cambio (Opcional):') || 'Actualización de planificación';
                    const original = tasks.find(t => t.idTarea === selectedTask.idTarea);

                    if (original) {
                        let sent = 0;
                        try {
                            if (selectedTask.fechaInicioPlanificada !== original.fechaInicioPlanificada) {
                                await clarityService.solicitarCambio(
                                    selectedTask.idTarea,
                                    'fechaInicioPlanificada',
                                    selectedTask.fechaInicioPlanificada || '',
                                    motivo
                                );
                                sent++;
                            }
                            if (selectedTask.fechaObjetivo !== original.fechaObjetivo) {
                                await clarityService.solicitarCambio(
                                    selectedTask.idTarea,
                                    'fechaObjetivo',
                                    selectedTask.fechaObjetivo || '',
                                    motivo
                                );
                                sent++;
                            }

                            if (sent > 0) {
                                showToast(`Se enviaron ${sent} solicitudes de cambio a tu jefe`, 'success');
                                loadTasks(); // Reload to reset local state to server state
                                setIsPanelOpen(false);
                            } else {
                                showToast('No se detectaron cambios que requieran solicitud', 'info');
                            }
                        } catch (reqError) {
                            showToast('Error al enviar solicitud', 'error');
                        }
                    }
                    return;
                }
            }

            showToast(msg, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // --- INITIAL DATA ---
    useEffect(() => {
        const loadInitial = async () => {
            setLoading(true);
            try {
                const [projsRes, teamRes, catalog] = await Promise.all([
                    clarityService.getProyectos(),
                    clarityService.getMyTeam(),
                    clarityService.getCatalogoOrganizacion()
                ]);

                console.log('[DEBUG-API] loadInitial results:', {
                    projs: (projsRes as any)?.items?.length,
                    teamCount: teamRes?.length,
                    catalogCount: catalog?.length
                });

                const projs = (projsRes as any)?.items || projsRes || [];
                setProjects(projs);
                setHierarchyCatalog(catalog || []);

                // Select project based on URL or default
                if (projs && projs.length > 0) {
                    if (projectIdFromUrl) {
                        const target = projs.find((p: any) => p.idProyecto === Number(projectIdFromUrl));
                        if (target) setSelectedProject(target);
                        else setSelectedProject(projs[0]);
                    } else {
                        setSelectedProject(projs[0]);
                    }
                }

                const teamArrayRaw = teamRes || [];
                console.log('[DEBUG-API] teamArray from service:', teamArrayRaw);

                // Mapear nombreCompleto a nombre para compatibilidad
                const teamArray = teamArrayRaw.map((m: any) => ({
                    ...m,
                    nombre: m.nombre || m.nombreCompleto || 'Sin Nombre'
                }));
                console.log('[DEBUG-API] Final team state to set:', teamArray);
                setTeam(teamArray);
            } catch (error: any) {
                console.error('[DEBUG-API] Error loading initial data:', error);
                if (error.response) {
                    console.error('[DEBUG-API] Response data:', error.response.data);
                }
                showToast('Error cargando datos iniciales', 'error');
            } finally {
                setLoading(false);
            }
        };
        loadInitial();
    }, [projectIdFromUrl]);

    // --- TASK LOADING ---
    // --- TASK LOADING ---
    const handleOpenCreateTask = () => {
        console.log('[DEBUG-API] Opening CreateTaskModal. Current team size:', team.length);
        setIsCreateTaskOpen(true);
    };

    const loadTasks = async () => {
        if (!selectedProject) {
            setTasks([]);
            return [];
        }
        setLoadingTasks(true);
        try {
            const res = await clarityService.getProyectosTareas(selectedProject!.idProyecto);
            const sortedTasks = (res || []).sort((a, b) => b.idTarea - a.idTarea);
            setTasks(sortedTasks);
            return sortedTasks;
        } catch (error) {
            console.error(error);
            showToast('Error cargando tareas', 'error');
            return [];
        } finally {
            setLoadingTasks(false);
        }
    };

    useEffect(() => {
        if (!selectedProject && viewMode !== 'roadmap') {
            setTasks([]);
            return;
        }

        if (viewMode === 'roadmap') return;

        loadTasks();
    }, [selectedProject, viewMode]);

    // Reset pagination when filter or project changes
    useEffect(() => {
        setCurrentPage(1);
    }, [filterText, selectedProject, viewMode]);

    // Reset pagination when filter or project changes
    useEffect(() => {
        setCurrentPage(1);
    }, [filterText, selectedProject, viewMode]);

    // --- HANDLERS ---

    const handleAssign = async (taskId: number, userId: number) => {
        const taskIndex = tasks.findIndex(t => t.idTarea === taskId);
        if (taskIndex === -1) return;

        const oldTasks = [...tasks];
        const updatedTask = { ...tasks[taskIndex] };
        const userObj = team.find(u => u.idUsuario === userId);
        if (userObj) {
            // Set both direct fields and asignados for compatibility
            updatedTask.idResponsable = userId;
            updatedTask.responsableNombre = userObj.nombre;
            updatedTask.asignados = [{ idAsignacion: 0, idTarea: taskId, idUsuario: userId, usuario: { nombre: userObj.nombre } } as any];
        }

        const newTasks = [...tasks];
        newTasks[taskIndex] = updatedTask;
        setTasks(newTasks);

        try {
            await api.post('/asignaciones', { idTarea: taskId, idUsuarioAsignado: userId });
            showToast('Tarea reasignada', 'success');
        } catch (error) {
            setTasks(oldTasks); // Revert
            showToast('Error asignando tarea', 'error');
        }
    };

    // handleCreateTask removed (TaskCreationRow was the only user, and it was deleted)

    const handleNewProject = async () => {
        if (!newProjectName.trim()) return;
        setIsCreatingProject(true);
        try {
            await clarityService.postProyecto(newProjectName);
            showToast('Proyecto creado', 'success');
            const projsRes = await clarityService.getProyectos();
            const projs = (projsRes as any)?.items || (Array.isArray(projsRes) ? projsRes : []);
            setProjects(projs);
            const newProj = projs.find((p: any) => p.nombre === newProjectName);
            if (newProj) setSelectedProject(newProj);
            setIsNewProjectModalOpen(false);
            setNewProjectName('');
        } catch (error) {
            showToast('Error creando proyecto', 'error');
        } finally {
            setIsCreatingProject(false);
        }
    };

    const handleDeleteTask = async (taskId: number) => {
        if (!window.confirm('Â¿Eliminar esta tarea definitivamente?')) return;

        try {
            await clarityService.descartarTarea(taskId);
            setTasks(prev => prev.filter(t => t.idTarea !== taskId));
            showToast('Tarea eliminada', 'success');
            if (selectedTask?.idTarea === taskId) {
                setIsPanelOpen(false);
                setSelectedTask(null);
            }
        } catch (error) {
            console.error(error);
            showToast('Error al eliminar tarea', 'error');
        }
    };

    const handleQuickSubtask = async (parentId: number) => {
        if (!newSubtaskTitle.trim() || !selectedProject) return;

        try {
            const parentTask = tasks.find(t => t.idTarea === parentId);
            await clarityService.postTarea({
                titulo: newSubtaskTitle,
                idProyecto: selectedProject.idProyecto,
                idTareaPadre: parentId,
                prioridad: 'Media',
                esfuerzo: 'S',
                // Heredar fechas del padre si existen, sino defaults
                fechaInicioPlanificada: parentTask?.fechaInicioPlanificada,
                fechaObjetivo: parentTask?.fechaObjetivo,
                idResponsable: parentTask?.idResponsable
            } as any);

            showToast('Subtarea creada', 'success');
            setNewSubtaskTitle('');
            // No cerramos el input para permitir crear varias seguidas (Excel mode)
            // setCreationParentId(null); 
            loadTasks();
        } catch (error) {
            showToast('Error al crear subtarea', 'error');
        }
    };

    // --- RENDER ---

    // OPTIMIZED FILTERING
    const debouncedFilterText = useDebouncedValue(filterText, 300); // 300ms delay

    const finalFilteredTasks = useMemo(() => {
        const q = (debouncedFilterText || "").trim().toLowerCase();
        return tasks.filter(t => {
            const matchText = !q || t.titulo.toLowerCase().includes(q);
            const matchAssignee = filterAssignee === '' || t.idResponsable === Number(filterAssignee) || t.asignados?.some(a => a.idUsuario === Number(filterAssignee));
            return matchText && matchAssignee;
        });
    }, [tasks, debouncedFilterText, filterAssignee]);

    // --- HIERARCHY LOGIC (NUEVO) ---
    const hierarchyData = useMemo(() => {
        // Si hay filtros, usamos la lista plana para no ocultar resultados
        const isFiltering = (debouncedFilterText || "").trim() !== '' || filterAssignee !== '';

        if (isFiltering) {
            return {
                roots: finalFilteredTasks,
                childrenMap: new Map<number, Tarea[]>(),
                isFlat: true
            };
        }

        const roots: Tarea[] = [];
        const childrenMap = new Map<number, Tarea[]>();
        const allIds = new Set(tasks.map(t => t.idTarea));

        // 1. Organizar hijos
        tasks.forEach(t => {
            if (t.idTareaPadre && allIds.has(t.idTareaPadre)) {
                if (!childrenMap.has(t.idTareaPadre)) childrenMap.set(t.idTareaPadre, []);
                childrenMap.get(t.idTareaPadre)!.push(t);
            } else {
                roots.push(t);
            }
        });

        // Auto-expand tasks that have children by default? Or collapsed? 
        // User prefers to see structure, but maybe we default to expanded for active work contexts.
        // Let's keep them collapsed or check if we should auto-init state.
        // Actually, let's auto-init expanded state once if needed, but 'useMemo' shouldn't do side effects.
        // We will default to collapsed in state init or handle it in render.

        // Ordenar: Los padres mÃ¡s recientes primero
        roots.sort((a, b) => b.idTarea - a.idTarea);

        // Ordenar hijos por orden o id
        childrenMap.forEach(kids => kids.sort((a, b) => (a.orden || 0) - (b.orden || 0)));

        return { roots, childrenMap, isFlat: false };
    }, [tasks, finalFilteredTasks, debouncedFilterText, filterAssignee]);

    return (
        <div className="flex h-[calc(100vh-4rem)] bg-white overflow-hidden font-sans text-slate-800 flex-col">
            {/* HEADER COMPACTO */}
            <header className="h-14 border-b border-slate-200 flex items-center justify-between px-4 bg-white shrink-0 z-20 shadow-sm relative">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-slate-800 font-black tracking-tight">
                        <Briefcase size={20} />
                        <span className="text-lg hidden md:inline">Plan de Trabajo</span>
                    </div>

                    <div className="h-6 w-px bg-slate-200 mx-2"></div>

                    {/* Project Selector - Custom Dropdown with Search & Groups */}
                    {viewMode !== 'roadmap' && (
                        <div className="relative group z-30">
                            <button
                                onClick={() => setIsProjectSelectorOpen(!isProjectSelectorOpen)}
                                className="flex items-center justify-between gap-3 bg-white/80 border border-slate-200/80 text-slate-800 font-bold text-sm rounded-xl pl-4 pr-3 py-2 focus:outline-none focus:ring-4 focus:ring-slate-100 hover:bg-white hover:shadow-lg hover:shadow-indigo-500/10 transition-all cursor-pointer min-w-[260px] max-w-[420px] backdrop-blur-md shadow-sm"
                            >
                                <div className="flex flex-col items-start truncate overflow-hidden">
                                    <span className="font-black truncate w-full text-left">{selectedProject ? selectedProject.nombre : 'Seleccionar Proyecto...'}</span>
                                    {selectedProject && (
                                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                                            <span className={`flex items-center gap-1 ${selectedProject.estado === 'Activo' ? 'text-emerald-600' : 'text-slate-500'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${selectedProject.estado === 'Activo' ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                                                {selectedProject.estado}
                                            </span>
                                            {selectedProject.fechaInicio && (
                                                <span className="flex items-center gap-1">
                                                    <span className="w-0.5 h-2 bg-slate-200"></span>
                                                    {format(new Date(selectedProject.fechaInicio), 'dd MMM')} - {selectedProject.fechaFin ? format(new Date(selectedProject.fechaFin), 'dd MMM') : '??'}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform duration-300 ${isProjectSelectorOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isProjectSelectorOpen && (
                                <>
                                    <div className="fixed inset-0 z-20" onClick={() => setIsProjectSelectorOpen(false)} />
                                    <div className="absolute top-full left-0 mt-2 w-full min-w-[300px] bg-white rounded-2xl border border-slate-100 shadow-2xl p-2 z-30 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="relative mb-2">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder="Buscar proyecto..."
                                                className="w-full bg-slate-50 border-none rounded-xl py-2 pl-9 pr-3 text-xs font-bold text-slate-700 outline-none focus:bg-slate-100 transition-colors"
                                                value={projectSearch}
                                                onChange={(e) => setProjectSearch(e.target.value)}
                                            />
                                        </div>

                                        {/* Filters UI */}
                                        <div className="grid grid-cols-1 gap-2 mb-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
                                            <select
                                                className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-[10px] font-bold text-slate-600 outline-none focus:border-indigo-400"
                                                value={hFilters.gerencia}
                                                onChange={e => setHFilters({ ...hFilters, gerencia: e.target.value, subgerencia: '', area: '' })}
                                            >
                                                <option value="">Todas las Gerencias</option>
                                                {uniqueGerencias.map((g: any) => <option key={g} value={g}>{g}</option>)}
                                            </select>
                                            <div className="grid grid-cols-2 gap-2">
                                                <select
                                                    className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-[10px] font-bold text-slate-600 outline-none focus:border-indigo-400 disabled:opacity-50"
                                                    value={hFilters.subgerencia}
                                                    onChange={e => setHFilters({ ...hFilters, subgerencia: e.target.value, area: '' })}
                                                    disabled={!hFilters.gerencia}
                                                >
                                                    <option value="">Subgerencia...</option>
                                                    {uniqueSubgerencias.map((s: any) => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                                <select
                                                    className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-[10px] font-bold text-slate-600 outline-none focus:border-indigo-400 disabled:opacity-50"
                                                    value={hFilters.area}
                                                    onChange={e => setHFilters({ ...hFilters, area: e.target.value })}
                                                    disabled={!hFilters.subgerencia}
                                                >
                                                    <option value="">Área...</option>
                                                    {uniqueAreas.map((a: any) => <option key={a} value={a}>{a}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-1">
                                            {/* Proyectos Activos */}
                                            <div className="px-2 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 rounded-lg mb-1">Activos</div>
                                            {filteredProjects.filter(p => !p.enllavado && p.estado === 'Activo').length > 0 ? (
                                                filteredProjects.filter(p => !p.enllavado && p.estado === 'Activo').map(p => (
                                                    <div key={p.idProyecto} className="flex items-center group/item hover:bg-slate-50 rounded-xl pr-2 transition-colors">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedProject(p);
                                                                setIsProjectSelectorOpen(false);
                                                                setProjectSearch('');
                                                            }}
                                                            className={`flex-1 text-left px-3 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-between ${selectedProject?.idProyecto === p.idProyecto ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'}`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                                {p.nombre}
                                                            </div>
                                                            {selectedProject?.idProyecto === p.idProyecto && <CheckCircle size={14} className="text-indigo-600" />}
                                                        </button>
                                                        {canManageProject && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (window.confirm(`¿Estás seguro de eliminar el proyecto "${p.nombre}"? Esta acción no se puede deshacer.`)) {
                                                                        clarityService.deleteProyecto(p.idProyecto).then(() => {
                                                                            setProjects(prev => prev.filter(proj => proj.idProyecto !== p.idProyecto));
                                                                            if (selectedProject?.idProyecto === p.idProyecto) setSelectedProject(null);
                                                                            showToast('Proyecto eliminado', 'success');
                                                                        }).catch(() => showToast('Error eliminando proyecto', 'error'));
                                                                    }
                                                                }}
                                                                className="opacity-0 group-hover/item:opacity-100 p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                                                title="Eliminar proyecto"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="px-3 py-2 text-xs text-slate-400 italic">No se encontraron activos</div>
                                            )}

                                            {/* Proyectos Enllavados/Oficializados */}
                                            {filteredProjects.some(p => p.enllavado && p.estado === 'Activo') && (
                                                <>
                                                    <div className="px-2 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 rounded-lg mt-2 mb-1">Oficializados (Enllavados)</div>
                                                    {filteredProjects.filter(p => p.enllavado && p.estado === 'Activo').map(p => (
                                                        <button
                                                            key={p.idProyecto}
                                                            onClick={() => {
                                                                setSelectedProject(p);
                                                                setIsProjectSelectorOpen(false);
                                                                setProjectSearch('');
                                                            }}
                                                            className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-between opacity-90 hover:opacity-100 ${selectedProject?.idProyecto === p.idProyecto ? 'bg-amber-50 text-amber-900 border border-amber-100' : 'text-slate-600 hover:bg-slate-50'}`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <Lock size={10} className="text-amber-500" />
                                                                {p.nombre}
                                                            </div>
                                                            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-black">OFICIAL</span>
                                                        </button>
                                                    ))}
                                                </>
                                            )}

                                            {/* Otros Proyectos (Cerrados/Archivados) */}
                                            {filteredProjects.some(p => p.estado !== 'Activo') && (
                                                <>
                                                    <div className="px-2 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 rounded-lg mt-2 mb-1">Cerrados / Otros</div>
                                                    {filteredProjects.filter(p => p.estado !== 'Activo').map(p => (
                                                        <button
                                                            key={p.idProyecto}
                                                            onClick={() => {
                                                                setSelectedProject(p);
                                                                setIsProjectSelectorOpen(false);
                                                                setProjectSearch('');
                                                            }}
                                                            className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-between opacity-70 hover:opacity-100 ${selectedProject?.idProyecto === p.idProyecto ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}
                                                        >
                                                            {p.nombre}
                                                        </button>
                                                    ))}
                                                </>
                                            )}
                                        </div>

                                        <div className="border-t border-slate-100 mt-2 pt-2">
                                            <button
                                                onClick={() => { setIsProjectSelectorOpen(false); setIsNewProjectModalOpen(true); }}
                                                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 rounded-xl text-xs font-black hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
                                            >
                                                CREAR NUEVO PROYECTO
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                    {viewMode === 'roadmap' && <span className="font-bold text-slate-500 text-sm">Visión Estratégica Global</span>}
                </div>

                <div className="flex items-center gap-2">
                    {/* VIEW SWITCHER & ACTIONS */}
                    <div className="flex items-center gap-3">
                        {/* Selector de Vistas Optimizado */}
                        <ViewTabs value={viewMode} onChange={setViewMode} />

                        <div className="h-6 w-px bg-slate-200 mx-1 hidden md:block"></div>

                        <button
                            onClick={() => handleOpenCreateTask()}
                            className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 text-white font-bold text-xs rounded-lg hover:bg-slate-900 shadow-sm"
                        >
                            <Plus size={14} /> <span className="hidden md:inline">Nueva Tarea</span>
                        </button>
                    </div>
                </div>



                {selectedProject && canManageProject && (
                    <button
                        onClick={async () => {
                            if (!selectedProject) return;
                            const nuevoEstado = !(selectedProject as any).enllavado;
                            try {
                                await clarityService.toggleBloqueoProyecto(selectedProject.idProyecto, nuevoEstado);
                                // Update local state
                                const updatedProject = { ...selectedProject, enllavado: nuevoEstado };
                                setSelectedProject(updatedProject as any);
                                // Update in projects list
                                setProjects(projects.map(p => p.idProyecto === updatedProject.idProyecto ? updatedProject as any : p));

                                showToast(nuevoEstado ? "Plan Enllavado Correctamente" : "Plan Desbloqueado", "success");
                            } catch (error) {
                                console.error("Error toggling project lock", error);
                                showToast("Error al actualizar el estado del proyecto", "error");
                            }
                        }}
                        className={`ml-2 flex items-center gap-1 px-3 py-1.5 font-bold text-xs rounded-lg transition-colors ${(selectedProject as any).enllavado ? 'bg-amber-100 border border-amber-300 text-amber-800' : 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100'}`}
                        title={(selectedProject as any).enllavado ? "El plan está oficializado. Click para permitir ediciones." : "Enllavar Proyecto para oficializar y evitar cambios"}
                    >
                        {(selectedProject as any).enllavado ? <Unlock size={14} /> : <Lock size={14} />}
                        <span className="hidden md:inline">{(selectedProject as any).enllavado ? 'Desbloquear' : 'Enllavar Plan'}</span>
                    </button>
                )}
            </header >

            {/* CONTENT */}
            <div className="flex-1 overflow-hidden bg-slate-50/50 relative">
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400 bg-white/50 z-50">Cargando...</div>
                ) : (
                    <div className="w-full h-full flex flex-col">
                        {/* Filters Bar (Only for List/Board) */}
                        {['list', 'board'].includes(viewMode) && (
                            <div className="px-6 py-2 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="relative w-64">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            value={filterText}
                                            onChange={e => setFilterText(e.target.value)}
                                            placeholder="Filtrar tareas..."
                                            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-bold focus:bg-white focus:border-indigo-300 outline-none transition-all"
                                        />
                                    </div>

                                    {/* Filtro por Asignado */}
                                    {/* Filtro por Asignado - Searchable Dropdown */}
                                    <div className="relative">
                                        <div
                                            className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-md pl-3 pr-2 py-1.5 text-xs font-bold text-slate-700 cursor-pointer hover:bg-white transition-colors min-w-[180px]"
                                            onClick={() => setIsAssigneeFilterOpen(!isAssigneeFilterOpen)}
                                        >
                                            <User size={12} className="text-slate-400 shrink-0" />
                                            <span className="flex-1 truncate">
                                                {filterAssignee
                                                    ? team.find(m => m.idUsuario === filterAssignee)?.nombre || 'Desconocido'
                                                    : 'Todos los asignados'
                                                }
                                            </span>
                                            <ChevronDown size={12} className="text-slate-400 shrink-0" />
                                        </div>

                                        {isAssigneeFilterOpen && (
                                            <>
                                                <div className="fixed inset-0 z-10" onClick={() => setIsAssigneeFilterOpen(false)} />
                                                <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-xl py-2 z-20 animate-in fade-in zoom-in-95">
                                                    <div className="px-2 pb-2 border-b border-slate-100 mb-1">
                                                        <div className="relative">
                                                            <input
                                                                autoFocus
                                                                className="w-full bg-slate-50 border border-slate-200 rounded-md py-1.5 pl-8 pr-2 text-xs font-bold outline-none focus:border-indigo-400 transition-colors placeholder:font-normal"
                                                                placeholder="Buscar persona..."
                                                                value={assigneeFilterSearch}
                                                                onChange={e => setAssigneeFilterSearch(e.target.value)}
                                                            />
                                                            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                                        </div>
                                                    </div>
                                                    <div className="max-h-60 overflow-y-auto">
                                                        <button
                                                            onClick={() => {
                                                                setFilterAssignee('');
                                                                setIsAssigneeFilterOpen(false);
                                                                setAssigneeFilterSearch('');
                                                                setCurrentPage(1);
                                                            }}
                                                            className={`w-full text-left px-4 py-2 text-xs hover:bg-slate-50 flex items-center justify-between group ${filterAssignee === '' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600'}`}
                                                        >
                                                            <span>Todos</span>
                                                        </button>
                                                        {team
                                                            .filter(m => (m.nombre || '').toLowerCase().includes(assigneeFilterSearch.toLowerCase()))
                                                            .map(member => {
                                                                const count = tasks.filter(t => t.asignados?.some(a => a.idUsuario === member.idUsuario)).length;
                                                                return (
                                                                    <button
                                                                        key={member.idUsuario}
                                                                        onClick={() => {
                                                                            setFilterAssignee(member.idUsuario);
                                                                            setIsAssigneeFilterOpen(false);
                                                                            setAssigneeFilterSearch('');
                                                                            setCurrentPage(1);
                                                                        }}
                                                                        className={`w-full text-left px-4 py-2 text-xs hover:bg-slate-50 flex items-center justify-between group ${filterAssignee === member.idUsuario ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600'}`}
                                                                    >
                                                                        <span className="truncate">{member.nombre}</span>
                                                                        <span className={`px-1.5 py-0.5 rounded text-[10px] ml-2 font-bold ${filterAssignee === member.idUsuario ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>{count}</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        {team.filter(m => (m.nombre || '').toLowerCase().includes(assigneeFilterSearch.toLowerCase())).length === 0 && (
                                                            <div className="px-4 py-3 text-xs text-slate-400 text-center italic">No se encontraron resultados</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {filterAssignee !== '' && (
                                        <button
                                            onClick={() => setFilterAssignee('')}
                                            className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-rose-600 bg-rose-50 rounded-md hover:bg-rose-100 transition-colors"
                                        >
                                            <X size={12} /> Limpiar
                                        </button>
                                    )}
                                </div>
                                <div className="text-xs text-slate-400 font-medium">
                                    {tasks.filter(t => {
                                        const fa = filterAssignee !== '' ? Number(filterAssignee) : '';
                                        const matchAssignee = fa === '' || t.idResponsable === fa || (t.asignados && t.asignados.some(a => a.idUsuario === fa));
                                        return matchAssignee;
                                    }).length} tareas
                                </div>
                            </div>
                        )}

                        <div className="flex-1 overflow-hidden p-4">
                            {viewMode === 'roadmap' && <RoadmapView projects={projects} />}

                            {selectedProject ? (
                                <>
                                    {viewMode === 'gantt' && <GanttView tasks={tasks} />}

                                    {viewMode === 'board' && (
                                        <BoardView
                                            tasks={finalFilteredTasks}
                                            team={team}
                                            onAssign={handleAssign}
                                            onTaskClick={openTaskDetails}
                                        />
                                    )}

                                    {viewMode === 'list' && (
                                        <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                            {/* Table Header - Compact */}
                                            <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 sticky top-0 z-30">
                                                <div className="col-span-6 pl-2">Tarea</div>
                                                <div className="col-span-2">Estado / Asignado</div>
                                                <div className="col-span-2 text-center">Fechas</div>
                                                <div className="col-span-2 text-center">Progreso</div>
                                            </div>

                                            <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-white">
                                                {loadingTasks && (
                                                    <div className="absolute top-0 left-0 w-full h-1 bg-slate-100 overflow-hidden z-20">
                                                        <div className="h-full bg-slate-500 animate-progress"></div>
                                                    </div>
                                                )}
                                                {tasks.length === 0 ? (
                                                    <div className="h-full flex flex-col items-center justify-center py-20 text-center">
                                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                                            <List size={32} />
                                                        </div>
                                                        <p className="text-slate-500 text-sm font-medium mb-1">No hay tareas en este proyecto.</p>
                                                        <p className="text-slate-400 text-xs">Usa el botón "Nueva Tarea" para comenzar.</p>
                                                    </div>
                                                ) : (
                                                    <div className="divide-y divide-slate-100">
                                                        {(hierarchyData.isFlat ? hierarchyData.roots : hierarchyData.roots.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)).map(rootTask => {
                                                            // Helper to render a task row
                                                            const renderTaskRow = (t: Tarea, isChild: boolean = false, hasChildren: boolean = false) => {
                                                                const daysDelayed = t.fechaObjetivo && t.estado !== 'Hecha' && isAfter(startOfDay(new Date()), new Date(t.fechaObjetivo))
                                                                    ? differenceInDays(startOfDay(new Date()), new Date(t.fechaObjetivo))
                                                                    : 0;
                                                                const assignedUser =
                                                                    t.idResponsable
                                                                        ? { id: t.idResponsable, nombre: t.responsableNombre || 'Asignado' }
                                                                        : (t.asignados && t.asignados.length > 0
                                                                            ? { id: t.asignados[0].idUsuario, nombre: t.asignados[0].usuario?.nombre || 'U' }
                                                                            : null);

                                                                return (
                                                                    <div
                                                                        key={t.idTarea}
                                                                        className={`group relative hover:bg-slate-50 transition-colors cursor-pointer 
                                                                            ${selectedTask?.idTarea === t.idTarea ? 'bg-indigo-50/30' : ''} 
                                                                            ${t.estado === 'Bloqueada' ? 'bg-rose-50/20' : ''}
                                                                            ${hasChildren ? 'bg-slate-50/30 font-semibold' : ''}
                                                                        `}
                                                                        onClick={(e) => { e.stopPropagation(); openTaskDetails(t); }}
                                                                    >
                                                                        {/* Mobile/Compact View */}
                                                                        <div className={`md:hidden p-4 space-y-3 ${isChild ? 'pl-8 border-l-4 border-slate-100' : ''}`}>
                                                                            <div className="flex justify-between items-start gap-3">
                                                                                <h4 className={`font-bold text-sm text-slate-800 leading-snug ${t.estado === 'Hecha' ? 'line-through opacity-60' : ''}`}>
                                                                                    {isChild && <span className="text-slate-400 mr-1">↳</span>}
                                                                                    {t.titulo}
                                                                                </h4>
                                                                                <StatusBadge status={t.estado} />
                                                                            </div>
                                                                            {/* ... existing mobile view content ... */}
                                                                        </div>

                                                                        {/* Desktop Grid View - Premium Redesign */}
                                                                        <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 items-center text-xs h-12">
                                                                            <div className="col-span-6 flex items-center gap-2 pr-2 min-w-0">
                                                                                {/* Indentation Spacer */}
                                                                                {isChild && <div className="w-6 shrink-0 flex justify-end"><div className="w-3 h-px bg-slate-300 rounded-full"></div></div>}

                                                                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${t.prioridad === 'Alta' ? 'bg-rose-500' : t.prioridad === 'Media' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                                                                    title={`Prioridad ${t.prioridad}`}
                                                                                />

                                                                                <div className="flex flex-col min-w-0 flex-1">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <p className={`font-semibold text-slate-700 truncate group-hover:text-indigo-700 transition-colors ${t.estado === 'Hecha' ? 'text-slate-400 line-through decoration-slate-300' : ''} ${hasChildren ? 'text-sm font-bold' : 'text-xs'}`}>
                                                                                            {t.titulo}
                                                                                        </p>
                                                                                        <span className="text-[9px] text-slate-300 font-mono hidden xl:inline opacity-0 group-hover:opacity-100">#{t.idTarea}</span>
                                                                                        {hasChildren && <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 rounded-full font-bold h-4 flex items-center">{hierarchyData.childrenMap.get(t.idTarea)?.length}</span>}
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <div className="col-span-2 flex items-center justify-start gap-2 overflow-hidden">
                                                                                <div className="scale-90 origin-left"><StatusBadge status={t.estado} /></div>
                                                                                {!hasChildren && (
                                                                                    <div onClick={(e) => e.stopPropagation()} className="scale-90">
                                                                                        <QuickAssignDropdown
                                                                                            currentAssignee={assignedUser}
                                                                                            team={team}
                                                                                            onAssign={(uid) => handleAssign(t.idTarea, uid)}
                                                                                        />
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                            <div className="col-span-2 flex items-center justify-center text-[10px] text-slate-500">
                                                                                {t.fechaInicioPlanificada || t.fechaObjetivo ? (
                                                                                    <div className="flex items-center gap-1 whitespace-nowrap">
                                                                                        <span>{t.fechaInicioPlanificada ? format(new Date(t.fechaInicioPlanificada), 'd MMM', { locale: es }) : ''}</span>
                                                                                        {(t.fechaInicioPlanificada && t.fechaObjetivo) && <span className="text-slate-300">-</span>}
                                                                                        <span className={`${daysDelayed > 0 ? 'text-rose-600 font-bold' : ''}`}>
                                                                                            {t.fechaObjetivo ? format(new Date(t.fechaObjetivo), 'd MMM', { locale: es }) : ''}
                                                                                        </span>
                                                                                    </div>
                                                                                ) : <span className="text-slate-200">--</span>}
                                                                            </div>

                                                                            <div className="col-span-2 flex items-center gap-2 pl-2">
                                                                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                                    <div
                                                                                        className={`h-full rounded-full transition-all ${t.estado === 'Hecha' ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                                                                        style={{ width: `${t.progreso}%` }}
                                                                                    ></div>
                                                                                </div>
                                                                                <span className="text-[9px] font-bold text-slate-400 w-6 text-right">{t.progreso}%</span>

                                                                                <div className="w-12 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                    {/* Quick Subtask Button (Only for Roots/Parents) */}
                                                                                    {!isChild && (
                                                                                        <button
                                                                                            className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors ${creationParentId === t.idTarea ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'}`}
                                                                                            title="Agregar Subtarea"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                if (creationParentId === t.idTarea) setCreationParentId(null);
                                                                                                else {
                                                                                                    setCreationParentId(t.idTarea);
                                                                                                    setNewSubtaskTitle('');
                                                                                                }
                                                                                            }}
                                                                                        >
                                                                                            <Plus size={14} />
                                                                                        </button>
                                                                                    )}
                                                                                    <button
                                                                                        className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            if (window.confirm('Â¿Seguro?')) handleDeleteTask(t.idTarea);
                                                                                        }}
                                                                                    >
                                                                                        <Trash2 size={14} />
                                                                                    </button>
                                                                                </div>
                                                                            </div>

                                                                        </div>
                                                                    </div>
                                                                );
                                                            };

                                                            const children = hierarchyData.childrenMap.get(rootTask.idTarea) || [];
                                                            const hasKids = children.length > 0;
                                                            const isExpanded = expandedTasks.has(rootTask.idTarea);

                                                            return (
                                                                <React.Fragment key={rootTask.idTarea}>
                                                                    <div className="relative">
                                                                        {hasKids && (
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); toggleExpand(rootTask.idTarea); }}
                                                                                className={`absolute left-0 md:left-2 top-6 z-20 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-full transition-colors 
                                                                                    ${isExpanded ? 'bg-slate-50 text-indigo-500' : '-rotate-90'}`}
                                                                            >
                                                                                <ChevronDown size={14} />
                                                                            </button>
                                                                        )}
                                                                        {renderTaskRow(rootTask, false, hasKids)}
                                                                    </div>

                                                                    {/* Inline Creation Input */}
                                                                    {creationParentId === rootTask.idTarea && (
                                                                        <div className="hidden md:flex ml-12 mr-8 my-2 items-center gap-4 animate-in slide-in-from-top-2 duration-200">
                                                                            <div className="w-8 shrink-0 flex justify-end"><div className="w-4 h-px bg-indigo-300 relative top-0.5"></div></div>
                                                                            <div className="flex-1">
                                                                                <input
                                                                                    autoFocus
                                                                                    type="text"
                                                                                    placeholder="Escribe el nombre de la subtarea y presiona Enter..."
                                                                                    className="w-full bg-white border-2 border-indigo-500 rounded-lg px-4 py-3 text-sm font-bold text-slate-800 shadow-xl focus:outline-none placeholder:text-slate-400 placeholder:font-normal"
                                                                                    value={newSubtaskTitle}
                                                                                    onChange={e => setNewSubtaskTitle(e.target.value)}
                                                                                    onKeyDown={e => {
                                                                                        if (e.key === 'Enter') handleQuickSubtask(rootTask.idTarea);
                                                                                        if (e.key === 'Escape') setCreationParentId(null);
                                                                                    }}
                                                                                />
                                                                                <div className="text-[10px] theme-text-muted mt-1 ml-1 flex items-center gap-2">
                                                                                    <span className="bg-indigo-100 text-indigo-700 px-1.5 rounded font-bold">Enter</span> para guardar
                                                                                    <span className="bg-slate-100 text-slate-500 px-1.5 rounded font-bold">Esc</span> para cancelar
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {isExpanded && children.map(child => renderTaskRow(child, true, false))}
                                                                </React.Fragment>
                                                            );
                                                        })}

                                                        {/* Pagination Controls - Solid Background Fix */}
                                                        {Math.ceil(hierarchyData.roots.length / itemsPerPage) > 1 && (
                                                            <div className="px-4 py-2 flex justify-between items-center border-t border-slate-200 bg-white sticky bottom-0 z-30 shadow-up">
                                                                <button
                                                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                                    disabled={currentPage === 1}
                                                                    className="px-3 py-1 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50"
                                                                >
                                                                    Anterior
                                                                </button>
                                                                <span className="text-[10px] font-bold text-slate-400">
                                                                    {currentPage} / {Math.ceil(hierarchyData.roots.length / itemsPerPage)}
                                                                </span>
                                                                <button
                                                                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(hierarchyData.roots.length / itemsPerPage), p + 1))}
                                                                    disabled={currentPage >= Math.ceil(hierarchyData.roots.length / itemsPerPage)}
                                                                    className="px-3 py-1 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50"
                                                                >
                                                                    Siguiente
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 max-w-md mx-auto text-center">
                                    <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6 text-slate-300 animate-pulse">
                                        <Briefcase size={48} />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-800 mb-2">Comienza tu Planificación</h3>
                                    <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                                        Selecciona un proyecto existente desde el selector superior o crea uno nuevo para empezar a gestionar tareas y cronogramas.
                                    </p>
                                    <button
                                        onClick={() => setIsNewProjectModalOpen(true)}
                                        className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 shadow-xl shadow-slate-200 transition-all hover:-translate-y-1 active:scale-95"
                                    >
                                        <Plus size={18} /> Crear primer proyecto
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div >

            {/* TASK DETAIL SLIDE-OVER */}
            {
                isPanelOpen && selectedTask && (
                    <div className="fixed top-0 right-0 h-full w-[450px] bg-white shadow-2xl border-l border-slate-200 z-50 animate-in slide-in-from-right duration-300 flex flex-col font-sans">
                        {/* Panel Header */}
                        <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6 bg-slate-50/80 backdrop-blur shrink-0">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">ID #{selectedTask.idTarea}</span>
                                    {(selectedTask as any).isLockedByManager && (
                                        <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded text-[9px] font-bold border border-indigo-100 flex items-center gap-1">
                                            <Lock size={8} /> APROBADO
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs font-bold text-slate-700">Detalles de Tarea</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {isManagerMode && selectedTask && (
                                    <button
                                        onClick={() => handleDeleteTask(selectedTask.idTarea)}
                                        className="w-8 h-8 rounded-full hover:bg-rose-50 flex items-center justify-center text-rose-500 transition-colors mr-1"
                                        title="Eliminar tarea"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                                {isManagerMode && (
                                    <button
                                        onClick={() => {
                                            const newStatus = !(selectedTask as any).isLockedByManager;
                                            setSelectedTask({ ...selectedTask, isLockedByManager: newStatus } as any);
                                            showToast(newStatus ? "Tarea bloqueada (Aprobada)" : "Tarea desbloqueada (Editable)", "success");
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors flex items-center gap-1 ${(selectedTask as any).isLockedByManager
                                            ? 'bg-white border-slate-200 text-slate-500 hover:text-slate-700'
                                            : 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100'
                                            }`}
                                    >
                                        {(selectedTask as any).isLockedByManager ? <Unlock size={12} /> : <Lock size={12} />}
                                        {(selectedTask as any).isLockedByManager ? 'Desbloquear' : 'Aprobar & Bloquear'}
                                    </button>
                                )}
                                <button onClick={handleSaveChanges} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-900 shadow-sm transition-transform active:scale-95">
                                    Guardar
                                </button>
                                <button onClick={() => setIsPanelOpen(false)} className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">
                                    <Plus size={20} className="rotate-45" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Title & Desc */}
                            <div className="relative">
                                <LockedField
                                    isLocked={!isManagerMode && ((selectedTask as any).isLockedByManager || (selectedProject as any)?.enllavado)}
                                    onProposal={async () => {
                                        const newTitle = prompt("Proponer nuevo título:", selectedTask.titulo);
                                        if (newTitle && newTitle !== selectedTask.titulo) {
                                            const motivo = prompt("Motivo del cambio (opcional):", "Mejora de redacción");
                                            if (motivo !== null) {
                                                try {
                                                    await clarityService.solicitarCambio(selectedTask.idTarea, 'Titulo', newTitle, motivo || 'Sin motivo especificado');
                                                    showToast("Solicitud de cambio de título enviada", "success");
                                                } catch (error) {
                                                    console.error(error);
                                                    showToast("Error al enviar la solicitud", "error");
                                                }
                                            }
                                        }
                                    }}
                                >
                                    <input
                                        className={`text-xl font-bold text-slate-900 leading-snug mb-2 w-full bg-transparent border border-transparent rounded p-1 outline-none transition-colors ${isManagerMode || !((selectedTask as any).isLockedByManager || (selectedProject as any)?.enllavado) ? 'hover:border-slate-200 focus:border-slate-300' : 'pointer-events-none opacity-80'}`}
                                        value={selectedTask.titulo}
                                        onChange={(e) => (isManagerMode || !((selectedTask as any).isLockedByManager || (selectedProject as any)?.enllavado)) && setSelectedTask({ ...selectedTask, titulo: e.target.value })}
                                        readOnly={!isManagerMode && ((selectedTask as any).isLockedByManager || (selectedProject as any)?.enllavado)}
                                    />
                                </LockedField>

                                <LockedField
                                    isLocked={!isManagerMode && ((selectedTask as any).isLockedByManager || (selectedProject as any)?.enllavado)}
                                    onProposal={async () => {
                                        const newDesc = prompt("Proponer nueva descripción:", selectedTask.descripcion || "");
                                        if (newDesc && newDesc !== selectedTask.descripcion) {
                                            const motivo = prompt("Motivo del cambio (opcional):", "Mayor detalle requerido");
                                            if (motivo !== null) {
                                                try {
                                                    await clarityService.solicitarCambio(selectedTask.idTarea, 'Descripcion', newDesc, motivo || 'Sin motivo especificado');
                                                    showToast("Solicitud de cambio de descripción enviada", "success");
                                                } catch (error) {
                                                    console.error(error);
                                                    showToast("Error al enviar la solicitud", "error");
                                                }
                                            }
                                        }
                                    }}
                                >
                                    <textarea
                                        className={`text-sm text-slate-600 leading-relaxed w-full min-h-[80px] bg-slate-50 border border-slate-100 rounded-lg p-3 outline-none resize-none transition-all focus:shadow-sm ${isManagerMode || !((selectedTask as any).isLockedByManager || (selectedProject as any)?.enllavado) ? 'focus:bg-white focus:border-slate-300' : 'cursor-not-allowed bg-slate-50/50'}`}
                                        value={selectedTask.descripcion || ''}
                                        onChange={(e) => (isManagerMode || !((selectedTask as any).isLockedByManager || (selectedProject as any)?.enllavado)) && setSelectedTask({ ...selectedTask, descripcion: e.target.value })}
                                        placeholder="Añadir a descripción..."
                                        readOnly={!isManagerMode && ((selectedTask as any).isLockedByManager || (selectedProject as any)?.enllavado)}
                                    />
                                </LockedField>
                            </div>

                            {/* Status & Priority Cards */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Estado Actual</label>
                                    <div className="relative">
                                        <select
                                            className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-3 pr-8 text-xs font-bold text-slate-700 outline-none focus:border-slate-500 appearance-none cursor-pointer"
                                            value={selectedTask.estado}
                                            onChange={(e) => setSelectedTask({ ...selectedTask, estado: e.target.value as any })}
                                            title="Actualizar estado de la tarea"
                                        >
                                            <option value="Pendiente">⚪ Pendiente</option>
                                            <option value="EnCurso">🔵 En Curso</option>
                                            <option value="Bloqueada">🔴 Bloqueada</option>
                                            <option value="Revision">🟣 Revisión</option>
                                            <option value="Hecha">🟢 Hecha</option>
                                        </select>
                                        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Prioridad</label>
                                    <div className="relative">
                                        <select
                                            className={`w-full bg-white border border-slate-200 rounded-lg py-2 pl-3 pr-8 text-xs font-bold text-slate-700 outline-none appearance-none ${isManagerMode ? 'focus:border-slate-500 cursor-pointer' : 'opacity-75 cursor-not-allowed bg-slate-100'}`}
                                            value={selectedTask.prioridad}
                                            onChange={(e) => isManagerMode && setSelectedTask({ ...selectedTask, prioridad: e.target.value as any })}
                                            disabled={!isManagerMode}
                                            title={!isManagerMode ? "Solo el manager puede cambiar la prioridad" : "Cambiar prioridad"}
                                        >
                                            <option value="Baja">Baja</option>
                                            <option value="Media">Media</option>
                                            <option value="Alta">Alta</option>
                                        </select>
                                        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <h4 className="text-xs font-bold text-slate-600 mb-3 flex items-center gap-2">
                                    <CalendarIcon size={14} /> Planificación
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <LockedField
                                            label="Inicio"
                                            isLocked={!isManagerMode && ((selectedTask as any).isLockedByManager || (selectedProject as any)?.enllavado)}
                                            onProposal={async () => {
                                                const newDate = prompt("Proponer nueva fecha inicio (YYYY-MM-DD):", selectedTask.fechaInicioPlanificada ? format(new Date(selectedTask.fechaInicioPlanificada), 'yyyy-MM-dd') : '');
                                                if (newDate) {
                                                    const motivo = prompt("Motivo del cambio (requerido):", "Reprogramación por bloqueo externo");
                                                    if (motivo !== null) {
                                                        try {
                                                            await clarityService.solicitarCambio(selectedTask.idTarea, 'Inicio', newDate, motivo || 'Sin motivo especificado');
                                                            showToast("Solicitud de cambio de fecha inicio enviada", "success");
                                                        } catch (error) {
                                                            console.error(error);
                                                            showToast("Error al enviar la solicitud", "error");
                                                        }
                                                    }
                                                }
                                            }}
                                        >
                                            <input
                                                type="date"
                                                className={`w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 outline-none ${isManagerMode || !((selectedTask as any).isLockedByManager || (selectedProject as any)?.enllavado) ? 'focus:border-slate-400' : 'cursor-not-allowed opacity-70'}`}
                                                value={selectedTask.fechaInicioPlanificada ? format(new Date(selectedTask.fechaInicioPlanificada), 'yyyy-MM-dd') : ''}
                                                onChange={(e) => (isManagerMode || !((selectedTask as any).isLockedByManager || (selectedProject as any)?.enllavado)) && setSelectedTask({ ...selectedTask, fechaInicioPlanificada: e.target.value ? e.target.value : undefined })}
                                                readOnly={!isManagerMode && ((selectedTask as any).isLockedByManager || (selectedProject as any)?.enllavado)}
                                            />
                                        </LockedField>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">Vencimiento</label>
                                        <input
                                            type="date"
                                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-slate-400"
                                            value={selectedTask.fechaObjetivo ? format(new Date(selectedTask.fechaObjetivo), 'yyyy-MM-dd') : ''}
                                            onChange={(e) => setSelectedTask({ ...selectedTask, fechaObjetivo: e.target.value ? e.target.value : undefined })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* TIPO Y EVIDENCIA (NUEVO) */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">Tipo Trabajo</label>
                                    <select
                                        value={selectedTask.tipo || 'Administrativa'}
                                        onChange={(e) => setSelectedTask({ ...selectedTask, tipo: e.target.value as any })}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-slate-400"
                                    >
                                        <option value="Administrativa">Administrativa</option>
                                        <option value="Logistica">Logística</option>
                                        <option value="Estrategica">Estratégica</option>
                                        <option value="Otros">Otros</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">Evidencia (URL)</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={selectedTask.linkEvidencia || ''}
                                            onChange={(e) => setSelectedTask({ ...selectedTask, linkEvidencia: e.target.value })}
                                            placeholder="https://..."
                                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 pl-6 text-xs text-slate-600 outline-none focus:border-slate-400 truncate"
                                        />
                                        <Link2 size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                    </div>
                                </div>
                            </div>

                            {/* Progress or Monthly Manager */}
                            {selectedTask.comportamiento === 'LARGA' ? (
                                <div className="mb-4">
                                    <div className="flex justify-between mb-2">
                                        <label className="text-xs font-bold text-slate-700">Avance Mensual (Larga Duración)</label>
                                        <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100">
                                            {selectedTask.progreso || 0}% Global
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setIsAvanceMensualOpen(true)}
                                        className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-indigo-200 text-indigo-700 rounded-xl font-bold text-xs hover:bg-indigo-50 hover:border-indigo-300 transition-all shadow-sm group"
                                    >
                                        <CalendarIcon size={16} className="text-indigo-500 group-hover:scale-110 transition-transform" />
                                        Gestionar Avance y Comentarios
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <label className="text-xs font-bold text-slate-700">Progreso</label>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${selectedTask.estado === 'Bloqueada' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                                            {selectedTask.progreso || 0}%
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        className={`w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer ${selectedTask.estado === 'Bloqueada' ? 'accent-red-500' : 'accent-slate-700'}`}
                                        value={selectedTask.progreso || 0}
                                        onChange={(e) => setSelectedTask({ ...selectedTask, progreso: parseInt(e.target.value) })}
                                    />
                                </div>
                            )}

                            <hr className="border-slate-100" />

                            {/* BLOCKER SECTION */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-600 uppercase mb-3 flex items-center gap-2">
                                    <AlertCircle size={14} /> Gestión de Riesgos
                                </h4>

                                {selectedTask.estado === 'Bloqueada' ? (
                                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 animate-in zoom-in-95">
                                        <div className="flex items-start gap-3">
                                            <div className="bg-rose-100 p-2 rounded-full text-rose-600 shrink-0">
                                                <AlertCircle size={20} />
                                            </div>
                                            <div>
                                                <h5 className="font-bold text-rose-700 text-sm">Tarea Bloqueada</h5>
                                                <p className="text-xs text-rose-600 mt-1">Esta tarea presenta impedimentos y requiere atención.</p>
                                            </div>
                                            <button
                                                onClick={() => setSelectedTask({ ...selectedTask, estado: 'EnCurso' })}
                                                className="ml-auto text-xs font-bold text-rose-600 border border-rose-200 bg-white px-3 py-1.5 rounded-lg hover:bg-rose-50"
                                            >
                                                Desbloquear
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    isReportingBlocker ? (
                                        <div className="bg-rose-50 border border-slate-200 rounded-xl p-4 animate-in zoom-in-95 space-y-3">
                                            <h5 className="font-bold text-slate-700 text-xs uppercase">Detalles del Bloqueo</h5>
                                            <textarea
                                                className="w-full text-xs text-slate-700 bg-white border border-slate-200 rounded-lg p-3 outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-200 transition-all placeholder:text-slate-400"
                                                placeholder="Describa qué está impidiendo avanzar (Opcional)..."
                                                rows={2}
                                                value={blockerReason}
                                                onChange={(e) => setBlockerReason(e.target.value)}
                                                autoFocus
                                            />
                                            <div>
                                                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Área responsable (Opcional)</label>
                                                <select
                                                    className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 outline-none focus:border-rose-400"
                                                    value={blockerArea}
                                                    onChange={(e) => setBlockerArea(e.target.value)}
                                                >
                                                    <option value="">Seleccionar área...</option>
                                                    <option value="IT">Tecnología (IT)</option>
                                                    <option value="RRHH">Recursos Humanos</option>
                                                    <option value="FIN">Finanzas</option>
                                                    <option value="OPS">Operaciones</option>
                                                    <option value="EXT">Proveedor Externo</option>
                                                </select>
                                            </div>
                                            <div className="flex gap-2 justify-end pt-2">
                                                <button
                                                    onClick={() => setIsReportingBlocker(false)}
                                                    className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    onClick={handleReportBlocker}
                                                    className="px-3 py-1.5 bg-rose-500 text-white rounded-lg text-xs font-bold hover:bg-rose-600 shadow-sm"
                                                >
                                                    Confirmar Bloqueo
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setIsReportingBlocker(true)}
                                            className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-rose-300 hover:text-rose-500 hover:bg-rose-50 transition-all group"
                                        >
                                            <AlertCircle size={16} className="group-hover:scale-110 transition-transform" />
                                            <span className="text-xs font-bold">Reportar Bloqueo o Impedimento</span>
                                        </button>
                                    )
                                )}
                            </div>

                            {/* COMMENTS SECTION */}
                            <div className="flex-1 flex flex-col min-h-[200px]">
                                <h4 className="text-xs font-bold text-slate-600 uppercase mb-3 flex items-center gap-2">
                                    <MoreVertical size={14} /> Comentarios
                                </h4>

                                <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden flex flex-col flex-1 min-h-[200px]">
                                    <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-[300px]">
                                        {(!comments[selectedTask.idTarea] || comments[selectedTask.idTarea].length === 0) && (
                                            <div className="text-center py-6 text-slate-400 italic text-xs">
                                                No hay comentarios. Sé el primero.
                                            </div>
                                        )}
                                        {(comments[selectedTask.idTarea] || []).map(c => (
                                            <div key={c.id} className="flex gap-3">
                                                <UserAvatar name={c.user} />
                                                <div className="flex-1 bg-white p-2.5 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm">
                                                    <div className="flex justify-between items-baseline mb-1">
                                                        <span className="text-[11px] font-bold text-slate-800">{c.user}</span>
                                                        <span className="text-[9px] text-slate-400">{c.timestamp}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-600">{c.text}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-2 bg-white border-t border-slate-100 flex gap-2">
                                        <input
                                            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-slate-400 focus:bg-white transition-colors"
                                            placeholder="Escribe un comentario..."
                                            value={newComment}
                                            onChange={e => setNewComment(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                                        />
                                        <button
                                            onClick={handleAddComment}
                                            disabled={!newComment.trim()}
                                            className="bg-slate-800 text-white p-2 rounded-lg hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="h-6"></div> {/* Spacer */}
                        </div>
                    </div>
                )
            }

            {/* MODALS */}
            {
                isCreateTaskOpen && selectedProject && (
                    <CreateTaskModal
                        isOpen={isCreateTaskOpen}
                        onClose={() => setIsCreateTaskOpen(false)}
                        currentProject={selectedProject}
                        onTaskCreated={loadTasks}
                        defaultTeam={team.map(m => ({ ...m, nombreCompleto: m.nombre } as any))}
                    />
                )
            }

            {/* AVANCE MENSUAL MODAL (LARGA DURACION) */}
            {
                isAvanceMensualOpen && selectedTask && (
                    <AvanceMensualModal
                        isOpen={isAvanceMensualOpen}
                        onClose={() => setIsAvanceMensualOpen(false)}
                        task={selectedTask}
                        onSaved={async () => {
                            const newTasks = await loadTasks();
                            const updated = newTasks.find(t => t.idTarea === selectedTask.idTarea);
                            if (updated) setSelectedTask(updated);
                        }}
                    />
                )
            }

            {/* NEW PROJECT MODAL */}
            {
                isSaving && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-xl p-6 flex flex-col items-center gap-4 animate-in zoom-in-95">
                            <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                            <p className="text-slate-600 font-bold text-sm">Guardando cambios...</p>
                        </div>
                    </div>
                )
            }

            {
                isNewProjectModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 border border-slate-100 scale-in-center animate-in zoom-in-95">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-black text-xl text-slate-800 tracking-tight">Nuevo Proyecto</h3>
                                <button onClick={() => setIsNewProjectModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <Plus size={24} className="rotate-45" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Nombre del Proyecto</label>
                                    <input
                                        autoFocus
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-800/5 focus:border-slate-800 transition-all"
                                        placeholder="Ej. Lanzamiento Q1..."
                                        value={newProjectName}
                                        onChange={e => setNewProjectName(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleNewProject()}
                                        disabled={isCreatingProject}
                                    />
                                </div>

                                <button
                                    onClick={handleNewProject}
                                    disabled={isCreatingProject || !newProjectName.trim()}
                                    className="w-full py-3.5 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-slate-200 transition-all flex items-center justify-center gap-2"
                                >
                                    {isCreatingProject ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                            <span>Creando y cargando...</span>
                                        </>
                                    ) : (
                                        <span>Crear Proyecto</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

// --- SUB COMPONENTS ---

// TaskCreationRow removed as per design request
