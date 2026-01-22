import React, { useEffect, useState } from 'react';
import { clarityService } from '../../services/clarity.service';
import type { Tarea, Usuario } from '../../types/modelos';
import { useAuth } from '../../context/AuthContext';
import {
    eachDayOfInterval,
    startOfWeek,
    endOfWeek,
    addWeeks,
    subWeeks,
    format,
    isSameDay,
    isWeekend
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSecureHTML } from '../../hooks/useSecureHTML';

export const WorkloadPage: React.FC = () => {
    const { user } = useAuth();
    const { sanitize } = useSecureHTML();
    const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 })); // Lunes
    const [tasks, setTasks] = useState<Tarea[]>([]);
    const [team, setTeam] = useState<Usuario[]>([]);
    const [loading, setLoading] = useState(true);

    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    // Load real team and workload data from API
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const data = await clarityService.getWorkload();
                if (data) {
                    setTeam(data.users || []);
                    setTasks(data.tasks || []);
                }
            } catch (e) {
                // Error de carga - UI muestra estado vacío
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [user]);

    // Heatmap Helper
    const getTasksForUserAndDay = (userId: number, date: Date) => {
        return tasks.filter(t => {
            const isAssigned = t.asignados?.some(a => a.idUsuario === userId) || false;
            if (!isAssigned) return false;
            const start = t.fechaInicioPlanificada ? new Date(t.fechaInicioPlanificada) : null;
            const end = t.fechaObjetivo ? new Date(t.fechaObjetivo) : null;
            if (!start) return false;
            if (!end) return isSameDay(date, start);
            return date >= start && date <= end;
        });
    };

    // Filter & Grouping Logic
    const [filterTerm, setFilterTerm] = useState('');

    // 1. Filter Users
    const filteredUsers = team.filter(u =>
        (u.nombre || '').toLowerCase().includes(filterTerm.toLowerCase()) ||
        (u.correo || '').toLowerCase().includes(filterTerm.toLowerCase()) ||
        (u.carnet || '').toLowerCase().includes(filterTerm.toLowerCase()) ||
        (u.rol?.nombre && u.rol.nombre.toLowerCase().includes(filterTerm.toLowerCase()))
    );

    // 2. Group by Role/Dept
    // We'll treat 'rol' as the Department provided in the mock data (e.g. 'RRHH', 'Dev')
    // If role is missing, group under 'General'
    const groupedUsers: Record<string, Usuario[]> = {};
    filteredUsers.forEach(u => {
        const group = u.rol?.nombre || 'General';
        if (!groupedUsers[group]) groupedUsers[group] = [];
        groupedUsers[group].push(u);
    });

    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

    const toggleGroup = (group: string) => {
        setCollapsedGroups(prev => ({ ...prev, [group]: !prev[group] }));
    };

    // 3. Task Details Modal State
    const [selectedTask, setSelectedTask] = useState<Tarea | null>(null);

    return (
        <div className="bg-slate-50 min-h-screen flex flex-col font-sans">
            {/* DASHBOARD SUMMARY - New Feature */}
            <div className="bg-white px-6 py-3 border-b border-slate-200 flex flex-wrap gap-6 items-center text-xs shadow-sm z-30 relative justify-between">
                <div className="flex gap-6">
                    <div className="flex flex-col">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Total Empleados</span>
                        <span className="text-lg font-black text-slate-700">{team.length}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Departamentos</span>
                        <span className="text-lg font-black text-slate-700">{Object.keys(groupedUsers).length}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Tareas Totales</span>
                        <span className="text-lg font-black text-indigo-600">{tasks.length}</span>
                    </div>
                    {/* Add more metrics as needed */}
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span> <span className="text-slate-500 font-medium">Prioridad Alta</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 ml-2"></span> <span className="text-slate-500 font-medium">Completada</span>
                </div>
            </div>

            {/* CONTROLS HEADER */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm z-20 sticky top-0">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Users className="text-slate-600" size={20} />
                            Planificador de Recursos: {format(weekStart, 'MMMM yyyy', { locale: es })}
                        </h1>
                        <p className="text-xs text-slate-500">Gestión de capacidad multidepartamental.</p>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <input
                                type="text"
                                placeholder="Buscar recurso, rol o tarea..."
                                className="w-full pl-8 pr-3 py-1.5 bg-slate-100 border-transparent focus:bg-white border focus:border-indigo-500 rounded-md text-xs font-medium outline-none transition-all"
                                value={filterTerm}
                                onChange={e => setFilterTerm(e.target.value)}
                            />
                            <Users size={14} className="absolute left-2.5 top-1.5 text-slate-400" />
                        </div>

                        <div className="flex items-center bg-slate-100 rounded-md p-0.5 border border-slate-200">
                            <button onClick={() => setWeekStart(d => subWeeks(d, 1))} className="p-1 hover:bg-white rounded hover:shadow-sm text-slate-600"><ChevronLeft size={16} /></button>
                            <span className="w-24 text-center text-[10px] font-bold text-slate-600 uppercase">
                                {format(weekStart, 'd MMM', { locale: es })} - {format(weekEnd, 'd MMM', { locale: es })}
                            </span>
                            <button onClick={() => setWeekStart(d => addWeeks(d, 1))} className="p-1 hover:bg-white rounded hover:shadow-sm text-slate-600"><ChevronRight size={16} /></button>
                        </div>
                    </div>
                </div>
            </div>

            {/* SCHEDULER GRID */}
            <div className="flex-1 overflow-auto bg-slate-50 p-4">
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 min-w-[1000px] overflow-hidden">
                    {/* Header Row */}
                    <div className="flex border-b border-slate-200 bg-slate-50/90 text-xs font-bold text-slate-500 uppercase z-10 sticky top-0">
                        <div className="w-64 p-3 border-r border-slate-200 shrink-0 sticky left-0 bg-slate-50 z-20 shadow-[1px_0_5px_rgba(0,0,0,0.05)]">
                            Empleado / Subgerencia
                        </div>
                        {days.map(d => (
                            <div key={d.toISOString()} className={`flex-1 min-w-[120px] p-2 text-center border-r border-slate-100 ${isWeekend(d) ? 'bg-slate-100/50 text-slate-400' : ''} ${isSameDay(d, new Date()) ? 'bg-indigo-50 text-indigo-700' : ''}`}>
                                <div>{format(d, 'EEE', { locale: es })}</div>
                                <div className="text-sm text-slate-800">{format(d, 'd')}</div>
                            </div>
                        ))}
                    </div>

                    {/* Content */}
                    <div>
                        {loading && <div className="p-10 text-center text-slate-400">Cargando planificación...</div>}

                        {!loading && Object.keys(groupedUsers).length === 0 && (
                            <div className="p-10 text-center text-slate-400 italic">No se encontraron empleados con ese criterio.</div>
                        )}

                        {!loading && Object.keys(groupedUsers).sort().map(groupName => {
                            const isCollapsed = collapsedGroups[groupName];
                            return (
                                <div key={groupName} className="border-b border-slate-200 last:border-0">
                                    <div
                                        className="bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 flex items-center gap-2 cursor-pointer hover:bg-slate-100 transition-colors sticky left-0 z-10 w-full border-b border-slate-100"
                                        onClick={() => toggleGroup(groupName)}
                                    >
                                        <span className={`transform transition-transform ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}>▼</span>
                                        {groupName} <span className="text-slate-400 font-normal">({groupedUsers[groupName].length})</span>
                                    </div>

                                    {!isCollapsed && groupedUsers[groupName].map(member => (
                                        <div key={member.idUsuario} className="flex border-b border-slate-50 hover:bg-slate-50/50 transition-colors group h-auto min-h-[60px]">
                                            <div className="w-64 p-3 border-r border-slate-200 bg-white group-hover:bg-slate-50 shrink-0 sticky left-0 z-10 shadow-[1px_0_5px_rgba(0,0,0,0.05)] flex items-center gap-3">
                                                <div className="w-8 h-8 rounded bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs border border-slate-200">
                                                    {member.nombre.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-slate-800">{member.nombre}</div>
                                                    <div className="text-[10px] text-slate-400">{member.correo || 'Sin correo'}</div>
                                                </div>
                                            </div>

                                            {days.map(day => {
                                                const dayTasks = getTasksForUserAndDay(member.idUsuario, day);
                                                return (
                                                    <div key={day.toISOString()} className={`flex-1 min-w-[120px] p-2 border-r border-slate-100 flex flex-col gap-1 ${isWeekend(day) ? 'bg-slate-50/30' : ''}`}>
                                                        {dayTasks.map(t => (
                                                            <div
                                                                key={t.idTarea}
                                                                className={`text-[10px] px-2 py-1 rounded border shadow-sm cursor-pointer truncate transition-all hover:scale-[1.02] hover:z-20 relative ${t.prioridad === 'Alta' ? 'bg-rose-50 border-rose-200 text-rose-700 font-medium' :
                                                                    t.estado === 'Hecha' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 line-through opacity-70' :
                                                                        'bg-white border-slate-200 text-slate-600'
                                                                    }`}
                                                                title={`Clic para ver detalles`}
                                                                onClick={() => setSelectedTask(t)}
                                                            >
                                                                {t.titulo}
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* TASK DETAILS MODAL */}
            {selectedTask && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedTask(null)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800">Detalles de la Tarea</h3>
                            <button onClick={() => setSelectedTask(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase">Tarea</label>
                                <p className="text-slate-800 font-medium text-lg">{selectedTask.titulo}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase">Estado</label>
                                    <span className={`block w-fit px-2 py-1 rounded text-xs font-bold mt-1 ${selectedTask.estado === 'Hecha' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                                        {selectedTask.estado}
                                    </span>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase">Prioridad</label>
                                    <span className={`block w-fit px-2 py-1 rounded text-xs font-bold mt-1 ${selectedTask.prioridad === 'Alta' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {selectedTask.prioridad || 'Normal'}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase">Descripción</label>
                                <div
                                    className="text-slate-600 text-sm mt-1 bg-slate-50 p-3 rounded-lg border border-slate-100 min-h-[60px]"
                                    dangerouslySetInnerHTML={sanitize(selectedTask.descripcion || 'Sin descripción disponible.')}
                                />
                            </div>
                            <div className="pt-4 border-t border-slate-100 flex justify-end">
                                <button
                                    onClick={() => setSelectedTask(null)} // In real app, could link to Task Edit page
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700"
                                >
                                    Editar Tarea
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
