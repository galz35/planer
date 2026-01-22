import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, CheckCircle2, Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { clarityService } from '../../../services/clarity.service';
import type { Tarea, TareaAvanceMensual } from '../../../types/modelos';
import { useToast } from '../../../context/ToastContext';

interface Props {
    task: Tarea;
    onUpdate: () => void;
}

const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const MonthlyProgressManager: React.FC<Props> = ({ task, onUpdate }) => {
    const [year, setYear] = useState(new Date().getFullYear());
    const [monthlyData, setMonthlyData] = useState<Record<number, number>>({});
    const [acumulado, setAcumulado] = useState(0);
    const [loading, setLoading] = useState(true);
    const [savingMonth, setSavingMonth] = useState<number | null>(null);
    const { showToast } = useToast();

    // Load data on mount or task/year change
    useEffect(() => {
        loadData();
    }, [task.idTarea, year]);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await clarityService.getAvancesMensuales(task.idTarea);
            if (data) {
                setAcumulado(data.acumulado || 0);

                // Map history to simple object { month: percent }
                // Filter by selected year
                const mapping: Record<number, number> = {};
                (data.historial || []).forEach(h => {
                    if (h.anio === year) {
                        mapping[h.mes] = h.porcentajeMes;
                    }
                });
                setMonthlyData(mapping);
            }
        } catch (error) {
            console.error('Error loading progress:', error);
            showToast('Error cargando historial', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (mes: number, valueStr: string) => {
        let val = parseFloat(valueStr);
        if (isNaN(val)) val = 0;
        if (val < 0) val = 0;
        if (val > 100) val = 100;

        // Don't save if value hasn't changed (to avoid spam)
        if (monthlyData[mes] === val) return;

        // Optimistic update
        setMonthlyData(prev => ({ ...prev, [mes]: val }));
        setSavingMonth(mes);

        console.log('[MonthlyProgress] Intentando guardar:', { taskId: task.idTarea, anio: year, mes, val });

        try {
            const res = await clarityService.postAvanceMensual(task.idTarea, {
                anio: year,
                mes: mes,
                porcentajeMes: val
            });
            console.log('[MonthlyProgress] Respuesta guardado:', res);

            // Update real state from server response to ensure sync (especially accumulated)
            if (res) {
                setAcumulado(res.acumulado);
                // We keep our local monthlyData for the input to avoid focus jumps, 
                // but we could sync it too if needed.
                onUpdate(); // Notify parent to update the list view
            }
        } catch (error) {
            console.error('[MonthlyProgress] Error al guardar:', error);
            showToast('Error al guardar avance', 'error');
            // Revert on error? For now just stay optimistic but warn.
        } finally {
            setSavingMonth(null);
        }
    };

    return (
        <div className="space-y-4">
            {/* Header Global */}
            <div className="bg-slate-900 rounded-xl p-4 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10 flex justify-between items-center">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <TrendingUp size={16} className="text-emerald-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Progreso Global</span>
                        </div>
                        <h3 className="text-3xl font-black tracking-tight">{(acumulado || 0).toFixed(1)}%</h3>
                    </div>
                    {(acumulado || 0) >= 100 ? (
                        <div className="bg-emerald-500/20 p-2 rounded-full border border-emerald-500/50">
                            <CheckCircle2 size={24} className="text-emerald-400" />
                        </div>
                    ) : (
                        <div className="text-right">
                            <span className="text-[10px] font-bold text-slate-500 uppercase block">Restante</span>
                            <span className="text-sm font-bold text-slate-300">{(100 - (acumulado || 0)).toFixed(1)}%</span>
                        </div>
                    )}
                </div>
                {/* Background Bar */}
                <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10">
                    <div
                        className="h-full bg-emerald-500 transition-all duration-700"
                        style={{ width: `${Math.min(acumulado || 0, 100)}%` }}
                    />
                </div>
            </div>

            {/* Year Selector */}
            <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200">
                <button
                    onClick={() => setYear(y => y - 1)}
                    className="p-1 hover:bg-white rounded-md transition-colors text-slate-500 hover:text-slate-800"
                >
                    <ChevronLeft size={16} />
                </button>
                <span className="font-black text-slate-700 text-sm tracking-widest">{year}</span>
                <button
                    onClick={() => setYear(y => y + 1)}
                    className="p-1 hover:bg-white rounded-md transition-colors text-slate-500 hover:text-slate-800"
                >
                    <ChevronRight size={16} />
                </button>
            </div>

            {/* Excel-like Grid */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-3 py-2 text-left font-bold text-slate-400 uppercase tracking-wider w-1/3">Mes</th>
                            <th className="px-3 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-l border-slate-100">Avance %</th>
                            <th className="px-3 py-2 text-right w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan={3} className="py-8 text-center text-slate-400">
                                    <Loader2 size={20} className="animate-spin mx-auto mb-2" />
                                    Cargando...
                                </td>
                            </tr>
                        ) : (
                            MESES.map((mesNombre, index) => {
                                const mesNum = index + 1;
                                const val = monthlyData[mesNum] ?? 0;
                                const isSaving = savingMonth === mesNum;

                                return (
                                    <tr key={mesNum} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-3 py-2 font-bold text-slate-700">
                                            {mesNombre}
                                        </td>
                                        <td className="p-0 border-l border-slate-100 h-full relative">
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.1"
                                                className="w-full h-full min-h-[36px] px-2 text-center font-mono font-medium text-slate-800 outline-none focus:bg-blue-50 focus:text-blue-700 transition-colors bg-transparent"
                                                placeholder="0"
                                                value={val === 0 ? '' : val}
                                                onChange={(e) => {
                                                    // Allow saving only on blur/enter to avoid too many requests? 
                                                    // For responsiveness, let's update state immediately but save on blur.
                                                    const v = e.target.value;
                                                    setMonthlyData(prev => ({ ...prev, [mesNum]: v === '' ? 0 : parseFloat(v) }));
                                                }}
                                                onBlur={(e) => {
                                                    handleSave(mesNum, e.target.value);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.currentTarget.blur();
                                                    }
                                                }}
                                            />
                                            {/* Percent symbol overlay if focused? No, simpler is better */}
                                        </td>
                                        <td className="px-2 text-center text-xs">
                                            {isSaving && (
                                                <Loader2 size={12} className="animate-spin text-blue-500" />
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex gap-2 items-start bg-blue-50 p-3 rounded-lg text-[10px] text-blue-700">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <p>Escribe el porcentaje de avance logrado en cada mes (no el acumulado). El sistema calculará el total automáticamente.</p>
            </div>
        </div>
    );
};
