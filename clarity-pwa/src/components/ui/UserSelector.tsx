import React, { useState, useMemo, useEffect } from 'react';
import { X, Search, ChevronRight } from 'lucide-react';
import type { Usuario } from '../../types/modelos';
import { clarityService } from '../../services/clarity.service';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (usuario: Usuario) => void;
    title?: string;
}

export const UserSelector: React.FC<Props> = ({ isOpen, onClose, onSelect, title = 'Seleccionar Responsable' }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [users, setUsers] = useState<Usuario[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        const load = async () => {
            setLoading(true);
            try {
                const res = await clarityService.getEmpleadosSelector();
                setUsers(res || []);
            } catch (e) {
                // Silently fail
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [isOpen]);

    const filteredUsers = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return users.filter(u =>
            (u.nombre || '').toLowerCase().includes(term) ||
            (u.correo || '').toLowerCase().includes(term) ||
            (u.carnet || '').toLowerCase().includes(term)
        );
    }, [searchTerm, users]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-bold text-slate-800">{title}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                        <X size={18} />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-slate-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o cargo..."
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar min-h-[300px]">
                    {loading ? (
                        <div className="p-8 text-center text-slate-400">Cargando usuarios...</div>
                    ) : (
                        filteredUsers.length > 0 ? (
                            filteredUsers.map(u => (
                                <button
                                    key={u.idUsuario}
                                    onClick={() => onSelect(u)}
                                    className="w-full text-left p-3 hover:bg-slate-50 rounded-lg flex items-center gap-3 transition-colors group"
                                >
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                        {u.nombre.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-medium text-slate-700 text-sm group-hover:text-indigo-700">{u.nombre}</div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">{u.rolGlobal || 'Usuario'}</span>
                                            {u.carnet && <span className="text-[10px] text-indigo-400 font-mono font-bold">#{u.carnet}</span>}
                                        </div>
                                    </div>
                                    <ChevronRight size={14} className="text-slate-200 group-hover:text-indigo-300" />
                                </button>
                            ))
                        ) : (
                            <div className="p-8 text-center text-slate-400 italic text-sm">No se encontraron personas.</div>
                        )
                    )}
                </div>

                <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
                    <span className="text-xs text-slate-400">Selecciona un miembro para asignar la tarea</span>
                </div>
            </div>
        </div>
    );
};
