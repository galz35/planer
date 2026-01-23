/**
 * ¿QUÉ ES?: La página principal de "Mi Día" (Dashboard personal).
 * ¿PARA QUÉ SE USA?: Sirve como contenedor para todas las vistas relacionadas con la agenda diaria 
 * (Ejecución, Calendario, Bitácora y KPIs).
 * ¿QUÉ SE ESPERA?: Que gestione la navegación entre sub-vistas y envuelva todo en el MiDiaProvider
 * para que los datos estén disponibles globalmente en este módulo.
 */

import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MiDiaProvider, useMiDiaContext } from './context/MiDiaContext';
import { TopBar } from '../../components/layout/TopBar';
import { List, Calendar, BookOpen, BarChart3, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

/**
 * ¿QUÉ ES?: El contenido interno de la página de Mi Día.
 * ¿PARA QUÉ SE USA?: Renderiza la barra de herramientas (calendario, pestañas) y el Outlet de React Router.
 */
const MiDiaContent: React.FC = () => {
    // Obtenemos datos y funciones del contexto "MiDiaContext"
    const { allDisponibles, today, setToday } = useMiDiaContext();

    // Funciones para cambiar el día que se visualiza
    const handlePrevDay = () => {
        const d = new Date(today);
        d.setDate(d.getDate() - 1);
        setToday(d.toISOString().split('T')[0]);
    };

    const handleNextDay = () => {
        const d = new Date(today);
        d.setDate(d.getDate() + 1);
        setToday(d.toISOString().split('T')[0]);
    };

    const handleToday = () => {
        setToday(new Date().toISOString().split('T')[0]);
    };

    // Estilos dinámicos para las pestañas de navegación (Tabs)
    const linkClass = ({ isActive }: { isActive: boolean }) =>
        `px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${isActive
            ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-300'
            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
        }`;


    return (
        <div className="pb-24 bg-clarity-bg dark:bg-slate-900 min-h-screen flex flex-col">
            {/* Barra superior visible solo en móviles */}
            <div className="md:hidden">
                <TopBar title="Mi Agenda" subtitle={today} />
            </div>

            <main className="p-4 w-full h-full mx-auto animate-fade-in flex-1 flex flex-col">
                {/* BARRA DE NAVEGACIÓN INTERNA (Sub-menu) */}
                <div className="bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 mb-3 flex flex-col md:flex-row justify-between items-center gap-2 shrink-0">

                    {/* Controles de Fecha (Atrás, Hoy, Adelante) */}
                    <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900/50 p-1 rounded-lg">
                        <button onClick={handlePrevDay} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-500">
                            <ChevronLeft size={16} />
                        </button>
                        <button onClick={handleToday} className="px-2 py-0.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded flex items-center gap-1">
                            <CalendarDays size={14} />
                            {today}
                        </button>
                        <button onClick={handleNextDay} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-500">
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* Pestañas de secciones (Ejecutar, Calendario, etc.) */}
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

                        <NavLink to="kpis" className={({ isActive }) =>
                            `px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${isActive
                                ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-400'
                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                            }`
                        }>
                            <BarChart3 size={14} />
                            KPIs
                        </NavLink>
                    </div>

                    {/* Resumen rápido de KPIs en la cabecera */}
                    <div className="hidden md:flex items-center gap-4 px-2">
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 leading-none">{allDisponibles.length}</p>
                                <p className="text-[9px] uppercase font-bold text-slate-400">Total</p>
                            </div>
                            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>
                            <div className="text-right">
                                <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 leading-none">{allDisponibles.filter(t => t.estado === 'Hecha').length}</p>
                                <p className="text-[9px] uppercase font-bold text-slate-400">Hechas</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Área donde se renderizan las sub-páginas (EjecutarView, etc.) */}
                <div className="flex-1 min-h-0 flex flex-col">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

/**
 * COMPONENTE EXPORTADO: MiDiaPage
 * ¿QUÉ ES?: Envuelve el contenido en el MiDiaProvider.
 * ¿PARA QUÉ SE USA?: Para asegurar que el contexto de datos esté inicializado con el ID del usuario actual.
 */
export const MiDiaPage: React.FC = () => {
    const { user } = useAuth();
    return (
        <MiDiaProvider userId={user?.idUsuario || 0}>
            <MiDiaContent />
        </MiDiaProvider>
    );
};

