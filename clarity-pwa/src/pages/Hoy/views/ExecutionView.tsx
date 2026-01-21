import React, { useState } from 'react';
import { useMiDiaContext } from '../context/MiDiaContext';
import { ActivePlanView } from '../components/ActivePlanView';
import { CheckinForm } from '../components/CheckinForm';
import { clarityService } from '../../../services/clarity.service';
import { useToast } from '../../../context/ToastContext';
import type { CheckinUpsertDto } from '../../../types/modelos';

export const ExecutionView: React.FC = () => {
    const { loading, checkin, bloqueos, bloqueosMeCulpan, allDisponibles, fetchMiDia, userId, today } = useMiDiaContext();
    const { showToast } = useToast();
    const [isEditing, setIsEditing] = useState(false);

    const handleSubmitCheckin = async (dto: CheckinUpsertDto) => {
        try {
            await clarityService.postCheckin(dto);
            showToast('Check-in guardado exitosamente', 'success');
            setIsEditing(false);
            await fetchMiDia();
        } catch (err) {
            showToast('Error al guardar check-in', 'error');
        }
    };

    const getInitialData = (): CheckinUpsertDto | undefined => {
        if (!checkin) return undefined;
        return {
            idUsuario: userId,
            fecha: today,
            entregableTexto: checkin.entregableTexto,
            estadoAnimo: checkin.estadoAnimo as any,
            entrego: checkin.tareas?.filter(t => t.tipo === 'Entrego').map(t => t.idTarea) || [],
            avanzo: checkin.tareas?.filter(t => t.tipo === 'Avanzo').map(t => t.idTarea) || [],
            extras: checkin.tareas?.filter(t => t.tipo === 'Extra').map(t => t.idTarea) || [],
        };
    };

    if (loading) return <div className="p-8 text-center text-slate-400">Cargando datos...</div>;

    return (
        <div className="w-full space-y-6 animate-fade-in">
            {checkin && !isEditing ? (
                <>
                    <ActivePlanView
                        checkin={checkin}
                        onEdit={() => setIsEditing(true)}
                        onUpdate={fetchMiDia}
                    />
                </>
            ) : (
                <div className="space-y-6 max-w-7xl mx-auto">
                    {isEditing && (
                        <div className="flex justify-end">
                            <button onClick={() => setIsEditing(false)} className="text-sm text-slate-500 underline">
                                Cancelar Edición
                            </button>
                        </div>
                    )}

                    {bloqueosMeCulpan && bloqueosMeCulpan.length > 0 && (
                        <div className="bg-red-500 text-white px-4 py-2 rounded-lg flex items-center justify-between shadow-md mx-auto max-w-full animate-pulse">
                            <div className="flex items-center gap-2 text-sm font-bold">
                                <span>🛑 ¡ALERTA! Estás bloqueando el trabajo de {bloqueosMeCulpan.length} compañero(s).</span>
                            </div>
                        </div>
                    )}

                    <CheckinForm
                        disponibles={allDisponibles}
                        checkinTasks={checkin?.tareas?.map(t => t.tarea!) || []}
                        onSubmit={handleSubmitCheckin}
                        userId={userId}
                        fecha={today}
                        initialData={getInitialData()}
                        onTaskCreated={fetchMiDia}
                        bloqueos={bloqueos}
                        onMoodChange={() => { }}
                    />
                </div>
            )}
        </div>
    );
};
