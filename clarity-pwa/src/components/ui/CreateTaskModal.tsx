import React, { useState, useEffect } from 'react';
import { Plus, Book, Zap, Search, User, X } from 'lucide-react';
import { clarityService } from '../../services/clarity.service';
import { accesoService } from '../../services/acceso.service';
import type { Proyecto, Prioridad, Esfuerzo, ComportamientoTarea, TipoTarea } from '../../types/modelos';
import type { Empleado } from '../../types/acceso';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    currentProject?: Proyecto | null;
    onTaskCreated: () => void;
    projects: Proyecto[];
}

// Tipos de trabajo disponibles
const TIPOS_TRABAJO = [
    { value: 'Logistica', label: 'Logística' },
    { value: 'Administrativa', label: 'Administrativa' },
    { value: 'Estrategica', label: 'Estratégica' },
    { value: 'Otros', label: 'Otros' }
];

export const CreateTaskModal: React.FC<Props> = ({ isOpen, onClose, currentProject, onTaskCreated }) => {
    const [titulo, setTitulo] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [prioridad, setPrioridad] = useState<Prioridad>('Media');
    const [esfuerzo, setEsfuerzo] = useState<Esfuerzo>('M');
    const [tipoTrabajo, setTipoTrabajo] = useState<TipoTarea>('Administrativa');

    // Fechas (Simple)
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');

    // Tipo de tarea (comportamiento)
    const [comportamiento, setComportamiento] = useState<ComportamientoTarea>('SIMPLE');

    // Configuración Recurrencia
    const [tipoRecurrencia, setTipoRecurrencia] = useState<'SEMANAL' | 'MENSUAL'>('SEMANAL');
    const [diasSemana, setDiasSemana] = useState<number[]>([]);
    const [diaMes, setDiaMes] = useState<number>(1);

    // Asignado a - Search autocomplete
    const [searchAsignado, setSearchAsignado] = useState('');
    const [searchResults, setSearchResults] = useState<Empleado[]>([]);
    const [selectedAsignado, setSelectedAsignado] = useState<Empleado | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);

    const [loading, setLoading] = useState(false);

    // Usar el proyecto actual automáticamente (NO mostrar selector)
    const idProyecto = currentProject?.idProyecto;

    useEffect(() => {
        if (isOpen) {
            // Reset form on open
            setTitulo('');
            setDescripcion('');
            setPrioridad('Media');
            setEsfuerzo('M');
            setTipoTrabajo('Administrativa');
            setFechaInicio('');
            setFechaFin('');
            setComportamiento('SIMPLE');
            setDiasSemana([]);
            setDiaMes(1);
            setSearchAsignado('');
            setSearchResults([]);
            setSelectedAsignado(null);
        }
    }, [isOpen]);

    // Buscar empleados cuando el usuario escribe
    const handleSearchAsignado = async (value: string) => {
        setSearchAsignado(value);
        setSelectedAsignado(null); // Clear selection when typing

        if (value.length < 2) {
            setSearchResults([]);
            setShowDropdown(false);
            return;
        }

        try {
            const res = await accesoService.buscarEmpleados(value, 5);
            const empleados = res.data?.data || [];
            setSearchResults(empleados);
            setShowDropdown(empleados.length > 0);
        } catch (err) {
            console.error('Error buscando empleados:', err);
            setSearchResults([]);
        }
    };

    const handleSelectAsignado = (emp: Empleado) => {
        setSelectedAsignado(emp);
        setSearchAsignado(emp.nombreCompleto || emp.carnet);
        setShowDropdown(false);
        setSearchResults([]);
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!titulo.trim()) return alert('El título es requerido');
        if (!idProyecto) return alert('No hay proyecto seleccionado');
        if (!selectedAsignado) return alert('Debes seleccionar un empleado asignado');

        setLoading(true);
        try {
            const nuevaTarea = await clarityService.postTarea({
                titulo,
                descripcion,
                idProyecto: Number(idProyecto),
                prioridad,
                esfuerzo,
                idResponsable: selectedAsignado.idUsuario, // El asignado
                tipo: tipoTrabajo,
                comportamiento,
                fechaInicioPlanificada: fechaInicio || undefined,
                fechaObjetivo: fechaFin || undefined
            } as any);

            // Si es recurrente, crear configuración
            if (comportamiento === 'RECURRENTE' && nuevaTarea?.idTarea) {
                if (tipoRecurrencia === 'SEMANAL' && diasSemana.length === 0) {
                    alert('Debes seleccionar al menos un día para la recurrencia semanal');
                    setLoading(false);
                    return;
                }

                await clarityService.crearRecurrencia(nuevaTarea.idTarea, {
                    tipoRecurrencia,
                    diasSemana: tipoRecurrencia === 'SEMANAL' ? diasSemana.join(',') : undefined,
                    diaMes: tipoRecurrencia === 'MENSUAL' ? diaMes : undefined,
                    fechaInicioVigencia: new Date().toISOString().split('T')[0]
                });
            }

            onTaskCreated();
            onClose();
        } catch (error: any) {
            console.error(error);
            alert('Error al crear tarea: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <Plus size={20} className="text-blue-600" /> Nueva Tarea
                    </h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-full text-slate-500">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
                    {/* Título */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Título *</label>
                        <input
                            autoFocus
                            type="text"
                            value={titulo}
                            onChange={e => setTitulo(e.target.value)}
                            placeholder="Ej: Preparar informe mensual"
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
                        />
                    </div>

                    {/* Descripción (visible y prioritaria) */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descripción</label>
                        <textarea
                            value={descripcion}
                            onChange={e => setDescripcion(e.target.value)}
                            placeholder="Describe la tarea con detalle..."
                            rows={3}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all resize-none"
                        />
                    </div>

                    {/* Asignado a - Autocomplete */}
                    <div className="relative">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Asignado a *</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                value={searchAsignado}
                                onChange={e => handleSearchAsignado(e.target.value)}
                                onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                                placeholder="Buscar por nombre o carnet..."
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                            />
                            {selectedAsignado && (
                                <User className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" size={16} />
                            )}
                        </div>

                        {/* Dropdown de resultados */}
                        {showDropdown && searchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                                {searchResults.map(emp => (
                                    <button
                                        key={emp.carnet}
                                        type="button"
                                        onClick={() => handleSelectAsignado(emp)}
                                        className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0"
                                    >
                                        <p className="font-bold text-slate-800 text-sm">{emp.nombreCompleto}</p>
                                        <p className="text-[10px] text-slate-400 uppercase">{emp.carnet} • {emp.cargo || 'Sin cargo'}</p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Tipo de trabajo */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Trabajo *</label>
                        <select
                            value={tipoTrabajo}
                            onChange={e => setTipoTrabajo(e.target.value as TipoTarea)}
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none focus:border-blue-500"
                        >
                            {TIPOS_TRABAJO.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Tipo de Tarea (Comportamiento) - Oculto a petición: por defecto SIMPLE */}
                    {false && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tipo de Tarea</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setComportamiento('SIMPLE')}
                                    className={`p-2.5 rounded-lg border flex flex-col items-center gap-1 transition-all ${comportamiento === 'SIMPLE'
                                        ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500'
                                        : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                                        }`}
                                >
                                    <Zap size={18} className={comportamiento === 'SIMPLE' ? 'text-blue-600' : 'text-slate-400'} />
                                    <span className={`text-[10px] uppercase font-bold ${comportamiento === 'SIMPLE' ? 'text-blue-700' : ''}`}>Simple</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setComportamiento('LARGA')}
                                    className={`p-2.5 rounded-lg border flex flex-col items-center gap-1 transition-all ${comportamiento === 'LARGA'
                                        ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-500'
                                        : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                                        }`}
                                >
                                    <Book size={18} className={comportamiento === 'LARGA' ? 'text-purple-600' : 'text-slate-400'} />
                                    <span className={`text-[10px] uppercase font-bold ${comportamiento === 'LARGA' ? 'text-purple-700' : ''}`}>Avance Mensual</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Campos condicionales según comportamiento */}

                    {/* SIMPLE: Fechas */}
                    {comportamiento === 'SIMPLE' && (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha Inicio</label>
                                <input
                                    type="date"
                                    value={fechaInicio}
                                    onChange={e => setFechaInicio(e.target.value)}
                                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha Fin</label>
                                <input
                                    type="date"
                                    value={fechaFin}
                                    onChange={e => setFechaFin(e.target.value)}
                                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>
                    )}

                    {/* RECURRENTE: Configuración */}
                    {comportamiento === 'RECURRENTE' && (
                        <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                            <label className="block text-xs font-bold text-indigo-800 uppercase mb-2">Configuración Recurrencia</label>

                            <div className="flex gap-4 mb-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="tipoRec"
                                        checked={tipoRecurrencia === 'SEMANAL'}
                                        onChange={() => setTipoRecurrencia('SEMANAL')}
                                        className="text-indigo-600"
                                    />
                                    <span className="text-sm font-medium text-slate-700">Semanal</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="tipoRec"
                                        checked={tipoRecurrencia === 'MENSUAL'}
                                        onChange={() => setTipoRecurrencia('MENSUAL')}
                                        className="text-indigo-600"
                                    />
                                    <span className="text-sm font-medium text-slate-700">Mensual</span>
                                </label>
                            </div>

                            {tipoRecurrencia === 'SEMANAL' ? (
                                <div>
                                    <p className="text-xs text-slate-500 mb-2">Días de la semana:</p>
                                    <div className="flex gap-2">
                                        {[
                                            { label: 'L', val: 1 },
                                            { label: 'M', val: 2 },
                                            { label: 'Mi', val: 3 },
                                            { label: 'J', val: 4 },
                                            { label: 'V', val: 5 }
                                        ].map(d => (
                                            <button
                                                key={d.val}
                                                type="button"
                                                onClick={() => {
                                                    setDiasSemana(prev =>
                                                        prev.includes(d.val) ? prev.filter(x => x !== d.val) : [...prev, d.val]
                                                    );
                                                }}
                                                className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center transition-all ${diasSemana.includes(d.val)
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'bg-white border hover:bg-slate-50 text-slate-400'
                                                    }`}
                                            >
                                                {d.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-xs text-slate-500 mb-2">Día del mes (1-31):</p>
                                    <input
                                        type="number"
                                        min="1" max="31"
                                        value={diaMes}
                                        onChange={e => setDiaMes(Number(e.target.value))}
                                        className="w-20 p-2 bg-white border border-indigo-200 rounded-lg text-center font-bold text-indigo-700 outline-none"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* LARGA (Avance Mensual): Configuración */}
                    {comportamiento === 'LARGA' && (
                        <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg">
                            <label className="block text-xs font-bold text-purple-800 uppercase mb-2">Avance Mensual</label>
                            <p className="text-xs text-slate-600">
                                Esta tarea se medirá con avance mensual. Podrás registrar el progreso cada mes desde el detalle de la tarea.
                            </p>
                            <div className="grid grid-cols-2 gap-3 mt-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha Inicio</label>
                                    <input
                                        type="date"
                                        value={fechaInicio}
                                        onChange={e => setFechaInicio(e.target.value)}
                                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-purple-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha Objetivo</label>
                                    <input
                                        type="date"
                                        value={fechaFin}
                                        onChange={e => setFechaFin(e.target.value)}
                                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-purple-500"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Prioridad y Esfuerzo */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Prioridad</label>
                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                {['Alta', 'Media', 'Baja'].map(p => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setPrioridad(p as Prioridad)}
                                        className={`flex-1 py-1.5 text-xs font-bold rounded ${prioridad === p ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Esfuerzo</label>
                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                {['S', 'M', 'L'].map(e => (
                                    <button
                                        key={e}
                                        type="button"
                                        onClick={() => setEsfuerzo(e as Esfuerzo)}
                                        className={`flex-1 py-1.5 text-xs font-bold rounded ${esfuerzo === e ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}
                                    >
                                        {e}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all flex justify-center items-center gap-2 disabled:opacity-50"
                    >
                        {loading ? 'Creando...' : <><Plus size={18} /> Crear Tarea</>}
                    </button>
                </form>
            </div>
        </div>
    );
};
