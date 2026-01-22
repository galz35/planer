import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ejecutarQuery } from '../db/base.repo';

@ApiTags('Organizacion')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('organizacion')
export class OrganizacionController {

    @Get('catalogo')
    @ApiOperation({ summary: 'Obtener catálogo de estructura organizacional (Gerencias, etc)' })
    async getCatalogo() {
        // Usar columnas finales directamente (ogerencia, subgerencia, area)
        // NO mapear desde *_nivel - las columnas ya existen listas
        const result = await ejecutarQuery(`
            SELECT DISTINCT 
                LTRIM(RTRIM(ogerencia)) AS ogerencia,
                LTRIM(RTRIM(subgerencia)) AS subgerencia,
                LTRIM(RTRIM(area)) AS area
            FROM p_Usuarios
            WHERE activo = 1
              AND ogerencia IS NOT NULL AND LTRIM(RTRIM(ogerencia)) <> ''
              AND subgerencia IS NOT NULL AND LTRIM(RTRIM(subgerencia)) <> ''
              AND area IS NOT NULL AND LTRIM(RTRIM(area)) <> ''
            ORDER BY 1, 2, 3
        `);

        return result.map((row, index) => ({
            id: index + 1,
            ogerencia: row.ogerencia,
            subgerencia: row.subgerencia,
            area: row.area
        }));
    }

    @Get('estructura-usuarios')
    @ApiOperation({ summary: 'Obtener estructura plana de usuarios' })
    async getEstructuraUsuarios() {
        // Usar columnas finales directamente 
        const result = await ejecutarQuery(`
            SELECT
                LTRIM(RTRIM(ISNULL(ogerencia, '')))      AS gerencia,
                LTRIM(RTRIM(ISNULL(subgerencia, '')))    AS subgerencia,
                LTRIM(RTRIM(ISNULL(primer_nivel, '')))   AS area
            FROM dbo.p_Usuarios
            WHERE activo = 1
            GROUP BY
                LTRIM(RTRIM(ISNULL(ogerencia, ''))),
                LTRIM(RTRIM(ISNULL(subgerencia, ''))),
                LTRIM(RTRIM(ISNULL(primer_nivel, '')))
            ORDER BY 1,2,3;
        `);

        return result;
    }
}
