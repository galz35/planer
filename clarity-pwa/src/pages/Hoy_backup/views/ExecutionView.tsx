import React, { useCallback, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../../context/AuthContext';
import { useMiDiaContext } from '../context/MiDiaContext';
import { ActivePlanView } from '../components/ActivePlanView';
import { CheckinForm } from '../components/CheckinForm';
import { clarityService } from '../../../services/clarity.service';
import { useToast } from '../../../context/ToastContext';
import type { CheckinUpsertDto, CheckinTarea } from '../../../types/modelos';

export const ExecutionView: React.FC = () => {
    const {
        loading,
        checkin,
        bloqueos,
        bloqueosMeCulpan,
        allDisponibles,
        userId,
        today,
        toggleTarea,
        isMutating,
        mutatingTaskId,
    } = useMiDiaContext();

    const { showToast } = useToast();
    const [isEditing, setIsEditing] = useState(false);

    const queryClient = useQueryClient();

    // ✅ Prepara initialData solo cuando cambian checkin/userId/today
    const initialData = useMemo<CheckinUpsertDto | undefined>(() => {
        if (!checkin) return undefined;

        const tareas = checkin.tareas || [];

        return {
            idUsuario: userId,
            fecha: today,
            entregableTexto: checkin.entregableTexto || '',
            // TODO: tipar correctamente estadoAnimo (evitar any)
            estadoAnimo: (checkin.estadoAnimo as any) ?? null,

            entrego: tareas.filter((t: CheckinTarea) => t.tipo === 'Entrego').map((t: CheckinTarea) => t.idTarea),
            avanzo: tareas.filter((t: CheckinTarea) => t.tipo === 'Avanzo').map((t: CheckinTarea) => t.idTarea),
            extras: tareas.filter((t: CheckinTarea) => t.tipo === 'Extra').map((t: CheckinTarea) => t.idTarea),
        };
    }, [checkin, userId, today]);

    // ✅ Mutation para guardar checkin (evita doble submit + controla estados)
    const guardarCheckin = useMutation({
        mutationFn: (dto: CheckinUpsertDto) => clarityService.postCheckin(dto),

        onSuccess: async () => {
            showToast('Check-in guardado exitosamente', 'success');
            setIsEditing(false);

            // 🔥 Refresco inmediato (equivale a “F5” solo para Mi Día)
            await queryClient.invalidateQueries({ queryKey: ['mi-dia'] });
        },

        onError: () => {
            showToast('Error al guardar check-in', 'error');
        },
    });

    const onEdit = useCallback(() => setIsEditing(true), []);
    const onCancelEdit = useCallback(() => setIsEditing(false), []);

    const handleSubmitCheckin = useCallback(
        async (dto: CheckinUpsertDto) => {
            if (guardarCheckin.isPending) return; // ✅ evita doble submit
            guardarCheckin.mutate(dto);
        },
        [guardarCheckin]
    );

    const { user } = useAuth(); // Import useAuth from context

    // ✅ Evita render de “cargando” con layout distinto
    if (loading) {
        return <div className="p-8 text-center text-slate-400">Cargando datos...</div>;
    }

    const hayAlertas = (bloqueosMeCulpan?.length || 0) > 0;

    return (
        <div className="w-full space-y-6 animate-fade-in">
            {checkin && !isEditing ? (
                <ActivePlanView
                    checkin={checkin}
                    onEdit={onEdit}
                    toggleTarea={toggleTarea}
                    isMutating={isMutating}
                    mutatingTaskId={mutatingTaskId}
                />
            ) : (
                <div className="space-y-6 max-w-7xl mx-auto">
                    {isEditing && (
                        <div className="flex justify-end">
                            <button
                                onClick={onCancelEdit}
                                className="text-sm text-slate-500 underline"
                                type="button"
                            >
                                Cancelar Edición
                            </button>
                        </div>
                    )}

                    {hayAlertas && (
                        <div className="bg-red-500 text-white px-4 py-2 rounded-lg flex items-center justify-between shadow-md mx-auto max-w-full animate-pulse">
                            <div className="flex items-center gap-2 text-sm font-bold">
                                <span>
                                    🛑 ¡ALERTA! Estás bloqueando el trabajo de {bloqueosMeCulpan.length} compañero(s).
                                </span>
                            </div>
                        </div>
                    )}

                    <CheckinForm
                        disponibles={allDisponibles}
                        checkinTasks={checkin?.tareas?.map((t: CheckinTarea) => t.tarea!).filter(Boolean) || []}
                        onSubmit={handleSubmitCheckin}
                        onTaskCreated={async () => {
                            await queryClient.invalidateQueries({ queryKey: ['mi-dia'] });
                        }}
                        userId={userId}
                        userCarnet={user?.carnet} // Prop nueva
                        fecha={today}
                        initialData={initialData}
                        bloqueos={bloqueos}
                    />
                </div>
            )}
        </div>
    );
};
