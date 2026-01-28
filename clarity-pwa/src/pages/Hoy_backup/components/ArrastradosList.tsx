import React from 'react';
import type { Tarea } from '../../../types/modelos';
import { TaskCard } from '../../../components/ui/TaskCard';

interface Props {
    tareas: Tarea[];
    onRevalidar: (idTarea: number, accion: 'Sigue' | 'HechaPorOtro' | 'NoAplica') => void;
}

export const ArrastradosList: React.FC<Props> = ({ tareas, onRevalidar }) => {
    if (tareas.length === 0) return null;

    return (
        <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wider">Pendientes de Ayer</h3>
            <div className="space-y-3">
                {tareas.map((tarea) => (
                    <div key={tarea.idTarea} className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                        <TaskCard tarea={tarea} compact />
                        <div className="flex gap-2 mt-2 pt-2 border-t border-slate-200">
                            <button
                                onClick={() => onRevalidar(tarea.idTarea, 'Sigue')}
                                className="flex-1 bg-white border border-slate-300 rounded text-xs py-1.5 font-medium text-slate-700 hover:bg-slate-50"
                            >
                                ✅ Sigue
                            </button>
                            <button
                                onClick={() => onRevalidar(tarea.idTarea, 'HechaPorOtro')}
                                className="flex-1 bg-white border border-slate-300 rounded text-xs py-1.5 font-medium text-slate-700 hover:bg-slate-50"
                            >
                                🟦 Otro
                            </button>
                            <button
                                onClick={() => onRevalidar(tarea.idTarea, 'NoAplica')}
                                className="flex-1 bg-white border border-slate-300 rounded text-xs py-1.5 font-medium text-slate-700 hover:bg-slate-50"
                            >
                                🗑️ Borrar
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
