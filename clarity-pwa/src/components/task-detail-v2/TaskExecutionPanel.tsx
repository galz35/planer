import React from 'react';
import { AlignLeft, MessageSquare, Link } from 'lucide-react';
import type { Tarea } from '../../types/modelos';

interface Props {
    task: Tarea;
    descripcion: string;
    setDescripcion: (v: string) => void;
    linkEvidencia: string;
    setLinkEvidencia: (v: string) => void;
    progreso: number;
    setProgreso: (v: number) => void;
    comentario: string;
    setComentario: (v: string) => void;
}

export const TaskExecutionPanel: React.FC<Props> = ({
    descripcion, setDescripcion,
    linkEvidencia, setLinkEvidencia,
    progreso, setProgreso,
    comentario, setComentario
}) => {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1">
                    <AlignLeft size={12} /> Descripción / Notas
                </label>
                <textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Detalles, criterios de aceptación, notas..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none resize-none min-h-[120px]"
                />
            </div>

            {/* Subtareas ocultas por solicitud del usuario */}

            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><Link size={12} /> Link Evidencia (SharePoint / Drive)</label>
                <input
                    type="text"
                    value={linkEvidencia}
                    onChange={(e) => setLinkEvidencia(e.target.value)}
                    placeholder="https://..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none"
                />
                {linkEvidencia && (
                    <a href={linkEvidencia} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline pl-2 block">
                        Abrir enlace 🔗
                    </a>
                )}
            </div>

            <div className="space-y-3 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <div className="flex justify-between items-center">
                    <label className="font-bold text-slate-700 text-sm">Avance Actual</label>
                    <span className={'text-lg font-bold ' + (progreso === 100 ? 'text-emerald-600' : 'text-blue-600')}>{progreso}%</span>
                </div>

                <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={progreso}
                    onChange={(e) => setProgreso(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><MessageSquare size={12} /> Agregar Comentario / Bitácora</label>
                <textarea
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    placeholder="Escribe aquí tus observaciones, dudas o avances..."
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none resize-none h-24 shadow-sm"
                />
            </div>

            {/* El botón Guardar ahora está en la cabecera (Header) para acceso rápido */}
        </div>
    );
};
