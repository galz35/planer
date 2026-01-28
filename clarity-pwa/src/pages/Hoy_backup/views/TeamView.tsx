import React from 'react';
import { useMiDiaContext } from '../context/MiDiaContext';
import { EquipoWidget } from '../components/EquipoWidget';

export const TeamView: React.FC = () => {
    const { userId } = useMiDiaContext();
    return (
        <div className="h-full animate-fade-in overflow-auto">
            <EquipoWidget userId={userId} />
        </div>
    );
};
