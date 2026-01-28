import React, { useState } from 'react';
import type { Tarea } from '../../../types/modelos';
import { X, CheckCircle2 } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';

interface Props {
    disponibles: Tarea[];
    onSelect: (task: Tarea) => void;
    onClose: () => void;
    isSelected: (id: number) => boolean;
    onQuickAdd: (title: string, type: 'Entrego' | 'Avanzo' | 'Extra', index: number, projectId?: number) => Promise<void>;
    selectionContext: { type: 'Entrego' | 'Avanzo' | 'Extra', index: number };
    projects?: { idProyecto: number; nombre: string }[];
    defaultProjectId?: number | '';
}

export const TaskSelectorOverlay: React.FC<Props> = ({ disponibles, onSelect, onClose, isSelected, onQuickAdd, selectionContext, projects = [], defaultProjectId }) => {
    const [quickVal, setQuickVal] = useState('');
    const [creationProjectId, setCreationProjectId] = useState<number | ''>(defaultProjectId || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showToast } = useToast();

    const handleQuickAddLocal = async () => {
        if (!quickVal.trim()) return;
        if (isSubmitting) return; // Prevent double submit

        setIsSubmitting(true);
        try {
            await onQuickAdd(quickVal, selectionContext.type, selectionContext.index, creationProjectId !== '' ? creationProjectId : undefined);
            showToast('Tarea rápida creada', 'success');
            // Overlay closes automatically via parent update
        } catch (error) {
            showToast('Error al crear tarea', 'error');
            setIsSubmitting(false); // Only re-enable on error, success unmounts
        }
    };

    const getDaysActive = (dateStr?: string | Date) => {
        if (!dateStr) return 0;
        const d = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        return Math.floor(diff / (1000 * 3600 * 24));
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg">Bandeja de Entrada</h3>
                        <p className="text-xs text-slate-500">Selecciona qué harás hoy ({selectionContext.type})</p>
                    </div>
                    <button type="button" onClick={onClose} className="p-2 bg-slate-200 rounded-full hover:bg-slate-300">
                        <X size={20} />
                    </button>
                </div>

                {/* Quick Create in Overlay */}
                <div className="p-4 border-b bg-white relative">
                    <div className="w-full bg-slate-100 p-2 rounded-xl border border-transparent focus-within:border-indigo-500 focus-within:bg-white transition-all flex items-center gap-2">
                        <select
                            value={creationProjectId}
                            onChange={(e) => setCreationProjectId(e.target.value ? Number(e.target.value) : '')}
                            className="bg-transparent text-xs font-bold text-indigo-600 outline-none cursor-pointer max-w-[80px] truncate border-r border-slate-300 pr-1 py-2"
                            title="Proyecto Destino"
                            disabled={isSubmitting}
                        >
                            <option value="">📥 Inbox</option>
                            {projects.map(p => <option key={p.idProyecto} value={p.idProyecto}>{p.nombre}</option>)}
                        </select>
                        <input
                            autoFocus
                            type="text"
                            disabled={isSubmitting}
                            value={quickVal}
                            onChange={(e) => setQuickVal(e.target.value)}
                            placeholder={isSubmitting ? "Creando tarea..." : "Buscar o crear nueva tarea..."}
                            className={`flex-1 bg-transparent outline-none font-medium ${isSubmitting ? 'opacity-50 cursor-wait' : ''}`}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleQuickAddLocal();
                                }
                            }}
                        />
                    </div>
                    {isSubmitting && (
                        <div className="absolute right-8 top-1/2 -translate-y-1/2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                        </div>
                    )}
                </div>

                <div className="overflow-y-auto p-2 space-y-2 bg-slate-50 flex-1">
                    {disponibles
                        .filter(t => !isSelected(t.idTarea))
                        .filter(t => {
                            if (!quickVal.trim()) return true;
                            const query = quickVal.toLowerCase();
                            // Search by title or project name
                            return t.titulo.toLowerCase().includes(query) ||
                                (t.proyecto?.nombre || '').toLowerCase().includes(query);
                        })
                        .map((t, i) => (
                            <button
                                key={t.idTarea}
                                type="button"
                                onClick={() => onSelect(t)}
                                className={`w-full text-left p-4 rounded-xl border shadow-sm hover:border-indigo-400 active:scale-[0.98] transition-all relative group
                             ${i < 3 ? 'bg-white border-l-4 border-l-indigo-500 border-slate-200' : 'bg-white border-slate-200'} `}
                            >
                                {i < 3 && <span className="absolute top-2 right-2 text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold">Prioridad</span>}

                                <p className="font-bold text-slate-700 text-base mb-1">{t.titulo}</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase tracking-wider">{t.proyecto?.nombre}</span>
                                    {t.prioridad === 'Alta' && <span className="text-[10px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded font-bold">Alta</span>}
                                </div>
                                <div className="mt-2 text-[10px] text-slate-400 font-medium">
                                    Activa hace {getDaysActive(t.fechaCreacion)} días
                                </div>
                            </button>
                        ))}
                    {disponibles.filter(t => !isSelected(t.idTarea)).length === 0 && (
                        <div className="p-12 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
                            <CheckCircle2 size={32} className="text-slate-300" />
                            <span>No hay pendientes.<br />¡Estás al día! 🎉</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
