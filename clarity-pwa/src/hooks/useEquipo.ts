import { useState, useEffect, useCallback } from 'react';
import { clarityService } from '../services/clarity.service';
import type { Usuario, Checkin } from '../types/modelos';

export interface EquipoMemberStatus {
    usuario: Usuario;
    checkin: Checkin | null;
    bloqueosActivos: number;
    tareasVencidas: number;
    tareasHoy: number;       // NUEVO: Tareas que vencen hoy
    tareasEnCurso: number;   // NUEVO: Tareas en progreso
    estado: 'Pending' | 'AlDia' | 'ConBloqueos';
}

export const useEquipo = (fecha: string) => {
    const [loading, setLoading] = useState(true);
    const [miembros, setMiembros] = useState<EquipoMemberStatus[]>([]);
    const [mood, setMood] = useState<{ feliz: number, neutral: number, triste: number, promedio: number } | null>(null);

    const fetchEquipoHoy = useCallback(async () => {
        try {
            setLoading(true);
            const data: any = await clarityService.getEquipoHoy(fecha);

            if (data && (data.miembros?.length > 0 || (Array.isArray(data) && data.length > 0))) {
                if (data.miembros) {
                    setMiembros(data.miembros);
                    setMood(data.resumenAnimo);
                } else {
                    setMiembros(data); // Legacy structure fallback
                }
            } else {
                setMiembros([]);
                setMood(null);
            }
        } catch (error) {
            console.error("API Error fetching team data", error);
            setMiembros([]);
            setMood(null);
        } finally {
            setLoading(false);
        }
    }, [fecha]);

    useEffect(() => {
        fetchEquipoHoy();
    }, [fetchEquipoHoy]);

    return {
        loading,
        miembros,
        mood,
        fetchEquipoHoy
    };
};
