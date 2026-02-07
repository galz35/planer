import { useEffect, useState } from 'react';
import { clarityService } from '../../services/clarity.service';
import { Calendar, CheckCircle, AlertCircle, Users } from 'lucide-react';
import { format } from 'date-fns';

interface ComplianceItem {
    usuario: {
        idUsuario: number;
        nombre: string;
        correo: string;
        area: string;
        rol: { nombre: string };
    };
    checkin: {
        idCheckin: number;
        fecha: string;
        estadoAnimo: string;
        nota: string;
    } | null;
    estadisticas: {
        hoy: number;
        hechas: number;
        retrasadas: number;
    };
}

export const AgendaCompliancePage = () => {
    const [date, setDate] = useState(new Date());
    const [items, setItems] = useState<ComplianceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedAreas, setExpandedAreas] = useState<string[]>([]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await clarityService.getAgendaCompliance(date.toISOString()) as any;
            // FILTER: Remove users with "Test" in name or surname or specific fake emails
            const cleanItems = (data.miembros || []).filter((m: any) => {
                const name = (m.usuario.nombre || '').toLowerCase();
                return !name.includes('test') && !name.includes('prueba');
            });
            setItems(cleanItems);
            // Auto expand all areas on load
            const areas = cleanItems.map((i: any) => i.usuario.area || 'Sin Subgerencia');
            setExpandedAreas(Array.from(new Set(areas)));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [date]);

    const total = items.length;
    const compliantItems = items.filter(i => i.checkin);
    const missingItems = items.filter(i => !i.checkin);
    const compliant = compliantItems.length;
    const missing = total - compliant;
    const rate = total > 0 ? Math.round((compliant / total) * 100) : 0;

    // Agrupar por subgerencia
    const groupBySubgerencia = (list: ComplianceItem[]) => {
        return list.reduce((acc, item) => {
            const area = item.usuario.area || 'Sin Subgerencia';
            if (!acc[area]) acc[area] = [];
            acc[area].push(item);
            return acc;
        }, {} as Record<string, ComplianceItem[]>);
    };

    const groupedCompliant = groupBySubgerencia(compliantItems);
    const groupedMissing = groupBySubgerencia(missingItems);

    const toggleArea = (area: string) => {
        setExpandedAreas(prev =>
            prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
        );
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Cargando reporte...</div>;

    const ChevronIcon = ({ expanded }: { expanded: boolean }) => (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        >
            <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
    );

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Seguimiento de Agenda</h1>
                    <p className="text-slate-500">Monitorea el cumplimiento de Check-in y Planificación diaria.</p>
                </div>
                <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <input
                        type="date"
                        value={format(date, 'yyyy-MM-dd')}
                        onChange={(e) => setDate(new Date(e.target.value))}
                        className="text-sm border-none focus:ring-0 text-slate-700 outline-none bg-transparent"
                    />
                </div>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-slate-500 text-xs font-medium uppercase">Miembros</div>
                    <div className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        {total}
                        <Users className="w-4 h-4 text-slate-400" />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-slate-500 text-xs font-medium uppercase">Cumplimiento</div>
                    <div className={`text-2xl font-bold flex items-center gap-2 ${rate >= 80 ? 'text-emerald-600' : rate >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                        {rate}%
                        {rate >= 80 ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-slate-500 text-xs font-medium uppercase">Con Agenda</div>
                    <div className="text-2xl font-bold text-emerald-600">{compliant}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-slate-500 text-xs font-medium uppercase">Sin Agenda</div>
                    <div className="text-2xl font-bold text-slate-400">{missing}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
                {/* SI TIENEN AGENDA */}
                <div className="space-y-4">
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex justify-between items-center">
                        <h3 className="font-bold text-emerald-900 flex items-center gap-2 text-lg">
                            <CheckCircle size={20} className="text-emerald-600" />
                            Sí Tienen Agenda
                        </h3>
                        <span className="px-3 py-1 bg-emerald-600 text-white rounded-full text-xs font-black">{compliant}</span>
                    </div>

                    {Object.entries(groupedCompliant).sort().map(([area, members]) => (
                        <div key={`compl-${area}`} className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 ${!expandedAreas.includes(area) ? 'opacity-80' : ''}`}>
                            <div
                                className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors"
                                onClick={() => toggleArea(area)}
                            >
                                <div className="flex items-center gap-2 text-slate-500">
                                    <ChevronIcon expanded={expandedAreas.includes(area)} />
                                    <span className="text-[10px] font-black uppercase tracking-wider">Subgerencia: {area}</span>
                                </div>
                                <span className="text-[10px] font-bold text-emerald-600 px-1.5 py-0.5 bg-emerald-50 rounded-md">{members.length}</span>
                            </div>

                            {/* Collapsible Content */}
                            {expandedAreas.includes(area) && (
                                <table className="w-full text-sm text-left animate-in slide-in-from-top-2 duration-200">
                                    <tbody className="divide-y divide-slate-50">
                                        {members.map(item => (
                                            <tr key={item.usuario.idUsuario} className="hover:bg-emerald-50/30 transition-colors">
                                                <td className="px-4 py-2.5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center">
                                                            {(item.usuario.nombre || '??').substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-700 text-xs">{item.usuario.nombre}</div>
                                                            <div className="text-[10px] text-slate-400 leading-tight">{item.usuario.rol.nombre}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2.5 text-right font-mono text-emerald-600 font-bold text-xs">
                                                    {item.checkin ? format(new Date(item.checkin.fecha), 'HH:mm') : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    ))}
                    {compliant === 0 && (
                        <div className="text-center py-12 p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 italic text-sm">
                            Nadie ha hecho check-in hoy.
                        </div>
                    )}
                </div>

                {/* NO TIENEN AGENDA */}
                <div className="space-y-4">
                    <div className="p-4 bg-rose-50 rounded-xl border border-rose-100 flex justify-between items-center">
                        <h3 className="font-bold text-rose-900 flex items-center gap-2 text-lg">
                            <AlertCircle size={20} className="text-rose-600" />
                            No Tienen Agenda
                        </h3>
                        <span className="px-3 py-1 bg-rose-600 text-white rounded-full text-xs font-black">{missing}</span>
                    </div>

                    {Object.entries(groupedMissing).sort().map(([area, members]) => (
                        <div key={`miss-${area}`} className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 ${!expandedAreas.includes(area) ? 'opacity-80' : ''}`}>
                            <div
                                className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors"
                                onClick={() => toggleArea(area)}
                            >
                                <div className="flex items-center gap-2 text-slate-500">
                                    <ChevronIcon expanded={expandedAreas.includes(area)} />
                                    <span className="text-[10px] font-black uppercase tracking-wider">Subgerencia: {area}</span>
                                </div>
                                <span className="text-[10px] font-bold text-rose-600 px-1.5 py-0.5 bg-rose-50 rounded-md">{members.length}</span>
                            </div>
                            {expandedAreas.includes(area) && (
                                <table className="w-full text-sm text-left animate-in slide-in-from-top-2 duration-200">
                                    <tbody className="divide-y divide-slate-50">
                                        {members.map(item => (
                                            <tr key={item.usuario.idUsuario} className="hover:bg-rose-50/30 transition-colors">
                                                <td className="px-4 py-2.5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 font-bold text-[10px] flex items-center justify-center">
                                                            {(item.usuario.nombre || '??').substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-700 text-xs">{item.usuario.nombre}</div>
                                                            <div className="text-[10px] text-slate-400 leading-tight">{item.usuario.rol.nombre}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2.5 text-right">
                                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-black uppercase tracking-tighter">Pendiente</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    ))}
                    {missing === 0 && (
                        <div className="text-center py-12 p-6 bg-emerald-50 rounded-xl border border-dashed border-emerald-200 text-emerald-600 italic text-sm">
                            ¡Todos cumplieron hoy! 🎉
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
