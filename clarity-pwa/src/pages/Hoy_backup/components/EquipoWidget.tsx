import React, { useState, useEffect } from 'react';
import { clarityService } from '../../../services/clarity.service';
import { Users, User, CheckCircle2, Circle, AlertTriangle, Clock, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import type { Usuario, Tarea } from '../../../types/modelos';

interface Props {
    userId: number;
}

interface TeamMember {
    usuario: Usuario;
    tareas: Tarea[];
    completadas: number;
    pendientes: number;
    bloqueadas: number;
    atrasadas: number;
}

export const EquipoWidget: React.FC<Props> = ({ userId }) => {
    const [loading, setLoading] = useState(true);
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [expanded, setExpanded] = useState<number | null>(null);

    useEffect(() => {
        loadData();
    }, [userId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const workload = await clarityService.getWorkload();
            if (!workload?.users) { setLoading(false); return; }

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayStr = today.toISOString().split('T')[0];

            const teamData: TeamMember[] = workload.users.map((user: Usuario) => {
                const userTasks = workload.tasks?.filter((t: Tarea) =>
                    t.asignados?.some(a => a.idUsuario === user.idUsuario)
                ) || [];

                return {
                    usuario: user,
                    tareas: userTasks,
                    completadas: userTasks.filter((t: Tarea) => t.estado === 'Hecha').length,
                    pendientes: userTasks.filter((t: Tarea) => !['Hecha', 'Descartada', 'Bloqueada'].includes(t.estado)).length,
                    bloqueadas: userTasks.filter((t: Tarea) => t.estado === 'Bloqueada').length,
                    atrasadas: userTasks.filter((t: Tarea) => {
                        const fecha = t.fechaObjetivo?.split('T')[0];
                        return fecha && fecha < todayStr && !['Hecha', 'Descartada'].includes(t.estado);
                    }).length
                };
            }).sort((a: TeamMember, b: TeamMember) => b.pendientes - a.pendientes);

            setTeam(teamData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const getLoadColor = (pendientes: number) => {
        if (pendientes >= 10) return 'text-red-500 bg-red-50';
        if (pendientes >= 5) return 'text-amber-500 bg-amber-50';
        if (pendientes > 0) return 'text-blue-500 bg-blue-50';
        return 'text-green-500 bg-green-50';
    };

    const getLoadLabel = (pendientes: number) => {
        if (pendientes >= 10) return 'Sobrecargado';
        if (pendientes >= 5) return 'Carga Alta';
        if (pendientes > 0) return 'Normal';
        return 'Disponible';
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center">
                <Loader2 className="animate-spin mx-auto text-blue-500 mb-2" size={24} />
                <p className="text-gray-400 text-sm">Cargando equipo...</p>
            </div>
        );
    }

    if (team.length === 0) {
        return (
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center">
                <Users size={48} className="mx-auto text-gray-300 mb-3" />
                <h3 className="text-lg font-bold text-gray-600">Sin Datos de Equipo</h3>
                <p className="text-sm text-gray-400">No hay información de carga de trabajo disponible</p>
            </div>
        );
    }

    const totalTareas = team.reduce((a, m) => a + m.tareas.length, 0);
    const totalCompletadas = team.reduce((a, m) => a + m.completadas, 0);
    const totalBloqueadas = team.reduce((a, m) => a + m.bloqueadas, 0);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white p-4 rounded-xl">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <Users size={20} /> Vista de Equipo
                        </h2>
                        <p className="text-sm text-blue-200">Carga de trabajo</p>
                    </div>
                    <div className="text-right">
                        <p className="text-3xl font-black">{team.length}</p>
                        <p className="text-sm text-blue-200">miembros</p>
                    </div>
                </div>
            </div>

            {/* Resumen Global */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm text-center">
                    <p className="text-2xl font-black text-gray-800">{totalTareas}</p>
                    <p className="text-xs text-gray-400">Total Tareas</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm text-center">
                    <p className="text-2xl font-black text-green-500">{totalCompletadas}</p>
                    <p className="text-xs text-gray-400">Completadas</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm text-center">
                    <p className="text-2xl font-black text-red-500">{totalBloqueadas}</p>
                    <p className="text-xs text-gray-400">Bloqueadas</p>
                </div>
            </div>

            {/* Lista de Miembros */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <h3 className="text-sm font-bold text-gray-700">Carga por Persona</h3>
                </div>
                <div className="divide-y divide-gray-100">
                    {team.map(member => {
                        const isExpanded = expanded === member.usuario.idUsuario;
                        return (
                            <div key={member.usuario.idUsuario}>
                                <button
                                    onClick={() => setExpanded(isExpanded ? null : member.usuario.idUsuario)}
                                    className="w-full p-4 hover:bg-gray-50 text-left"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                                <User size={20} className="text-indigo-600" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-800">{member.usuario.nombre}</h4>
                                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                                    <span>{member.usuario.area || 'Sin área'}</span>
                                                    {member.usuario.cargo && <span>• {member.usuario.cargo}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="flex items-center gap-1 text-green-600">
                                                    <CheckCircle2 size={12} /> {member.completadas}
                                                </span>
                                                <span className="flex items-center gap-1 text-blue-600">
                                                    <Circle size={12} /> {member.pendientes}
                                                </span>
                                                {member.bloqueadas > 0 && (
                                                    <span className="flex items-center gap-1 text-red-600">
                                                        <AlertTriangle size={12} /> {member.bloqueadas}
                                                    </span>
                                                )}
                                                {member.atrasadas > 0 && (
                                                    <span className="flex items-center gap-1 text-amber-600">
                                                        <Clock size={12} /> {member.atrasadas}
                                                    </span>
                                                )}
                                            </div>
                                            <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${getLoadColor(member.pendientes)}`}>
                                                {getLoadLabel(member.pendientes)}
                                            </span>
                                            {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                                        </div>
                                    </div>
                                </button>

                                {/* Tareas expandidas */}
                                {isExpanded && member.tareas.length > 0 && (
                                    <div className="px-4 pb-4 pl-16">
                                        <div className="space-y-1">
                                            {member.tareas.slice(0, 10).map(task => (
                                                <div key={task.idTarea} className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded">
                                                    {task.estado === 'Hecha' ? (
                                                        <CheckCircle2 size={14} className="text-green-500" />
                                                    ) : task.estado === 'Bloqueada' ? (
                                                        <AlertTriangle size={14} className="text-red-500" />
                                                    ) : (
                                                        <Circle size={14} className="text-gray-300" />
                                                    )}
                                                    <span className={task.estado === 'Hecha' ? 'line-through text-gray-400' : 'text-gray-700'}>
                                                        {task.titulo}
                                                    </span>
                                                    <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${task.prioridad === 'Alta' ? 'bg-red-100 text-red-600' :
                                                            task.prioridad === 'Media' ? 'bg-amber-100 text-amber-600' :
                                                                'bg-gray-100 text-gray-500'
                                                        }`}>{task.prioridad}</span>
                                                </div>
                                            ))}
                                            {member.tareas.length > 10 && (
                                                <p className="text-xs text-gray-400 pl-2">+{member.tareas.length - 10} más</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
