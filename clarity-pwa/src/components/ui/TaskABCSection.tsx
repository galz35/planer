/**
 * Sección de Recurrencia/Avance Mensual/Fases para TaskDetailModal
 * Solo se muestra si la tarea tiene comportamiento diferente a SIMPLE
 */
import React, { useState, useEffect } from 'react';
import { clarityService } from '../../services/clarity.service';
import { planningService } from '../../services/planning.service';
import { Repeat, Calendar, Layers, Check, SkipForward } from 'lucide-react';
import type { Tarea, TareaRecurrencia, TareaInstancia, TareaAvanceMensual } from '../../types/modelos';

interface Props {
    task: Tarea;
    onUpdate?: () => void;
}

const DIAS_SEMANA = [
    { n: 1, label: 'L' },
    { n: 2, label: 'M' },
    { n: 3, label: 'X' },
    { n: 4, label: 'J' },
    { n: 5, label: 'V' },
    { n: 6, label: 'S' },
    { n: 7, label: 'D' }
];

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export const TaskABCSection: React.FC<Props> = ({ task, onUpdate }) => {
    const [recurrencia, setRecurrencia] = useState<TareaRecurrencia | null>(null);
    const [instancias, setInstancias] = useState<TareaInstancia[]>([]);
    const [historialMensual, setHistorialMensual] = useState<TareaAvanceMensual[]>([]);

    // Para crear recurrencia
    const [showCrear, setShowCrear] = useState(false);
    const [diasSeleccionados, setDiasSeleccionados] = useState<number[]>([1, 2, 3, 4, 5]);
    const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0]);

    const [mesActual] = useState(new Date().getMonth() + 1);
    const [anioActual] = useState(new Date().getFullYear());
    const [nuevoAvance, setNuevoAvance] = useState(0);

    // Para fases (Grupo)
    const [fases, setFases] = useState<Tarea[]>([]);
    const [nuevaFaseTitulo, setNuevaFaseTitulo] = useState('');

    useEffect(() => {
        loadData();
    }, [task.idTarea]);

    const loadData = async () => {
        try {
            // Cargar recurrencia si existe
            if (task.comportamiento === 'RECURRENTE') {
                const rec = await clarityService.obtenerRecurrencia(task.idTarea) as TareaRecurrencia | null;
                setRecurrencia(rec);
                const inst = await clarityService.obtenerInstancias(task.idTarea, 10) as TareaInstancia[];
                setInstancias(inst || []);
            }

            // Cargar historial mensual y fases si es tarea larga
            if (task.comportamiento === 'LARGA') {
                const hist = await planningService.obtenerHistorialMensual(task.idTarea) as TareaAvanceMensual[];
                setHistorialMensual(hist || []);

                // Intentar cargar fases (si es grupo)
                try {
                    const listaFases = await planningService.obtenerGrupo(task.idTarea);
                    if (Array.isArray(listaFases)) {
                        setFases(listaFases);
                    }
                } catch (e) {
                    // Quizás no es grupo todavía, ignorar error 404
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleCrearRecurrencia = async () => {
        if (diasSeleccionados.length === 0) return alert('Selecciona al menos un día');
        try {
            await clarityService.crearRecurrencia(task.idTarea, {
                tipoRecurrencia: 'SEMANAL',
                diasSemana: diasSeleccionados.join(','),
                fechaInicioVigencia: fechaInicio
            });
            setShowCrear(false);
            loadData();
            onUpdate?.();
        } catch (e: any) {
            alert('Error: ' + (e.response?.data?.message || e.message));
        }
    };

    const handleMarcarInstancia = async (estado: 'HECHA' | 'OMITIDA') => {
        const hoy = new Date().toISOString().split('T')[0];
        try {
            await clarityService.marcarInstancia(task.idTarea, {
                fechaProgramada: hoy,
                estadoInstancia: estado
            });
            loadData();
            onUpdate?.();
        } catch (e: any) {
            alert('Error: ' + (e.response?.data?.message || e.message));
        }
    };

    const handleRegistrarAvance = async () => {
        if (nuevoAvance <= 0 || nuevoAvance > 100) return alert('Ingresa un porcentaje válido (1-100)');
        try {
            await planningService.registrarAvanceMensual(task.idTarea, {
                anio: anioActual,
                mes: mesActual,
                porcentajeMes: nuevoAvance
            });
            setNuevoAvance(0);
            loadData();
            onUpdate?.();
        } catch (e: any) {
            alert('Error: ' + (e.response?.data?.message || e.message));
        }
    };

    const handleCrearFase = async () => {
        if (!nuevaFaseTitulo.trim()) return;
        try {
            // 1. Asegurar que sea grupo
            if (fases.length === 0) {
                await planningService.crearGrupo(task.idTarea).catch(() => { });
            }

            // 2. Crear tarea rápida para la fase
            const faseDto: any = {
                titulo: nuevaFaseTitulo,
                idProyecto: task.idProyecto,
                prioridad: 'Media',
                esfuerzo: 'M',
                tipo: 'Operativo',
                idUsuario: 1,
                comportamiento: 'SIMPLE'
            };

            const nuevaTarea = await clarityService.postTarea(faseDto);
            if (!nuevaTarea) throw new Error('Error al crear tarea de fase');

            // 3. Agregar como fase
            await planningService.agregarFase(task.idTarea, nuevaTarea.idTarea);

            setNuevaFaseTitulo('');
            loadData();
            onUpdate?.();
        } catch (e: any) {
            alert('Error agregando fase: ' + (e.response?.data?.message || e.message));
        }
    };

    // Si es tarea simple, no mostrar nada especial
    if (!task.comportamiento || task.comportamiento === 'SIMPLE') {
        return null;
    }

    return (
        <div className="border-t pt-4 mt-4 space-y-4">
            {/* RECURRENTE */}
            {task.comportamiento === 'RECURRENTE' && (
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <div className="flex items-center gap-2 mb-3">
                        <Repeat size={16} className="text-blue-600" />
                        <span className="font-bold text-blue-800 text-sm">Tarea Recurrente</span>
                    </div>

                    {recurrencia ? (
                        <>
                            {/* Patrón actual */}
                            <div className="text-xs text-blue-600 mb-3">
                                Cada{' '}
                                {recurrencia.diasSemana?.split(',').map(d => DIAS_SEMANA.find(x => x.n === Number(d))?.label).join(', ')}
                                {' '}desde {recurrencia.fechaInicioVigencia?.split('T')[0]}
                            </div>

                            {/* Acciones rápidas para hoy */}
                            <div className="flex gap-2 mb-3">
                                <button
                                    onClick={() => handleMarcarInstancia('HECHA')}
                                    className="flex-1 py-2 bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                                >
                                    <Check size={14} /> Hecho hoy
                                </button>
                                <button
                                    onClick={() => handleMarcarInstancia('OMITIDA')}
                                    className="flex-1 py-2 bg-slate-200 text-slate-600 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                                >
                                    <SkipForward size={14} /> Omitir
                                </button>
                            </div>

                            {/* Bitácora reciente */}
                            {instancias.length > 0 && (
                                <div className="text-xs">
                                    <div className="font-bold text-slate-500 mb-1">Últimas ejecuciones:</div>
                                    <div className="space-y-1 max-h-24 overflow-y-auto">
                                        {instancias.slice(0, 5).map((inst, i) => (
                                            <div key={i} className="flex justify-between text-slate-600 bg-white p-1 rounded">
                                                <span>{inst.fechaProgramada?.split('T')[0]}</span>
                                                <span className={
                                                    inst.estadoInstancia === 'HECHA' ? 'text-emerald-600 font-bold' :
                                                        inst.estadoInstancia === 'OMITIDA' ? 'text-slate-400' : 'text-amber-600'
                                                }>
                                                    {inst.estadoInstancia}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {/* Crear recurrencia */}
                            {!showCrear ? (
                                <button
                                    onClick={() => setShowCrear(true)}
                                    className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold"
                                >
                                    Configurar Recurrencia
                                </button>
                            ) : (
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs font-bold text-blue-600 mb-1 block">Días de la semana</label>
                                        <div className="flex gap-1">
                                            {DIAS_SEMANA.map(d => (
                                                <button
                                                    key={d.n}
                                                    onClick={() => {
                                                        if (diasSeleccionados.includes(d.n)) {
                                                            setDiasSeleccionados(diasSeleccionados.filter(x => x !== d.n));
                                                        } else {
                                                            setDiasSeleccionados([...diasSeleccionados, d.n]);
                                                        }
                                                    }}
                                                    className={`w-8 h-8 rounded-full text-xs font-bold ${diasSeleccionados.includes(d.n)
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-white text-slate-400 border'
                                                        }`}
                                                >
                                                    {d.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-blue-600 mb-1 block">Desde</label>
                                        <input
                                            type="date"
                                            value={fechaInicio}
                                            onChange={e => setFechaInicio(e.target.value)}
                                            className="w-full p-2 border rounded-lg text-sm"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setShowCrear(false)} className="flex-1 py-2 bg-slate-100 rounded-lg text-xs">Cancelar</button>
                                        <button onClick={handleCrearRecurrencia} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold">Guardar</button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* TAREA LARGA - AVANCE MENSUAL */}
            {task.comportamiento === 'LARGA' && (
                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                    <div className="flex items-center gap-2 mb-3">
                        <Calendar size={16} className="text-purple-600" />
                        <span className="font-bold text-purple-800 text-sm">Tarea Larga (Avance Mensual)</span>
                    </div>

                    {/* Gráfico simple de barras */}
                    <div className="flex gap-1 mb-3 h-16">
                        {MESES.map((m, i) => {
                            const avance = historialMensual.find(h => h.mes === i + 1 && h.anio === anioActual);
                            const pct = avance?.porcentajeMes || 0;
                            return (
                                <div key={m} className="flex-1 flex flex-col items-center justify-end">
                                    <div
                                        className={`w-full rounded-t ${pct > 0 ? 'bg-purple-500' : 'bg-slate-200'}`}
                                        style={{ height: `${Math.max(pct, 5)}%` }}
                                    />
                                    <span className="text-[9px] text-slate-400 mt-1">{m}</span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Acumulado */}
                    {historialMensual.length > 0 && (
                        <div className="text-center mb-3">
                            <span className="text-2xl font-bold text-purple-700">
                                {historialMensual[historialMensual.length - 1]?.porcentajeAcumulado || 0}%
                            </span>
                            <span className="text-xs text-purple-500 ml-1">acumulado</span>
                        </div>
                    )}

                    {/* Registrar avance del mes */}
                    <div className="flex gap-2 items-center">
                        <input
                            type="number"
                            min="0"
                            max="100"
                            value={nuevoAvance || ''}
                            onChange={e => setNuevoAvance(Number(e.target.value))}
                            placeholder={`% ${MESES[mesActual - 1]}`}
                            className="flex-1 p-2 border rounded-lg text-sm text-center"
                        />
                        <button
                            onClick={handleRegistrarAvance}
                            className="py-2 px-4 bg-purple-600 text-white rounded-lg text-xs font-bold"
                        >
                            Registrar
                        </button>
                    </div>

                    {/* FASES DEL GRUPO (Si es "LARGA" asumimos que puede tener fases) */}
                    <div className="mt-4 pt-4 border-t border-purple-200">
                        <div className="flex items-center gap-2 mb-2">
                            <Layers size={14} className="text-purple-600" />
                            <span className="font-bold text-purple-800 text-xs uppercase">Fases / Hitos</span>
                        </div>

                        <div className="space-y-2 mb-3">
                            {fases.map((f, i) => (
                                <div key={f.idTarea} className="flex items-center justify-between bg-white p-2 rounded border border-purple-100 shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center">
                                            {f.numeroParte || i + 1}
                                        </span>
                                        <span className="text-sm text-slate-700 font-medium line-clamp-1">{f.titulo}</span>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${f.estado === 'Hecha' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                        }`}>
                                        {f.estado}
                                    </span>
                                </div>
                            ))}
                            {fases.length === 0 && (
                                <div className="text-xs text-slate-400 italic text-center py-2">
                                    No hay fases registradas.
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={nuevaFaseTitulo}
                                onChange={e => setNuevaFaseTitulo(e.target.value)}
                                placeholder="Nueva fase..."
                                className="flex-1 p-2 border rounded-lg text-xs"
                                onKeyDown={e => e.key === 'Enter' && handleCrearFase()}
                            />
                            <button
                                onClick={handleCrearFase}
                                disabled={!nuevaFaseTitulo.trim()}
                                className="bg-purple-600 text-white p-2 rounded-lg disabled:opacity-50"
                            >
                                <Check size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* GRUPO/FASES */}
            {task.idGrupo && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                        <Layers size={16} className="text-slate-600" />
                        <span className="font-bold text-slate-700 text-sm">
                            Fase {task.numeroParte} de grupo
                        </span>
                    </div>
                    <p className="text-xs text-slate-500">
                        Esta tarea es parte de un grupo de fases (ID: {task.idGrupo})
                    </p>
                </div>
            )}
        </div>
    );
};
