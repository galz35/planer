import React from 'react';
import type { Bloqueo } from '../../../types/modelos';

interface Props {
    bloqueos: Bloqueo[];
}

export const BloqueosMiniList: React.FC<Props> = ({ bloqueos }) => {
    if (bloqueos.length === 0) return null;

    return (
        <div className="mb-4 bg-red-50 rounded-lg px-4 py-2 border border-red-100 flex items-center justify-between gap-4 overflow-hidden">
            <div className="flex items-center gap-2 overflow-hidden">
                <span className="text-red-600 font-bold whitespace-nowrap text-xs uppercase tracking-wider flex items-center gap-1">
                    🚫 Estoy Bloqueado ({bloqueos.length}):
                </span>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mask-grad-right">
                    {bloqueos.map((b, idx) => (
                        <span key={b.idBloqueo} className="text-sm text-red-800 whitespace-nowrap flex items-center gap-1">
                            <span className="font-semibold">{b.destinoUsuario?.nombre || 'Alguien'}</span>
                            <span className="text-red-400 text-xs">({b.motivo})</span>
                            {idx < bloqueos.length - 1 && <span className="text-red-300">•</span>}
                        </span>
                    ))}
                </div>
            </div>
            <button className="text-[10px] text-red-500 underline whitespace-nowrap hover:text-red-700">Ver Lista</button>
        </div>
    );
};
