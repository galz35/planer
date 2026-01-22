import React from 'react';
import { NavLink, Outlet, useParams, useNavigate } from 'react-router-dom';
import { MemberAgendaProvider } from '../Hoy/context/MemberAgendaContext';
import { useMiDiaContext } from '../Hoy/context/MiDiaContext';
import { List, Calendar, BookOpen, ChevronLeft, ChevronRight, ShieldAlert, ArrowLeft } from 'lucide-react';

const MemberAgendaContent: React.FC = () => {
    const { today, setToday } = useMiDiaContext();

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

    // Helper para clases de NavLink
    const linkClass = ({ isActive }: { isActive: boolean }) =>
        `px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${isActive
            ? 'bg-amber-100 text-amber-700 shadow-sm border border-amber-200'
            : 'text-slate-500 hover:text-slate-700'
        }`;

    return (
        <div className="bg-clarity-bg dark:bg-slate-900 min-h-screen flex flex-col">
            {/* Agenda Navigation Header */}
            <div className="bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 mb-3 flex flex-col md:flex-row justify-between items-center gap-2 shrink-0 mx-4 mt-4">

                {/* Date Controls */}
                <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900/50 p-1 rounded-lg">
                    <button onClick={handlePrevDay} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-500">
                        <ChevronLeft size={16} />
                    </button>
                    <button onClick={handleToday} className="px-2 py-0.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded flex items-center gap-1">
                        <Calendar size={14} className="text-amber-500" />
                        {today === new Date().toISOString().split('T')[0] ? 'Hoy' : today}
                    </button>
                    <button onClick={handleNextDay} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-500">
                        <ChevronRight size={16} />
                    </button>
                </div>

                {/* View Tabs */}
                <div className="flex bg-slate-100/50 dark:bg-slate-700/50 p-1 rounded-lg gap-1 overflow-x-auto w-full md:w-auto">
                    <NavLink to="." end className={linkClass}>
                        <List size={14} /> Lista
                    </NavLink>
                    {/* <NavLink to="matrix" className={linkClass}>
                        <LayoutGrid size={14} /> Matriz
                    </NavLink> */}
                    <NavLink to="calendario" className={linkClass}>
                        <Calendar size={14} /> Cal
                    </NavLink>
                    <NavLink to="bitacora" className={linkClass}>
                        <BookOpen size={14} /> Bitácora
                    </NavLink>
                </div>
            </div>

            <main className="px-4 w-full h-full mx-auto animate-fade-in flex-1 flex flex-col pb-24">
                <Outlet />
            </main>
        </div>
    );
};

export const MemberAgendaPage: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();

    if (!userId) return <div>Usuario no especificado</div>;

    return (
        <MemberAgendaProvider userId={userId}>
            <div className="min-h-screen flex flex-col relative">
                {/* Supervisor Banner */}
                <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 sticky top-0 z-50 flex justify-between items-center shadow-sm">
                    <div className="flex items-center gap-2 text-amber-800 text-xs font-bold uppercase tracking-wide">
                        <ShieldAlert size={16} />
                        <span>Modo Supervisor: Editando Agenda de {userId}</span>
                    </div>
                    <button onClick={() => navigate('/app/equipo')} className="flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1 rounded transition-colors">
                        <ArrowLeft size={12} /> Volver al Equipo
                    </button>
                </div>

                <MemberAgendaContent />
            </div>
        </MemberAgendaProvider>
    );
};
