
import { api } from './api';

export const softwareService = {
    getDashboardStats: async (month?: number, year?: number) => {
        const params = new URLSearchParams();
        if (month) params.append('month', month.toString());
        if (year) params.append('year', year.toString());

        const { data } = await api.get(`/software/dashboard-stats?${params.toString()}`);
        return data;
    }
};
