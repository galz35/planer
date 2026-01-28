import React, { useState, useEffect } from 'react';
import { clarityService } from '../../../services/clarity.service';
import { TrendingUp, TrendingDown, CheckCircle2, Clock, Target, Calendar, BarChart3, Loader2, Flame } from 'lucide-react';
import type { Tarea } from '../../../types/modelos';

interface Props {
    userId: number;
}

interface Stats {
    tareasHoy: number;
    tareasCompletadasHoy: number;
    tareasSemana: number;
    tareasCompletadasSemana: number;
    tareasAtrasadas: number;
    tareasBloqueadas: number;
    promedioSemanal: number;
    rachaActual: number;
    mejorRacha: number;
    porcentajeCompletado: number;
    tendencia: 'up' | 'down' | 'stable';
    porDia: { dia: string; hechas: number; total: number }[];
}

export const MetricasWidget: React.FC<Props> = ({ userId }) => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<Stats | null>(null);

    useEffect(() => {
        loadStats();
    }, [userId]);

    const loadStats = async () => {
        setLoading(true);
        try {
            const tasks = await clarityService.getMisTareas({});
            if (!tasks) { setLoading(false); return; }

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayStr = today.toISOString().split('T')[0];

            // Calcular inicio de semana (lunes)
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay() + 1);
            const weekStartStr = weekStart.toISOString().split('T')[0];

            // Semana pasada
            const lastWeekStart = new Date(weekStart);
            lastWeekStart.setDate(lastWeekStart.getDate() - 7);
            const lastWeekEnd = new Date(weekStart);
            lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);

            // Filtrar tareas con seguridad
            const tareasHoy = tasks.filter((t: Tarea) => {
                if (!t.fechaObjetivo) return false;
                return t.fechaObjetivo.split('T')[0] === todayStr;
            });
            const tareasCompletadasHoy = tareasHoy.filter((t: Tarea) => t.estado === 'Hecha');

            const tareasSemana = tasks.filter((t: Tarea) => {
                if (!t.fechaObjetivo) return false;
                const fecha = t.fechaObjetivo.split('T')[0];
                return fecha >= weekStartStr && fecha <= todayStr;
            });
            const tareasCompletadasSemana = tareasSemana.filter((t: Tarea) => t.estado === 'Hecha');

            // Semana pasada para tendencia
            const completadasSemPasada = tasks.filter((t: Tarea) => {
                if (!t.fechaHecha) return false;
                const fecha = t.fechaHecha.split('T')[0];
                return fecha >= lastWeekStart.toISOString().split('T')[0] && fecha <= lastWeekEnd.toISOString().split('T')[0];
            }).length;

            const tareasAtrasadas = tasks.filter((t: Tarea) => {
                if (!t.fechaObjetivo) return false;
                const fecha = t.fechaObjetivo.split('T')[0];
                return fecha < todayStr && !['Hecha', 'Descartada'].includes(t.estado);
            });

            const tareasBloqueadas = tasks.filter((t: Tarea) => t.estado === 'Bloqueada');

            // Calcular por día (últimos 7 días)
            const porDia: { dia: string; hechas: number; total: number }[] = [];
            const diasLabel = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
            for (let i = 6; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                const dateStr = d.toISOString().split('T')[0];
                const tareasDelDia = tasks.filter((t: Tarea) => {
                    if (!t.fechaObjetivo) return false;
                    return t.fechaObjetivo.split('T')[0] === dateStr;
                });
                const hechasDelDia = tareasDelDia.filter((t: Tarea) => t.estado === 'Hecha');
                porDia.push({
                    dia: diasLabel[d.getDay()],
                    hechas: hechasDelDia.length,
                    total: tareasDelDia.length
                });
            }

            // Calcular racha (días consecutivos con al menos 1 tarea completada)
            let rachaActual = 0;
            for (let i = 0; i < 30; i++) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                const dateStr = d.toISOString().split('T')[0];
                const completadasEseDia = tasks.filter((t: Tarea) => {
                    if (!t.fechaHecha) return false;
                    return t.fechaHecha.split('T')[0] === dateStr;
                }).length;
                if (completadasEseDia > 0) rachaActual++;
                else if (i > 0) break; // Si hoy no hizo pero ayer sí, racha es 0 si es estricto, o se mantiene? Generalmente la racha se rompe si un día no hay actividad.
            }

            const porcentajeCompletado = tareasSemana.length > 0
                ? Math.round((tareasCompletadasSemana.length / tareasSemana.length) * 100)
                : 0;

            const tendencia = tareasCompletadasSemana.length > completadasSemPasada ? 'up' :
                tareasCompletadasSemana.length < completadasSemPasada ? 'down' : 'stable';

            setStats({
                tareasHoy: tareasHoy.length,
                tareasCompletadasHoy: tareasCompletadasHoy.length,
                tareasSemana: tareasSemana.length,
                tareasCompletadasSemana: tareasCompletadasSemana.length,
                tareasAtrasadas: tareasAtrasadas.length,
                tareasBloqueadas: tareasBloqueadas.length,
                promedioSemanal: Math.round(tareasCompletadasSemana.length / Math.min(today.getDay() || 7, 7) * 10) / 10,
                rachaActual,
                mejorRacha: rachaActual, // TODO: Guardar mejor racha en backend
                porcentajeCompletado,
                tendencia,
                porDia
            });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center">
                <Loader2 className="animate-spin mx-auto text-indigo-500 mb-2" size={24} />
                <p className="text-gray-400 text-sm">Calculando métricas...</p>
            </div>
        );
    }

    if (!stats) return null;

    const maxBarHeight = 60;
    const maxTotal = Math.max(...stats.porDia.map(d => d.total), 1);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-xl">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <BarChart3 size={20} /> Dashboard de Productividad
                        </h2>
                        <p className="text-sm text-indigo-200">Semana actual</p>
                    </div>
                    <div className="text-right">
                        <p className="text-3xl font-black">{stats.porcentajeCompletado}%</p>
                        <div className="flex items-center gap-1 text-sm">
                            {stats.tendencia === 'up' && <><TrendingUp size={14} /> Mejorando</>}
                            {stats.tendencia === 'down' && <><TrendingDown size={14} /> Bajando</>}
                            {stats.tendencia === 'stable' && <>Estable</>}
                        </div>
                    </div>
                </div>
            </div>

            {/* KPIs Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Hoy */}
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
                        <Target size={14} /> HOY
                    </div>
                    <p className="text-2xl font-black text-gray-800">
                        {stats.tareasCompletadasHoy}<span className="text-gray-400 text-lg">/{stats.tareasHoy}</span>
                    </p>
                    <p className="text-xs text-gray-400">tareas completadas</p>
                </div>

                {/* Semana */}
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
                        <Calendar size={14} /> SEMANA
                    </div>
                    <p className="text-2xl font-black text-gray-800">
                        {stats.tareasCompletadasSemana}<span className="text-gray-400 text-lg">/{stats.tareasSemana}</span>
                    </p>
                    <p className="text-xs text-gray-400">tareas completadas</p>
                </div>

                {/* Promedio */}
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
                        <BarChart3 size={14} /> PROMEDIO
                    </div>
                    <p className="text-2xl font-black text-indigo-600">{stats.promedioSemanal}</p>
                    <p className="text-xs text-gray-400">tareas/día</p>
                </div>

                {/* Racha */}
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 text-orange-500 text-xs mb-2">
                        <Flame size={14} /> RACHA
                    </div>
                    <p className="text-2xl font-black text-orange-500">{stats.rachaActual}</p>
                    <p className="text-xs text-gray-400">días seguidos</p>
                </div>
            </div>

            {/* Gráfico de Barras - Últimos 7 días */}
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700 mb-4">📊 Actividad Últimos 7 Días</h3>
                <div className="flex items-end justify-between gap-2 h-[80px]">
                    {stats.porDia.map((dia, idx) => {
                        const height = dia.total > 0 ? (dia.hechas / maxTotal) * maxBarHeight : 4;
                        const bgHeight = dia.total > 0 ? (dia.total / maxTotal) * maxBarHeight : 4;
                        const isToday = idx === stats.porDia.length - 1;
                        return (
                            <div key={dia.dia} className="flex-1 flex flex-col items-center">
                                <div className="relative w-full flex justify-center" style={{ height: maxBarHeight }}>
                                    {/* Background bar (total) */}
                                    <div
                                        className={`absolute bottom-0 w-6 rounded-t ${isToday ? 'bg-indigo-100' : 'bg-gray-100'}`}
                                        style={{ height: bgHeight }}
                                    />
                                    {/* Foreground bar (completed) */}
                                    <div
                                        className={`absolute bottom-0 w-6 rounded-t ${isToday ? 'bg-indigo-500' : 'bg-green-500'}`}
                                        style={{ height }}
                                    />
                                </div>
                                <p className={`text-[10px] mt-1 ${isToday ? 'font-bold text-indigo-600' : 'text-gray-400'}`}>
                                    {dia.dia}
                                </p>
                                <p className="text-[9px] text-gray-400">{dia.hechas}/{dia.total}</p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Alertas Rápidas */}
            <div className="grid grid-cols-2 gap-3">
                {/* Atrasadas */}
                <div className={`rounded-xl p-4 border ${stats.tareasAtrasadas > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                    <div className="flex items-center gap-2">
                        <Clock size={18} className={stats.tareasAtrasadas > 0 ? 'text-red-500' : 'text-green-500'} />
                        <div>
                            <p className={`text-xl font-black ${stats.tareasAtrasadas > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {stats.tareasAtrasadas}
                            </p>
                            <p className="text-xs text-gray-500">Atrasadas</p>
                        </div>
                    </div>
                </div>

                {/* Bloqueadas */}
                <div className={`rounded-xl p-4 border ${stats.tareasBloqueadas > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                    <div className="flex items-center gap-2">
                        <CheckCircle2 size={18} className={stats.tareasBloqueadas > 0 ? 'text-amber-500' : 'text-green-500'} />
                        <div>
                            <p className={`text-xl font-black ${stats.tareasBloqueadas > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                                {stats.tareasBloqueadas}
                            </p>
                            <p className="text-xs text-gray-500">Bloqueadas</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
