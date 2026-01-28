// Last Modified: 2026-01-24 20:38:55
import React, { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { miDiaKeys } from '../../../hooks/query/useMiDiaQuery';

import { useMiDiaContext } from '../context/MiDiaContext';
import { BloqueosWidget } from '../components/BloqueosWidget';

export const BlockersView: React.FC = () => {
    const { userId } = useMiDiaContext();
    const queryClient = useQueryClient();

    const handleUpdate = useCallback(() => {
        // ✅ Reemplaza fetchMiDia()
        queryClient.invalidateQueries({ queryKey: miDiaKeys.usuario(userId) });

        // Si bloqueos tiene su propia query independiente:
        // queryClient.invalidateQueries({ queryKey: ['bloqueos', userId] });
    }, [queryClient]);

    return (
        <div className="h-full animate-fade-in overflow-auto">
            <BloqueosWidget userId={userId} onUpdate={handleUpdate} />
        </div>
    );
};
