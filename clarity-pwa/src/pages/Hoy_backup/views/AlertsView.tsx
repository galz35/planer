// Last Modified: 2026-01-24 20:38:55
import React, { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { miDiaKeys } from '../../../hooks/query/useMiDiaQuery';

import { useMiDiaContext } from '../context/MiDiaContext';
import { AlertasWidget } from '../components/AlertasWidget';

export const AlertsView: React.FC = () => {
    const { userId } = useMiDiaContext();
    const queryClient = useQueryClient();

    const handleUpdate = useCallback(() => {
        // ✅ reemplaza fetchMiDia()
        queryClient.invalidateQueries({ queryKey: miDiaKeys.usuario(userId) });

        // Si AlertasWidget usa su propia query:
        // queryClient.invalidateQueries({ queryKey: ['alertas', userId] });
    }, [queryClient]);

    return (
        <div className="h-full animate-fade-in overflow-auto">
            <AlertasWidget userId={userId} onUpdate={handleUpdate} />
        </div>
    );
};
