// Last Modified: 2026-01-24 20:38:55
import React from 'react';
import { AgendaSemanal } from '../components/AgendaSemanal';

export const CalendarView: React.FC = () => {
    return (
        <div className="h-full flex flex-col animate-fade-in overflow-auto">
            <AgendaSemanal />
        </div>
    );
};
