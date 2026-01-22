import { Injectable } from '@nestjs/common';
import { VisibilidadService } from '../acceso/visibilidad.service';
import { ejecutarQuery, Int, NVarChar } from '../db/base.repo';

// NOTA: ReportsService migrado parcialmente a SQL Server
// Funciones complejas con CTE RECURSIVE deshabilitadas temporalmente

@Injectable()
export class ReportsService {
    constructor(private visibilidadService: VisibilidadService) { }

    async getReporteProductividad(idLider: number, filter?: any) {
        // TODO: Migrar usando ejecutarQuery con sintaxis MSSQL
        return { message: 'Reporte en proceso de migración a SQL Server', data: [] };
    }

    async getReporteBloqueosTrend(idLider: number, filter?: any) {
        return { message: 'Reporte en proceso de migración a SQL Server', data: [] };
    }

    async getReporteEquipoPerformance(idLider: number, filter?: any) {
        return { message: 'Reporte en proceso de migración a SQL Server', data: [] };
    }

    async equipoBloqueos(idUsuario: number, fecha: string) {
        // Consulta simple migrable
        const result = await ejecutarQuery(`
            SELECT TOP 50 b.*, 
                   u1.nombre as origenNombre,
                   u2.nombre as destinoNombre,
                   t.nombre as tareaNombre
            FROM p_Bloqueos b
            LEFT JOIN p_Usuarios u1 ON b.idOrigenUsuario = u1.idUsuario
            LEFT JOIN p_Usuarios u2 ON b.idDestinoUsuario = u2.idUsuario
            LEFT JOIN p_Tareas t ON b.idTarea = t.idTarea
            ORDER BY b.creadoEn DESC
        `);
        return result;
    }

    async getWorkload(idLider: number) {
        return { users: [], tasks: [], message: 'Migración pendiente' };
    }

    async gerenciaResumen(idUsuario: number, fecha: string) {
        return { message: 'Reporte en proceso de migración' };
    }

    async exportToExcel(data: any[], sheetName: string): Promise<Buffer> {
        const XLSX = require('xlsx');
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    }
}
