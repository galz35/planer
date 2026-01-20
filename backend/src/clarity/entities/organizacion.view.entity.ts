import { ViewEntity, ViewColumn } from 'typeorm';

@ViewEntity({
    name: 'v_organizacion_jerarquia',
    expression: `
        SELECT 
            CAST(row_number() OVER (ORDER BY ogerencia, subgerencia, primer_nivel) AS INTEGER) as id,
            ogerencia,
            subgerencia,
            primer_nivel as area
        FROM "p_Usuarios"
        WHERE ogerencia IS NOT NULL
        GROUP BY ogerencia, subgerencia, primer_nivel
    `
})
export class OrganizacionView {
    @ViewColumn()
    id: number;

    @ViewColumn()
    ogerencia: string;

    @ViewColumn()
    subgerencia: string;

    @ViewColumn()
    area: string;
}
