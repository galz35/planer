import React, { useState } from 'react';
import { Users, Search, CheckCircle, Clock, Ban } from 'lucide-react';
import type { Tarea, Usuario } from '../../types/modelos';

interface Props {
    task: Tarea;
    team: Usuario[];
    onCancel: () => void;
    onReassign: (id: number) => void;
    onAction: (action: 'HechaPorOtro' | 'NoAplica' | 'Posponer') => void;
    submitting: boolean;
}

export const ReassignView: React.FC<Props> = ({ task, team, onCancel, onReassign, onAction, submitting }) => {
    const [search, setSearch] = useState('');
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

    const filteredTeam = team.filter(u =>
        (u.nombre || '').toLowerCase().includes(search.toLowerCase()) &&
        u.idUsuario !== task.idResponsable
    );

    return (
        <div className="space-y-4 animate-fade-in">
            <h4 className="font-bold text-slate-700">Gestionar Tarea</h4>

            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex flex-col gap-3">
                <p className="text-xs text-blue-700 font-bold flex items-center gap-1 uppercase tracking-wider">
                    <Users size={14} /> Reasignar para Revisión / Acción
                </p>

                <div className="space-y-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar empleado..."
                            className="w-full pl-9 pr-4 py-2 bg-white border border-blue-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="max-h-40 overflow-y-auto border border-blue-100 rounded-lg bg-white">
                        {filteredTeam.map(u => (
                            <div
                                key={u.idUsuario}
                                onClick={() => setSelectedUserId(u.idUsuario)}
                                className={'p-2 text-sm cursor-pointer hover:bg-blue-50 flex justify-between items-center ' + (selectedUserId === u.idUsuario ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600')}
                            >
                                <span>{u.nombre}</span>
                                {selectedUserId === u.idUsuario && <CheckCircle size={14} className="text-blue-500" />}
                            </div>
                        ))}
                        {filteredTeam.length === 0 && <div className="p-2 text-xs text-slate-400">No se encontraron resultados.</div>}
                    </div>
                </div>

                <button
                    onClick={() => selectedUserId && onReassign(selectedUserId)}
                    disabled={!selectedUserId || submitting}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg font-bold text-xs shadow-md shadow-blue-200 hover:bg-blue-700 disabled:opacity-50"
                >
                    Confirmar Reasignación
                </button>
            </div>

            <div className="space-y-2">
                <button onClick={() => onAction('Posponer')} className="w-full p-3 bg-amber-50 text-amber-800 rounded-xl flex items-center gap-3 hover:bg-amber-100 text-left border border-amber-100 group">
                    <div className="p-2 bg-white rounded-full text-amber-600 group-hover:bg-amber-50"><Clock size={16} /></div>
                    <div className="text-sm font-bold">Posponer (Enviar al Backlog)</div>
                </button>

                <button onClick={() => onAction('HechaPorOtro')} className="w-full p-3 bg-emerald-50 text-emerald-800 rounded-xl flex items-center gap-3 hover:bg-emerald-100 text-left border border-emerald-100 group">
                    <div className="p-2 bg-white rounded-full text-emerald-600 group-hover:bg-emerald-50"><CheckCircle size={16} /></div>
                    <div className="text-sm font-bold">Ya la hizo alguien más</div>
                </button>

                <button onClick={() => onAction('NoAplica')} className="w-full p-3 bg-slate-100 text-slate-700 rounded-xl flex items-center gap-3 hover:bg-slate-200 text-left border border-slate-200 group">
                    <div className="p-2 bg-white rounded-full text-slate-500 group-hover:bg-slate-50"><Ban size={16} /></div>
                    <div className="text-sm font-bold">Descartar / Cancelar</div>
                </button>
            </div>

            <button onClick={onCancel} className="w-full py-2 text-sm text-slate-400 font-bold hover:text-slate-600">Volver</button>
        </div>
    );
};
