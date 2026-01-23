/**
 * ¿QUÉ ES?: Este archivo define un Contexto de React para la página "Mi Día".
 * ¿PARA QUÉ SE USA?: Se usa para compartir el estado de las tareas, bloqueos y check-ins del día actual
 * entre todos los componentes hijos sin necesidad de pasar "props" manualmente.
 * ¿QUÉ SE ESPERA?: Proporcionar una forma centralizada de acceder a la información de las tareas sugeridas,
 * pendientes y en ejecución del usuario logueado.
 */

import React, { createContext, useContext, useMemo } from 'react';
import { useMiDia } from '../../../hooks/useMiDia';
import type { Checkin, Tarea, Bloqueo } from '../../../types/modelos';

/**
 * Define la estructura de los datos que estarán disponibles en el contexto.
 */
interface MiDiaContextType {
    loading: boolean;
    checkin: Checkin | null | undefined;
    arrastrados: Tarea[] | undefined;
    bloqueos: Bloqueo[] | undefined;
    bloqueosMeCulpan: Bloqueo[] | undefined;
    disponibles: Tarea[] | undefined;
    backlog: Tarea[] | undefined;
    allDisponibles: Tarea[];
    fetchMiDia: () => Promise<void>;
    userId: number;
    today: string;
    setToday: (date: string) => void;
}

/**
 * ¿QUÉ ES?: El objeto de Contexto creado por React.
 * ¿PARA QUÉ SE USA?: Es el almacén de datos global para este módulo de "Hoy".
 */
export const MiDiaContext = createContext<MiDiaContextType | undefined>(undefined);

/**
 * ¿QUÉ ES?: El Proveedor del Contexto (Provider).
 * ¿PARA QUÉ SE USA?: Envuelve a los componentes para que estos puedan "escuchar" u obtener los datos de "Mi Día".
 * ¿QUÉ SE ESPERA?: Que gestione la carga de datos (fetchMiDia) y combine las tareas disponibles con el backlog.
 */
export const MiDiaProvider: React.FC<{ children: React.ReactNode, userId: number }> = ({ children, userId }) => {
    const [today, setToday] = React.useState(new Date().toISOString().split('T')[0]);
    const { loading, checkin, arrastrados, bloqueos, bloqueosMeCulpan, disponibles, backlog, fetchMiDia } = useMiDia(today);

    // Lógica derivada centralizada aquí
    const allDisponibles = useMemo(() => {
        // Combinar tareas sugeridas + backlog para permitir trabajar en cualquier pendiente
        const base = [...(disponibles || []), ...(backlog || [])];

        // Eliminar duplicados (por idTarea)
        const unique = Array.from(new Map(base.map(t => [Number(t.idTarea), t])).values());

        // Combinar con 'arrastrados' (si hay alguno)
        const real = [...(arrastrados || []), ...unique.filter(u => !(arrastrados || []).some(a => Number(a.idTarea) === Number(u.idTarea)))];

        // Ordenar por el campo 'orden'
        real.sort((a, b) => (a.orden || 0) - (b.orden || 0));

        return real;
    }, [arrastrados, disponibles, backlog, loading]);

    const value = {
        loading,
        checkin,
        arrastrados,
        bloqueos,
        bloqueosMeCulpan,
        disponibles,
        backlog,
        allDisponibles,
        fetchMiDia,
        userId,
        today,
        setToday
    };

    return <MiDiaContext.Provider value={value}>{children}</MiDiaContext.Provider>;
};

/**
 * ¿QUÉ ES?: Un Hook personalizado para usar este contexto.
 * ¿PARA QUÉ SE USA?: Para acceder fácilmente a los datos en cualquier componente hijo.
 * ¿QUÉ SE ESPERA?: Que devuelva los datos del contexto o lance un error si se usa fuera del MiDiaProvider.
 */
export const useMiDiaContext = () => {
    const context = useContext(MiDiaContext);
    if (!context) throw new Error('useMiDiaContext must be used within a MiDiaProvider');
    return context;
};

