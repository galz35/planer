import React, { useState } from 'react';
import { AgendaSemanal } from '../components/AgendaSemanal';
import { AgendaMensual } from '../components/AgendaMensual';
import { Calendar, LayoutGrid } from 'lucide-react';
import type { Tarea } from '../../../types/modelos';
import { TaskDetailModalV2 } from '../../../components/task-detail-v2/TaskDetailModalV2';

export const CalendarView: React.FC = () => {
    const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
    const [selectedTask, setSelectedTask] = useState<Tarea | null>(null);

    return (
        <div className="h-full flex flex-col animate-fade-in overflow-hidden p-4 gap-4">
            {/* View Selector */}
            <div className="flex justify-end">
                <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-200 flex gap-1">
                    <button
                        onClick={() => setViewMode('week')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'week'
                            ? 'bg-slate-900 text-white shadow-lg'
                            : 'text-slate-500 hover:bg-slate-50'
                            }`}
                    >
                        <LayoutGrid size={16} />
                        Semana
                    </button>
                    <button
                        onClick={() => setViewMode('month')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'month'
                            ? 'bg-slate-900 text-white shadow-lg'
                            : 'text-slate-500 hover:bg-slate-50'
                            }`}
                    >
                        <Calendar size={16} />
                        Mes
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                {viewMode === 'week' ? (
                    <AgendaSemanal />
                ) : (
                    <AgendaMensual onSelectTask={(t) => setSelectedTask(t)} />
                )}
            </div>

            {selectedTask && (
                <TaskDetailModalV2
                    task={selectedTask}
                    mode="execution"
                    onClose={() => setSelectedTask(null)}
                    onUpdate={() => {
                        setSelectedTask(null);
                        // Force data reload in context or components if needed
                        window.location.reload(); // Quick fix or rely on useQuery revalidation if using it
                    }}
                />
            )}
        </div>
    );
};
