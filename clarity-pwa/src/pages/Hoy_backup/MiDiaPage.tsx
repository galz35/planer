import React, { useMemo, useCallback, useRef } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MiDiaProvider, useMiDiaContext } from './context/MiDiaContext';
import { TopBar } from '../../components/layout/TopBar';
import { List, Calendar, BookOpen, BarChart3, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

// ✅ Fecha local segura (evita bug UTC)
const fechaLocalYYYYMMDD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const MiDiaContent: React.FC = () => {
    const { allDisponibles, today, setToday } = useMiDiaContext();
    const dateInputRef = useRef<HTMLInputElement>(null);

    const handleDateClick = () => {
        // Trigger the native date picker
        if (dateInputRef.current) {
            if ('showPicker' in HTMLInputElement.prototype) {
                (dateInputRef.current as any).showPicker();
            } else {
                dateInputRef.current.click();
            }
        }
    };

    const handlePrevDay = useCallback(() => {
        const d = new Date(today + 'T00:00:00'); // ✅ evita parse raro
        d.setDate(d.getDate() - 1);
        setToday(fechaLocalYYYYMMDD(d));
    }, [today, setToday]);

    const handleNextDay = useCallback(() => {
        const d = new Date(today + 'T00:00:00');
        d.setDate(d.getDate() + 1);
        setToday(fechaLocalYYYYMMDD(d));
    }, [today, setToday]);


    const linkClass = useCallback(
        ({ isActive }: { isActive: boolean }) =>
            `px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${isActive
                ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-300'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`,
        []
    );

    const total = allDisponibles.length;
    const hechas = useMemo(
        () => allDisponibles.reduce((acc, t) => (t.estado === 'Hecha' ? acc + 1 : acc), 0),
        [allDisponibles]
    );

    return (
        <div className="pb-24 bg-clarity-bg dark:bg-slate-900 min-h-screen flex flex-col">
            <div className="md:hidden">
                <TopBar title="Mi Agenda" subtitle={today} />
            </div>

            <main className="p-4 w-full h-full mx-auto animate-fade-in flex-1 flex flex-col">
                <div className="bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 mb-3 flex flex-col md:flex-row justify-between items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900/50 p-1 rounded-lg">
                        <button
                            onClick={handlePrevDay}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-500"
                        >
                            <ChevronLeft size={16} />
                        </button>

                        <button
                            onClick={handleDateClick}
                            className="px-2 py-0.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded flex items-center gap-1 relative"
                        >
                            <CalendarDays size={14} />
                            {today}
                            {/* Hidden date input */}
                            <input
                                ref={dateInputRef}
                                type="date"
                                className="absolute inset-0 opacity-0 pointer-events-none w-0 h-0"
                                value={today}
                                onChange={(e) => setToday(e.target.value)}
                            />
                        </button>

                        <button
                            onClick={handleNextDay}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-500"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/50 p-1 rounded-lg flex gap-1 shadow-inner overflow-x-auto max-w-full no-scrollbar">
                        <NavLink to="" end className={linkClass}>
                            <List size={14} />
                            Ejecutar
                        </NavLink>

                        <NavLink to="calendario" className={linkClass}>
                            <Calendar size={14} />
                            Calendario
                        </NavLink>

                        <NavLink to="bitacora" className={linkClass}>
                            <BookOpen size={14} />
                            Bitácora
                        </NavLink>

                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1 hidden md:block"></div>

                        <NavLink to="kpis" className={linkClass}>
                            <BarChart3 size={14} />
                            KPIs
                        </NavLink>
                    </div>

                    <div className="hidden md:flex items-center gap-4 px-2">
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 leading-none">{total}</p>
                                <p className="text-[9px] uppercase font-bold text-slate-400">Total</p>
                            </div>
                            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>
                            <div className="text-right">
                                <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 leading-none">{hechas}</p>
                                <p className="text-[9px] uppercase font-bold text-slate-400">Hechas</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 min-h-0 flex flex-col">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export const MiDiaPage: React.FC = () => {
    const { user } = useAuth();
    return (
        <MiDiaProvider userId={user?.idUsuario || 0} userCarnet={user?.carnet}>
            <MiDiaContent />
        </MiDiaProvider>
    );
};
