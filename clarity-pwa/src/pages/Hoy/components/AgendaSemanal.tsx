import React, { useState, useEffect, useCallback } from 'react';
import { clarityService } from '../../../services/clarity.service';
// import { useAuth } from '../../../context/AuthContext';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import type { Tarea } from '../../../types/modelos';
import { TaskDetailModalV2 } from '../../../components/task-detail-v2/TaskDetailModalV2';



interface DayData {
    date: string;
    dayName: string;
    dayNumber: number;
    monthName: string;
    isToday: boolean;
    isPast: boolean;
    tasks: Tarea[];
}



export const AgendaSemanal: React.FC = () => {
    const [weekOffset, setWeekOffset] = useState(0);
    // const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [weekData, setWeekData] = useState<DayData[]>([]);
    const [selectedTask, setSelectedTask] = useState<Tarea | null>(null);

    const getDayName = (date: Date): string => ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][date.getDay()];
    const getMonthName = (date: Date): string => ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][date.getMonth()];

    const loadWeekData = useCallback(async () => {
        setLoading(true);
        try {
            // Calculate Current View Range
            const today = new Date();
            const currentDay = today.getDay(); // 0 (Sun) to 6 (Sat)
            const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1); // Adjust to get Monday
            const monday = new Date(today);
            monday.setDate(diff + (weekOffset * 7));
            monday.setHours(0, 0, 0, 0);

            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            sunday.setHours(23, 59, 59, 999);

            const startDateStr = monday.toISOString().split('T')[0];
            const endDateStr = sunday.toISOString().split('T')[0];

            console.log('[AgendaSemanal] Fetching range:', startDateStr, 'to', endDateStr);

            // Fetch tasks for the specific range
            const tasks = await clarityService.getMisTareas({
                startDate: startDateStr,
                endDate: endDateStr
            }) || [];

            console.log('[AgendaSemanal] Tasks received:', tasks.length);

            // Generate Days
            const days: DayData[] = [];
            const todayStr = new Date().toISOString().split('T')[0];

            for (let i = 0; i < 7; i++) {
                const d = new Date(monday);
                d.setDate(d.getDate() + i);
                const dStr = d.toISOString().split('T')[0];

                days.push({
                    date: dStr,
                    dayName: getDayName(d),
                    dayNumber: d.getDate(),
                    monthName: getMonthName(d),
                    isToday: dStr === todayStr,
                    isPast: dStr < todayStr,
                    tasks: []
                });
            }

            // Map Tasks
            tasks.forEach((t: Tarea) => {
                // Priority: fechaObjetivo > fechaHecha > fechaCreacion
                // Now we strictly trust startDate/endDate filter from backend for 'fechaObjetivo' 
                // but we must place them in the correct slot.
                // We use 'fechaObjetivo' as the primary slot for Agenda.
                const targetDate = t.fechaObjetivo || t.fechaHecha || t.fechaCreacion;
                if (targetDate) {
                    const dateStr = typeof targetDate === 'string' ? targetDate.substring(0, 10) : (targetDate as any).toISOString().split('T')[0];
                    const idx = days.findIndex(d => d.date === dateStr);
                    if (idx >= 0) days[idx].tasks.push(t);
                }
            });

            setWeekData(days);
        } catch (e) {
            console.error('Error:', e);
        } finally {
            setLoading(false);
        }
    }, [weekOffset]);

    useEffect(() => { loadWeekData(); }, [loadWeekData]);

    const selectTask = (task: Tarea) => {
        setSelectedTask(task);
    };





    const getStatusColor = (estado: string) => {
        const colors: Record<string, string> = {
            'Hecha': 'bg-green-500',
            'EnCurso': 'bg-blue-500',
            'Pausa': 'bg-orange-400',
            'Bloqueada': 'bg-red-500',
            'Revision': 'bg-purple-500',
            'Descartada': 'bg-gray-400',
            'Pendiente': 'bg-yellow-500'
        };
        return colors[estado] || 'bg-gray-400';
    };

    const getStatusBg = (estado: string) => {
        const colors: Record<string, string> = {
            'Hecha': 'bg-green-50',
            'EnCurso': 'bg-blue-50',
            'Pausa': 'bg-orange-50',
            'Bloqueada': 'bg-red-50',
            'Revision': 'bg-purple-50',
            'Descartada': 'bg-gray-100',
            'Pendiente': 'bg-yellow-50'
        };
        return colors[estado] || 'bg-gray-50';
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center">
                <Loader2 className="animate-spin mx-auto text-indigo-500 mb-2" size={24} />
                <p className="text-gray-400 text-sm">Cargando calendario...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full gap-4">
            {selectedTask && (
                <TaskDetailModalV2
                    task={selectedTask}
                    mode="execution"
                    onClose={() => setSelectedTask(null)}
                    onUpdate={() => {
                        loadWeekData();
                        setSelectedTask(null);
                    }}
                />
            )}
            {/* Calendario */}
            <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all w-full`}>
                {/* Header */}
                <div className="px-4 py-3 bg-indigo-600 text-white flex items-center justify-between">
                    <button onClick={() => setWeekOffset(wo => wo - 1)} className="p-2 hover:bg-indigo-700 rounded-lg"><ChevronLeft size={18} /></button>
                    <div className="text-center">
                        <h3 className="text-sm font-bold">📅 Calendario Semanal</h3>
                        <p className="text-xs text-indigo-200">
                            {weekOffset === 0 ? 'Esta semana' : weekOffset > 0 ? `En ${weekOffset} sem.` : `Hace ${Math.abs(weekOffset)} sem.`}
                        </p>
                    </div>
                    <button onClick={() => setWeekOffset(wo => wo + 1)} className="p-2 hover:bg-indigo-700 rounded-lg"><ChevronRight size={18} /></button>
                </div>

                {/* Grilla */}
                <div className="grid grid-cols-7 divide-x divide-gray-100 min-h-[400px]">
                    {weekData.map(day => (
                        <div key={day.date} className={`flex flex-col ${day.isToday ? 'bg-indigo-50' : day.isPast ? 'bg-gray-50/50' : 'bg-white'}`}>
                            <div className={`p-2 text-center border-b ${day.isToday ? 'bg-indigo-100 border-indigo-200' : 'bg-gray-50 border-gray-100'}`}>
                                <p className={`text-[10px] font-bold uppercase ${day.isToday ? 'text-indigo-600' : 'text-gray-400'}`}>{day.dayName}</p>
                                <p className={`text-xl font-black ${day.isToday ? 'text-indigo-600' : 'text-gray-700'}`}>{day.dayNumber}</p>
                                <p className="text-[9px] text-gray-400">{day.monthName}</p>
                            </div>
                            <div className="flex-1 p-1.5 space-y-1 overflow-y-auto max-h-[300px]">
                                {day.tasks.length === 0 ? (
                                    <p className="text-[10px] text-gray-300 text-center py-6">—</p>
                                ) : day.tasks.map(task => (
                                    <button
                                        key={task.idTarea}
                                        onClick={() => selectTask(task)}
                                        className={`w-full text-left p-1.5 rounded border-l-3 transition-all ${getStatusBg(task.estado)} ${selectedTask?.idTarea === task.idTarea ? 'ring-2 ring-indigo-500' : 'hover:shadow-md'
                                            } ${task.estado === 'Hecha' || task.estado === 'Descartada' ? 'opacity-50' : ''}`}
                                    >
                                        <div className="flex items-start gap-1.5">
                                            <span className={`w-2 h-2 rounded-full ${getStatusColor(task.estado)} shrink-0 mt-1`}></span>
                                            <span className={`text-[10px] leading-tight ${task.estado === 'Hecha' ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                                {task.titulo.length > 15 ? task.titulo.substring(0, 15) + '...' : task.titulo}
                                            </span>
                                        </div>
                                        {task.progreso > 0 && task.progreso < 100 && (
                                            <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                                                <div className={`h-full ${getStatusColor(task.estado)}`} style={{ width: `${task.progreso}%` }}></div>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>


        </div>
    );
};
