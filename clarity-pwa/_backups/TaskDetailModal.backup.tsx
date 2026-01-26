import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '../../context/ToastContext';
import type { Tarea, Usuario } from '../../types/modelos';
import {
    X, Save, AlertTriangle, CheckCircle, Ban, UserPlus, Calendar, AlignLeft, Users,
    Clock, Lock, FileSignature, History, Search, MessageSquare, Link
} from 'lucide-react';
import { clarityService } from '../../services/clarity.service';
import { planningService } from '../../services/planning.service';
import { SolicitudCambioModal } from './SolicitudCambioModal';
import { TaskABCSection } from './TaskABCSection';

interface Props {
    task: Tarea;
    onClose: () => void;
    onUpdate: () => void;
    mode?: 'planning' | 'execution';
}

export const TaskDetailModal: React.FC<Props> = ({ task, onClose, onUpdate, mode = 'execution' }) => {
    const { showToast } = useToast();
    // Task Fields
    const [titulo, setTitulo] = useState(task.titulo || '');
    const [progreso, setProgreso] = useState(task.progreso || 0);
    const [descripcion, setDescripcion] = useState(task.descripcion || '');
    const [fechaObjetivo, setFechaObjetivo] = useState(task.fechaObjetivo ? task.fechaObjetivo.split('T')[0] : '');
    const [fechaInicioPlanificada, setFechaInicioPlanificada] = useState(task.fechaInicioPlanificada ? task.fechaInicioPlanificada.split('T')[0] : '');
    const [linkEvidencia, setLinkEvidencia] = useState(task.linkEvidencia || '');
    const [requiereEvidencia, setRequiereEvidencia] = useState((task as any).requiereEvidencia || false);
    const [comentario, setComentario] = useState('');

    // Planning Intelligence State
    const [planningCheck, setPlanningCheck] = useState<{ puedeEditar: boolean; requiereAprobacion: boolean; tipoProyecto: string } | null>(null);
    const [requestReason, setRequestReason] = useState('');
    const [requestField, setRequestField] = useState<'fechaObjetivo' | 'fechaInicioPlanificada'>('fechaObjetivo');
    const [requestValue, setRequestValue] = useState('');

    // UI State
    const [submitting, setSubmitting] = useState(false);
    const [view, setView] = useState<'Main' | 'Block' | 'Reassign' | 'RequestChange'>('Main');
    const [activeTab, setActiveTab] = useState<'Info' | 'Foco' | 'Historial'>('Info');

    // Blocker & Reassign State
    const [blockerReason, setBlockerReason] = useState('');
    const [blockerWho, setBlockerWho] = useState('');
    const [blockerUserId, setBlockerUserId] = useState<number | null>(null);

    const [reassignUserId, setReassignUserId] = useState<number | null>(null);
    const [searchReassign, setSearchReassign] = useState('');
    const [team, setTeam] = useState<Usuario[]>([]);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);

    // Parent Search
    const [searchParentTerm, setSearchParentTerm] = useState('');
    const [parentResults, setParentResults] = useState<Tarea[]>([]);
    const [isSearchingParent, setIsSearchingParent] = useState(false);

    // Change Request Modal
    const [showChangeModal, setShowChangeModal] = useState(false);
    const [pendingChanges, setPendingChanges] = useState<any>(null);

    const [fullTask, setFullTask] = useState<Tarea | null>(null);
    const [idTareaPadre, setIdTareaPadre] = useState<number | undefined>(task.idTareaPadre);

    useEffect(() => {
        clarityService.getTaskById(task.idTarea)
            .then(t => {
                if (t) {
                    setFullTask(t);
                    if (t.idTareaPadre) setIdTareaPadre(t.idTareaPadre);
                }
            })
            .catch(console.error);

        planningService.checkPermission(task.idTarea)
            .then(setPlanningCheck)
            .catch(console.error);

        clarityService.getWorkload()
            .then(data => { if (data && data.users) setTeam(data.users); })
            .catch(console.error);

        clarityService.getAuditLogsByTask(task.idTarea)
            .then(data => setAuditLogs(data || []))
            .catch(console.error);
    }, [task.idTarea]);

    useEffect(() => {
        if (searchParentTerm.length < 2) {
            setParentResults([]);
            return;
        }

        const timer = setTimeout(() => {
            setIsSearchingParent(true);
            clarityService.getMisTareas({ query: searchParentTerm })
                .then(tasks => {
                    if (tasks) setParentResults(tasks.filter(t => t.idTarea !== task.idTarea).slice(0, 5));
                })
                .finally(() => setIsSearchingParent(false));
        }, 500);

        return () => clearTimeout(timer);
    }, [searchParentTerm, task.idTarea]);

    const handleAddSubtask = async () => {
        const tituloSub = prompt('Nombre de la subtarea:');
        if (!tituloSub) return;

        try {
            await clarityService.postTarea({
                titulo: tituloSub,
                idProyecto: task.idProyecto,
                idUsuario: task.idResponsable || task.idCreador,
                idResponsable: task.idResponsable || task.idCreador,
                prioridad: 'Media',
                esfuerzo: 'S',
                fechaInicioPlanificada: task.fechaInicioPlanificada,
                fechaObjetivo: task.fechaObjetivo,
                idTareaPadre: task.idTarea
            } as any);

            // Recargar tarea completa para ver la nueva subtarea
            const updated = await clarityService.getTaskById(task.idTarea);
            if (updated) setFullTask(updated);
            onUpdate();
        } catch (error) {
            alert('Error al crear subtarea');
        }
    };

    const handleSaveProgress = async () => {
        setSubmitting(true);
        try {
            // Detectar cambios en campos de definición para evitar llamadas innecesarias (y errores de permiso 403)
            const currentTitulo = task.titulo || '';
            const currentFechaObj = task.fechaObjetivo ? task.fechaObjetivo.split('T')[0] : '';
            const currentFechaIni = task.fechaInicioPlanificada ? task.fechaInicioPlanificada.split('T')[0] : '';
            const currentDesc = task.descripcion || '';

            const hasDefinitionsChanged =
                titulo.trim() !== currentTitulo.trim() ||
                descripcion.trim() !== currentDesc.trim() ||
                fechaObjetivo !== currentFechaObj ||
                fechaInicioPlanificada !== currentFechaIni ||
                (linkEvidencia || '') !== (task.linkEvidencia || '');

            if (hasDefinitionsChanged) {
                const isLocked = !!planningCheck?.requiereAprobacion;
                const changingDates = fechaObjetivo !== currentFechaObj || fechaInicioPlanificada !== currentFechaIni;

                if (changingDates && isLocked) {
                    setPendingChanges({
                        titulo: titulo.trim() || undefined,
                        fechaObjetivo: fechaObjetivo || undefined,
                        fechaInicioPlanificada: fechaInicioPlanificada || undefined,
                        descripcion,
                        linkEvidencia: linkEvidencia || undefined
                    });
                    setShowChangeModal(true);
                    setSubmitting(false);
                    return;
                }

                await clarityService.actualizarTarea(task.idTarea, {
                    titulo: titulo.trim() || undefined,
                    fechaObjetivo: fechaObjetivo || undefined,
                    fechaInicioPlanificada: fechaInicioPlanificada || undefined,
                    descripcion,
                    linkEvidencia: linkEvidencia || undefined,
                    idTareaPadre: idTareaPadre || undefined
                });
            }

            // Registrar Avance
            await clarityService.postAvance(task.idTarea, {
                idUsuario: task.idCreador,
                progreso,
                comentario: comentario || 'Actualización de progreso'
            });

            onUpdate();
            onClose();
        } catch (error: any) {
            console.error(error);
            if (error.response?.data?.message?.includes('requiere aprobación')) {
                alert('⚠️ CAMBIO BLOQUEADO: Esta tarea es estratégica y requiere aprobación para cambiar fechas.');
            } else if (error.response?.status === 403) {
                alert('No tienes permisos para editar la definición de esta tarea (Fechas/Descripción), pero el avance debería haberse guardado si no hubo cambios.');
            } else {
                alert('Error al guardar cambios: ' + (error.response?.data?.message || error.message));
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleConfirmChange = async (motivo: string) => {
        setShowChangeModal(false);
        setSubmitting(true);
        try {
            // Enviar con motivo
            await clarityService.actualizarTarea(task.idTarea, {
                ...pendingChanges,
                motivo
            });

            // Registrar Avance también
            await clarityService.postAvance(task.idTarea, {
                idUsuario: task.idCreador,
                progreso,
                comentario: comentario || 'Actualización de progreso (con solicitud de cambio)'
            });

            alert('✅ Solicitud de cambio enviada para aprobación.');
            onUpdate();
            onClose();
        } catch (error: any) {
            console.error(error);
            alert('Error al enviar solicitud: ' + (error.response?.data?.message || error.message));
        } finally {
            setSubmitting(false);
            setPendingChanges(null);
        }
    };

    const handleSubmitChangeRequest = async () => {
        if (!requestReason.trim()) return alert('Debes justificar el cambio.');
        setSubmitting(true);
        try {
            await planningService.requestChange(task.idTarea, requestField, requestValue, requestReason);
            alert('✅ Solicitud enviada al gerente.');
            setView('Main');
        } catch {
            alert('Error al enviar solicitud.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCreateBlocker = async () => {
        if (!blockerReason.trim()) return alert('Indica el motivo del bloqueo');
        setSubmitting(true);
        try {
            await clarityService.postBloqueo({
                idOrigenUsuario: task.asignados?.find(a => a.tipo === 'Responsable')?.idUsuario || task.idCreador,
                idTarea: task.idTarea,
                motivo: blockerReason,
                destinoTexto: blockerWho || 'Interno',
                idDestinoUsuario: blockerUserId || undefined,
            });
            alert('Bloqueo registrado');
            onUpdate();
            onClose();
        } catch {
            alert('Error al crear bloqueo');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAction = async (accion: 'HechaPorOtro' | 'NoAplica' | 'Posponer') => {
        if (accion === 'Posponer') {
            if (!confirm('¿Posponer al backlog? Se quitará de tu día.')) return;
            // @ts-ignore (depende de tu contrato backend)
            await clarityService.actualizarTarea(task.idTarea, { estado: 'Pendiente', fechaObjetivo: null, fechaInicioPlanificada: null });
            onUpdate();
            onClose();
            return;
        }

        if (!confirm('¿Seguro? Esta acción cerrará la tarea.')) return;

        try {
            if (accion === 'NoAplica') await clarityService.descartarTarea(task.idTarea);
            else await clarityService.revalidarTarea(task.idTarea, accion, reassignUserId || undefined);

            onUpdate();
            onClose();
        } catch (e: any) {
            console.error(e);
            alert('Error: ' + (e.response?.data?.message || e.message));
        }
    };

    const handleReassign = async () => {
        if (!reassignUserId) return alert('Selecciona un responsable');
        setSubmitting(true);
        try {
            await clarityService.revalidarTarea(task.idTarea, 'Reasignar', reassignUserId);
            onUpdate();
            onClose();
        } catch {
            alert('Error al reasignar');
        } finally {
            setSubmitting(false);
        }
    };

    const isStrategic = planningCheck?.tipoProyecto === 'Estrategico';
    const isLocked = !!planningCheck?.requiereAprobacion;

    // Helpers para evitar strings multi-line raros en JSX
    const getDotClass = (log: any) => {
        const isRed = log.accion === 'Update' && (log.datosNuevos || '').includes('Descartada');
        return 'absolute -left-[5px] top-1.5 w-2 h-2 rounded-full ring-4 ring-white transition-colors ' + (isRed ? 'bg-red-400' : 'bg-slate-300 group-hover:bg-blue-400');
    };

    const getTituloLog = (log: any): React.ReactNode => {
        if (log.accion === 'Create') return 'Creó la tarea';
        if (log.accion === 'Update') {
            const dn = log.datosNuevos || '';
            if (dn.includes('"estado":"Descartada"')) return <span className="text-red-600 font-bold">Descartó la tarea</span>;
            if (dn.includes('"estado":"Hecha"')) return <span className="text-emerald-600 font-bold">Completó la tarea</span>;
            return 'Actualizó la tarea';
        }
        return 'Acción registrada';
    };

    const getExtraLog = (log: any) => {
        if (!log.detalles) return null;
        try {
            const d = typeof log.detalles === 'string' ? JSON.parse(log.detalles) : log.detalles;

            // Si el log tiene un 'diff' (nuestra nueva implementación), mostrarlo rico
            if (d?.diff) {
                return (
                    <div className="mt-2 space-y-1 bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                        {Object.entries(d.diff).map(([key, val]: [string, any]) => (
                            <div key={key} className="flex items-center gap-1.5 text-[10px]">
                                <span className="text-slate-400 uppercase font-bold w-12 truncate">{key}:</span>
                                <span className="text-slate-500 line-through truncate max-w-[80px]">{String(val.from)}</span>
                                <span className="text-slate-300">→</span>
                                <span className="text-blue-600 font-bold truncate">{String(val.to)}</span>
                            </div>
                        ))}
                    </div>
                );
            }

            if (d?.comentario) {
                return <p className="mt-1 text-slate-600 italic border-l-2 border-slate-200 pl-2">"{d.comentario}"</p>;
            }

            if (d?.requestField) return <span className="text-purple-600"> - Solicitó cambio en: {d.requestField}</span>;
            return null;
        } catch {
            return null;
        }
    };

    return createPortal(
        <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ring-1 ring-slate-900/5">

                {/* Header with Breadcrumbs */}
                <div className="px-6 py-4 border-b flex justify-between items-start bg-slate-50/50 relative overflow-hidden shrink-0">
                    {isStrategic && <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-600" />}

                    <div className="flex-1 pr-8 pl-1 min-w-0">
                        {/* Breadcrumbs */}
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 overflow-hidden">
                            <span className="truncate max-w-[120px]">{task.proyectoNombre || task.proyecto?.nombre || 'General'}</span>
                            {task.idTareaPadre && (
                                <>
                                    <span>/</span>
                                    <span className="truncate max-w-[150px] flex items-center gap-1 text-blue-500">
                                        <AlignLeft size={10} /> Padre #{task.idTareaPadre}
                                    </span>
                                </>
                            )}
                            {mode === 'execution' && (
                                <span className="ml-2 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px]">EN EJECUCIÓN</span>
                            )}
                        </div>

                        <div className="flex gap-2 mb-2 items-center">
                            {isStrategic ? (
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 flex items-center gap-1 border border-purple-200 shadow-sm">
                                    <Lock size={10} /> Estratégico
                                </span>
                            ) : (
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 flex items-center gap-1">
                                    Operativo
                                </span>
                            )}

                            <span className={
                                'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ' +
                                (task.prioridad === 'Alta' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700')
                            }>
                                {task.prioridad}
                            </span>

                            {fullTask?.subtareas && fullTask.subtareas.length > 0 && (
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 flex items-center gap-1 border border-indigo-100">
                                    <Users size={10} /> {fullTask.subtareas.length} Subtareas
                                </span>
                            )}
                        </div>

                        <textarea
                            value={titulo}
                            onChange={(e) => setTitulo(e.target.value)}
                            readOnly={mode === 'execution'} // No editar título en ejecución rápida
                            onInput={(e) => {
                                e.currentTarget.style.height = 'auto';
                                e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                            }}
                            rows={titulo.length > 60 ? 2 : 1}
                            className={`font-bold text-xl text-slate-800 leading-snug bg-transparent border-b border-transparent ${mode !== 'execution' ? 'hover:border-slate-300 focus:border-blue-500' : ''} outline-none w-full transition-all py-1 -ml-1 pl-1 rounded resize-none overflow-hidden`}
                            placeholder="Nombre de la tarea"
                            style={{ height: 'auto' }}
                        />
                    </div>

                    <button onClick={onClose} className="p-2 bg-white border border-slate-200 rounded-full hover:bg-slate-100 shadow-sm transition-transform active:scale-95">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs Navigation */}
                <div className="flex px-6 border-b bg-slate-50/30 gap-6">
                    <button
                        onClick={() => setActiveTab('Info')}
                        className={`py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === 'Info' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        Información
                    </button>
                    <button
                        onClick={() => setActiveTab('Foco')}
                        className={`py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === 'Foco' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        Foco & Inteligencia
                    </button>
                    {mode === 'planning' && (
                        <button
                            onClick={() => setActiveTab('Historial')}
                            className={`py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === 'Historial' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                        >
                            Historial & Jerarquía
                        </button>
                    )}
                </div>

                <div className="p-4 md:p-6 overflow-y-auto space-y-6 bg-white flex-1">

                    {/* MAIN */}
                    {view === 'Main' && (
                        <>
                            {activeTab === 'Info' && (
                                <div className="space-y-6 animate-in slide-in-from-right-2 duration-200">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Fecha Inicio */}
                                        <div className={'space-y-1 p-3 rounded-lg border ' + (isLocked ? 'bg-slate-50 border-slate-200' : 'bg-white border-transparent')}>
                                            <label className="text-xs font-bold text-slate-400 uppercase flex items-center justify-between">
                                                <span className="flex items-center gap-1"><Calendar size={12} /> Fecha Inicio</span>
                                                {isLocked && <Lock size={10} className="text-slate-400" />}
                                            </label>

                                            <div className="flex gap-2 items-center">
                                                <input
                                                    type="date"
                                                    value={fechaInicioPlanificada}
                                                    onChange={(e) => setFechaInicioPlanificada(e.target.value)}
                                                    disabled={isLocked}
                                                    className={'w-full text-sm font-bold text-slate-700 outline-none py-1 bg-transparent ' + (isLocked ? 'cursor-not-allowed opacity-60' : 'border-b-2 border-slate-200 focus:border-blue-500')}
                                                />

                                                {isLocked && (
                                                    <button
                                                        onClick={() => { setRequestField('fechaInicioPlanificada'); setView('RequestChange'); }}
                                                        className="p-1.5 bg-purple-50 text-purple-600 rounded-lg text-xs hover:bg-purple-100"
                                                        title="Solicitar cambio de fecha"
                                                    >
                                                        <FileSignature size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Fecha Objetivo */}
                                        <div className={'space-y-1 p-3 rounded-lg border ' + (isLocked ? 'bg-slate-50 border-slate-200' : 'bg-white border-transparent')}>
                                            <label className="text-xs font-bold text-slate-400 uppercase flex items-center justify-between">
                                                <span className="flex items-center gap-1"><Calendar size={12} /> Fecha Objetivo</span>
                                                {isLocked && <Lock size={10} className="text-slate-400" />}
                                            </label>

                                            <div className="flex gap-2 items-center">
                                                <input
                                                    type="date"
                                                    value={fechaObjetivo}
                                                    onChange={(e) => setFechaObjetivo(e.target.value)}
                                                    disabled={isLocked}
                                                    className={'w-full text-sm font-bold text-slate-700 outline-none py-1 bg-transparent ' + (isLocked ? 'cursor-not-allowed opacity-60' : 'border-b-2 border-slate-200 focus:border-blue-500')}
                                                />

                                                {isLocked && (
                                                    <button
                                                        onClick={() => { setRequestField('fechaObjetivo'); setView('RequestChange'); }}
                                                        className="p-1.5 bg-purple-50 text-purple-600 rounded-lg text-xs hover:bg-purple-100"
                                                        title="Solicitar cambio de fecha"
                                                    >
                                                        <FileSignature size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1 p-3">
                                            <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><Users size={12} /> Creador</label>
                                            <div className="text-sm font-bold text-slate-700 py-1 flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-black">
                                                    {(task.creador?.nombre || 'Sys').substring(0, 2).toUpperCase()}
                                                </div>
                                                <span>{task.creador?.nombre || 'Sistema'}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1 p-3">
                                            <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><Users size={12} /> Responsable</label>
                                            <div className="text-sm font-bold text-slate-700 py-1 flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px]">
                                                    {(task.asignados?.find(a => a.tipo === 'Responsable')?.usuario?.nombre || 'Yo').substring(0, 2)}
                                                </div>
                                                <span>{task.asignados?.find(a => a.tipo === 'Responsable')?.usuario?.nombre || 'Yo (Asignado)'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><AlignLeft size={12} /> Descripción / Notas</label>
                                        <textarea
                                            value={descripcion}
                                            onChange={(e) => setDescripcion(e.target.value)}
                                            placeholder="Detalles, criterios de aceptación, notas..."
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none resize-none min-h-[120px]"
                                        />
                                    </div>

                                    {/* Subtareas (MOVIDO AQUÍ para Visibilidad en Ejecución) */}
                                    {fullTask?.subtareas && fullTask.subtareas.length > 0 && (
                                        <div className="py-2">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex justify-between items-center">
                                                <span>Checklist / Sub-entregables ({fullTask.subtareas.length})</span>
                                                <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">Solo Lectura</span>
                                            </div>
                                            <div className="space-y-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                {fullTask.subtareas.map(sub => (
                                                    <div key={sub.idTarea} className="flex items-center justify-between p-2 rounded hover:bg-white border text-sm transition-colors cursor-pointer" onClick={() => {
                                                        // Opcional: Navegar a la subtarea? Por ahora solo visual.
                                                    }}>
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            <div className={`w-3 h-3 rounded-full border ${sub.estado === 'Hecha' ? 'bg-emerald-500 border-emerald-500' : 'bg-transparent border-slate-300'}`}></div>
                                                            <span className={`truncate text-slate-700 ${sub.estado === 'Hecha' ? 'line-through opacity-60' : ''}`}>{sub.titulo}</span>
                                                        </div>
                                                        <span className={`text-[9px] font-bold px-1.5 py-px rounded-full ${sub.estado === 'Hecha' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{sub.estado}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Requiere Evidencia Toggle */}
                                    {mode === 'planning' && (
                                        <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                            <input
                                                type="checkbox"
                                                id="reqEvidence"
                                                checked={(task as any).requiereEvidencia || false}
                                                onChange={(e) => {
                                                    setRequiereEvidencia(e.target.checked);
                                                    // Visual feedback only until save
                                                }}
                                                className="w-4 h-4 text-blue-600 rounded bg-white border-slate-300 focus:ring-blue-500"
                                            />
                                            <label htmlFor="reqEvidence" className="text-sm font-medium text-slate-700 select-none cursor-pointer">
                                                Esta tarea requiere evidencia obligatoria para completarse
                                            </label>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><Link size={12} /> Link Evidencia (SharePoint / Drive)</label>
                                        <input
                                            type="text"
                                            value={linkEvidencia}
                                            onChange={(e) => setLinkEvidencia(e.target.value)}
                                            placeholder="https://..."
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none"
                                        />
                                        {linkEvidencia && (
                                            <a href={linkEvidencia} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline pl-2 block">
                                                Abrir enlace 🔗
                                            </a>
                                        )}
                                    </div>

                                    <div className="space-y-3 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                        <div className="flex justify-between items-center">
                                            <label className="font-bold text-slate-700 text-sm">Avance Actual</label>
                                            <span className={'text-lg font-bold ' + (progreso === 100 ? 'text-emerald-600' : 'text-blue-600')}>{progreso}%</span>
                                        </div>

                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            step="5"
                                            value={progreso}
                                            onChange={(e) => setProgreso(Number(e.target.value))}
                                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><MessageSquare size={12} /> Agregar Comentario / Bitácora</label>
                                        <textarea
                                            value={comentario}
                                            onChange={(e) => setComentario(e.target.value)}
                                            placeholder="Escribe aquí tus observaciones, dudas o avances..."
                                            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none resize-none h-24 shadow-sm"
                                        />
                                    </div>

                                    <button
                                        onClick={handleSaveProgress}
                                        disabled={submitting}
                                        className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-900/20 hover:bg-black active:scale-[0.98] transition-all flex justify-center items-center gap-2"
                                    >
                                        <Save size={18} /> Guardar Cambios
                                    </button>
                                </div>
                            )}

                            {activeTab === 'Foco' && (
                                <div className="animate-in slide-in-from-right-2 duration-200">
                                    <TaskABCSection task={task} onUpdate={onUpdate} />
                                </div>
                            )}

                            {activeTab === 'Historial' && (
                                <div className="space-y-8 animate-in slide-in-from-right-2 duration-200">
                                    {/* Section: Jerarquía */}
                                    <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                <AlignLeft size={14} className="text-blue-500" /> Estructura de Trabajo
                                            </h4>
                                            {mode === 'planning' && (
                                                <button
                                                    onClick={handleAddSubtask}
                                                    className="text-[10px] font-bold bg-blue-600 text-white px-2 py-1 rounded-lg hover:bg-blue-700 flex items-center gap-1 shadow-sm transition-all"
                                                >
                                                    <span className="text-sm">+</span> Subtarea
                                                </button>
                                            )}
                                        </div>

                                        {/* Selector de Padre (Solo en modo Planning) */}
                                        {mode === 'planning' ? (
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase">Vincular a Tarea Padre</label>
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                                    <input
                                                        type="text"
                                                        placeholder="Escribe para buscar tarea..."
                                                        value={searchParentTerm}
                                                        onChange={(e) => setSearchParentTerm(e.target.value)}
                                                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                                                    />
                                                    {isSearchingParent && (
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                            <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Resultados de búsqueda */}
                                                {parentResults.length > 0 && (
                                                    <div className="bg-white border border-slate-200 rounded-lg mt-1 shadow-xl overflow-hidden divide-y divide-slate-50">
                                                        {parentResults.map(p => (
                                                            <button
                                                                key={p.idTarea}
                                                                onClick={() => {
                                                                    setIdTareaPadre(p.idTarea);
                                                                    setSearchParentTerm('');
                                                                    setParentResults([]);
                                                                }}
                                                                className="w-full p-2 text-left hover:bg-blue-50 text-xs transition-colors group"
                                                            >
                                                                <div className="font-bold text-slate-700 group-hover:text-blue-700">#{p.idTarea} - {p.titulo}</div>
                                                                <div className="text-[10px] text-slate-400">{p.proyectoNombre} • {p.estado}</div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                                {idTareaPadre && (
                                                    <div className="flex items-center justify-between p-2 bg-blue-50 border border-blue-100 rounded-lg">
                                                        <div className="text-xs">
                                                            <span className="font-bold text-blue-700 uppercase text-[9px] block">VINCULADA A:</span>
                                                            <span className="text-slate-600 font-medium">#{idTareaPadre}</span>
                                                        </div>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setIdTareaPadre(undefined); }}
                                                            className="text-slate-400 hover:text-rose-500 p-1 transition-colors"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            /* Vista reducida en Execution Mode */
                                            idTareaPadre ? (
                                                <div className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between shadow-sm">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><AlignLeft size={14} /></div>
                                                        <div>
                                                            <div className="text-[10px] font-bold text-slate-400 uppercase">Tarea Padre</div>
                                                            <div className="text-xs font-bold text-slate-700 truncate max-w-[180px]">Asociada al Nivel Superior</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full ring-1 ring-blue-100">#{idTareaPadre}</div>
                                                </div>
                                            ) : (
                                                <div className="text-[10px] text-slate-400 italic bg-white p-3 rounded-lg border border-slate-100 text-center">Esta tarea no tiene dependencias jerárquicas.</div>
                                            )
                                        )}

                                        {/* AUDIT LOG (ENRIQUECIDO) - Solo en modo Planning */}
                                        {mode === 'planning' && (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                        <History size={14} className="text-slate-400" /> Historial de Cambios
                                                    </h4>
                                                    <div className="text-[10px] text-slate-400">
                                                        Creada: {task.fechaCreacion ? new Date(task.fechaCreacion).toLocaleDateString() : 'N/A'}
                                                    </div>
                                                </div>

                                                <div className="space-y-6 pl-4 border-l-2 border-slate-100 ml-2 py-2">
                                                    {/* Item de Creación siempre presente */}
                                                    <div className="relative pl-6">
                                                        <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white shadow-sm" />
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full">CREACIÓN</span>
                                                            <span className="text-slate-400 font-mono text-[10px]">{task.fechaCreacion ? new Date(task.fechaCreacion).toLocaleString() : 'N/A'}</span>
                                                        </div>
                                                        <p className="text-xs text-slate-700 font-medium">Tarea registrada en el sistema por <span className="text-black font-bold">{task.creador?.nombre || 'Iniciador'}</span></p>
                                                    </div>

                                                    {auditLogs.length === 0 ? (
                                                        <div className="text-xs text-slate-400 italic pl-6">No hay modificaciones posteriores.</div>
                                                    ) : (
                                                        auditLogs.map((log: any) => (
                                                            <div key={log.idAuditLog} className="relative pl-6 group">
                                                                <div className={getDotClass(log)} />

                                                                <div className="flex justify-between items-start mb-1">
                                                                    <span className="text-slate-400 font-mono text-[9px]">{log.fecha ? new Date(log.fecha).toLocaleString() : ''}</span>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-full ring-1 ring-slate-200">
                                                                            {log.usuario?.nombre?.split(' ')[0] || 'Sys'}
                                                                        </span>
                                                                        <span className="text-[9px] font-black uppercase tracking-tighter text-blue-500 text-xs">Update</span>
                                                                    </div>
                                                                </div>

                                                                <div className="text-xs font-bold text-slate-800">{getTituloLog(log)}</div>

                                                                {/* Diff o Detalle rico */}
                                                                {getExtraLog(log)}
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Actions Footer (Solo en tab Info para no ensuciar) */}
                            {activeTab === 'Info' && (
                                <div className="flex justify-between items-center pt-6 gap-3 border-t border-slate-50">
                                    <button
                                        onClick={() => setView('Block')}
                                        className="flex-1 py-2.5 px-4 bg-rose-50 text-rose-700 rounded-xl font-bold text-xs hover:bg-rose-100 flex items-center justify-center gap-2 transition-colors border border-rose-100"
                                    >
                                        <AlertTriangle size={14} /> Reportar Bloqueo
                                    </button>

                                    <button
                                        onClick={() => setView('Reassign')}
                                        className="flex-1 py-2.5 px-4 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-200 flex items-center justify-center gap-2 transition-colors border border-slate-200"
                                    >
                                        <UserPlus size={14} /> Reasignar Tarea
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    {/* REQUEST CHANGE */}
                    {view === 'RequestChange' && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                                <h4 className="font-bold text-purple-800 flex items-center gap-2 mb-2"><FileSignature size={18} /> Solicitud de Cambio Estratégico</h4>
                                <p className="text-xs text-purple-600 mb-4">
                                    Este proyecto es estratégico y requiere aprobación para modificar fechas. Tu solicitud será enviada al líder del proyecto.
                                </p>

                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs font-bold text-purple-400 uppercase">Nueva Fecha Propuesta</label>
                                        <input
                                            type="date"
                                            value={requestValue}
                                            onChange={(e) => setRequestValue(e.target.value)}
                                            className="w-full p-2 bg-white border border-purple-200 rounded-lg text-sm outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-purple-400 uppercase">Justificación (Obligatoria)</label>
                                        <textarea
                                            value={requestReason}
                                            onChange={(e) => setRequestReason(e.target.value)}
                                            placeholder="Explica por qué necesitas mover la fecha..."
                                            className="w-full p-2 bg-white border border-purple-200 rounded-lg text-sm outline-none h-20 resize-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => setView('Main')} className="flex-1 py-3 text-slate-500 font-bold bg-slate-100 rounded-xl">Cancelar</button>
                                <button
                                    onClick={handleSubmitChangeRequest}
                                    disabled={submitting}
                                    className="flex-1 py-3 bg-purple-600 text-white font-bold rounded-xl shadow-lg shadow-purple-200 disabled:opacity-60"
                                >
                                    Enviar Solicitud
                                </button>
                            </div>
                        </div>
                    )}

                    {/* BLOCK */}
                    {view === 'Block' && (
                        <div className="space-y-4 animate-fade-in">
                            <h4 className="font-bold text-rose-700 flex items-center gap-2"><AlertTriangle size={20} /> Reportar Impedimento</h4>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500">¿Qué te bloquea?</label>
                                <textarea
                                    value={blockerReason}
                                    onChange={(e) => setBlockerReason(e.target.value)}
                                    placeholder="Ej: No tengo accesos a la VPN..."
                                    className="w-full p-3 border border-rose-200 bg-rose-50 rounded-xl focus:border-rose-400 outline-none text-sm h-24 resize-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 underline decoration-slate-200">¿Quién es el responsable? (Opcional)</label>

                                <select
                                    className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm bg-white"
                                    value={blockerUserId || ''}
                                    onChange={(e) => {
                                        const uid = Number(e.target.value);
                                        setBlockerUserId(uid || null);
                                        const user = team.find(u => u.idUsuario === uid);
                                        if (user) setBlockerWho(user.nombre);
                                    }}
                                >
                                    <option value="">Selecciona responsable...</option>
                                    {team.map(u => (
                                        <option key={u.idUsuario} value={u.idUsuario}>
                                            {u.nombre} ({u.rol?.nombre || 'Colaborador'})
                                        </option>
                                    ))}
                                </select>

                                <input
                                    type="text"
                                    value={blockerWho}
                                    onChange={(e) => setBlockerWho(e.target.value)}
                                    placeholder="Nombre o área (ej: DevOps, Pedro...)"
                                    className="w-full p-2 border-b border-slate-100 outline-none text-xs text-slate-400"
                                />
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button onClick={() => setView('Main')} className="flex-1 py-3 text-slate-500 font-bold bg-slate-100 rounded-xl">Cancelar</button>
                                <button
                                    onClick={handleCreateBlocker}
                                    disabled={submitting}
                                    className="flex-1 py-3 bg-rose-600 text-white font-bold rounded-xl shadow-lg shadow-rose-200 disabled:opacity-60"
                                >
                                    🚨 Reportar
                                </button>
                            </div>
                        </div>
                    )}

                    {/* REASSIGN */}
                    {view === 'Reassign' && (
                        <div className="space-y-4 animate-fade-in">
                            <h4 className="font-bold text-slate-700">Gestionar Tarea</h4>

                            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex flex-col gap-3">
                                <p className="text-xs text-blue-700 font-bold flex items-center gap-1 uppercase tracking-wider">
                                    <Users size={14} /> Reasignar para Revisión / Acción
                                </p>

                                <div className="space-y-2">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="text"
                                            placeholder="Buscar empleado..."
                                            className="w-full pl-9 pr-4 py-2 bg-white border border-blue-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                            value={searchReassign}
                                            onChange={(e) => setSearchReassign(e.target.value)}
                                        />
                                    </div>

                                    <div className="max-h-40 overflow-y-auto border border-blue-100 rounded-lg bg-white">
                                        {team
                                            .filter(u => u.idUsuario !== task.asignados?.find(a => a.tipo === 'Responsable')?.idUsuario)
                                            .filter(u => (u.nombre || '').toLowerCase().includes(searchReassign.toLowerCase()))
                                            .map(u => (
                                                <div
                                                    key={u.idUsuario}
                                                    onClick={() => setReassignUserId(u.idUsuario)}
                                                    className={'p-2 text-sm cursor-pointer hover:bg-blue-50 flex justify-between items-center ' + (reassignUserId === u.idUsuario ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600')}
                                                >
                                                    <span>{u.nombre}</span>
                                                    {reassignUserId === u.idUsuario && <CheckCircle size={14} className="text-blue-500" />}
                                                </div>
                                            ))}

                                        {team.length === 0 && <div className="p-2 text-xs text-slate-400">Cargando lista...</div>}
                                    </div>
                                </div>

                                <button
                                    onClick={handleReassign}
                                    disabled={!reassignUserId || submitting}
                                    className="w-full py-2 bg-blue-600 text-white rounded-lg font-bold text-xs shadow-md shadow-blue-200 hover:bg-blue-700 disabled:opacity-50"
                                >
                                    Confirmar Reasignación
                                </button>
                            </div>

                            <div className="space-y-2">
                                <button onClick={() => handleAction('Posponer')} className="w-full p-3 bg-amber-50 text-amber-800 rounded-xl flex items-center gap-3 hover:bg-amber-100 text-left border border-amber-100">
                                    <div className="p-2 bg-white rounded-full text-amber-600"><Clock size={16} /></div>
                                    <div className="text-sm font-bold">Posponer (Enviar al Backlog)</div>
                                </button>

                                <button onClick={() => handleAction('HechaPorOtro')} className="w-full p-3 bg-emerald-50 text-emerald-800 rounded-xl flex items-center gap-3 hover:bg-emerald-100 text-left border border-emerald-100">
                                    <div className="p-2 bg-white rounded-full text-emerald-600"><CheckCircle size={16} /></div>
                                    <div className="text-sm font-bold">Ya la hizo alguien más</div>
                                </button>

                                <button onClick={() => handleAction('NoAplica')} className="w-full p-3 bg-slate-100 text-slate-700 rounded-xl flex items-center gap-3 hover:bg-slate-200 text-left border border-slate-200">
                                    <div className="p-2 bg-white rounded-full text-slate-500"><Ban size={16} /></div>
                                    <div className="text-sm font-bold">Descartar / Cancelar</div>
                                </button>
                            </div>

                            <button onClick={() => setView('Main')} className="w-full py-2 text-sm text-slate-400 font-bold">Volver</button>
                        </div>
                    )}

                </div>
            </div>

            <SolicitudCambioModal
                isOpen={showChangeModal}
                onClose={() => { setShowChangeModal(false); setPendingChanges(null); }}
                onConfirm={handleConfirmChange}
                campo={pendingChanges?.fechaObjetivo ? 'Fecha Objetivo' : 'Fecha Inicio'}
                valorAnterior={task.fechaObjetivo ? task.fechaObjetivo.split('T')[0] : 'N/A'}
                valorNuevo={pendingChanges?.fechaObjetivo || pendingChanges?.fechaInicioPlanificada || ''}
            />
        </div >,
        document.body
    );
};
