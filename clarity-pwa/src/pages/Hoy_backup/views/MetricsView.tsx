import React from 'react';
import { useMiDiaContext } from '../context/MiDiaContext';
import { MetricasWidget } from '../components/MetricasWidget';

export const MetricsView: React.FC = () => {
    const { userId } = useMiDiaContext();
    return (
        <div className="h-full animate-fade-in overflow-auto">
            <MetricasWidget userId={userId} />
        </div>
    );
};
