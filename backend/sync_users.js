
const { DataSource } = require('typeorm');
const fs = require('fs');
require('dotenv').config();

async function syncUsers() {
    console.log('Connecting to database...');
    const ds = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        synchronize: false,
    });

    try {
        await ds.initialize();
        console.log('Connected.');

        const csvPath = 'd:\\planificacion\\rrhh.csv';
        if (!fs.existsSync(csvPath)) {
            console.error('CSV file not found');
            return;
        }

        const content = fs.readFileSync(csvPath, 'utf8');
        const lines = content.split('\n').filter(l => l.trim().length > 0);
        const headers = lines[0].split(';').map(h => h.trim());

        const dataRows = lines.slice(1).map(line => {
            const values = line.split(';');
            const obj = {};
            headers.forEach((h, i) => {
                let val = values[i] ? values[i].trim() : null;
                if (val === 'NULL' || val === 'null' || val === '') val = null;
                obj[h] = val;
            });
            return obj;
        });

        console.log(`Processing ${dataRows.length} records...`);

        for (const row of dataRows) {
            const correo = row.correo ? row.correo.toLowerCase().trim() : null;
            if (!correo) continue;

            let fechaIngreso = null;
            if (row.fechaingreso) {
                const parts = row.fechaingreso.split('/');
                if (parts.length === 3) {
                    // Try to normalize to YYYY-MM-DD for SQL
                    // Assuming D/M/Y
                    fechaIngreso = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
            }

            // Using raw SQL to avoid metadata issues
            const sql = `
                INSERT INTO "p_Usuarios" (
                    correo, nombre, carnet, activo, "rolGlobal", "pais", "fechaCreacion",
                    "nombreCompleto", cargo, departamento, "orgDepartamento", "orgGerencia", "idOrg",
                    "jefeCarnet", "jefeNombre", "jefeCorreo", "fechaIngreso", genero, username,
                    cedula, area, gerencia, direccion, empresa, ubicacion,
                    primer_nivel, segundo_nivel, tercer_nivel, cuarto_nivel, quinto_nivel, sexto_nivel,
                    carnet_jefe2, carnet_jefe3, carnet_jefe4, tipo_empleado, tipo_contrato, fuente_datos
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, NOW(),
                    $7, $8, $9, $10, $11, $12,
                    $13, $14, $15, $16, $17, $18,
                    $19, $20, $21, $22, $23, $24,
                    $25, $26, $27, $28, $29, $30,
                    $31, $32, $33, $34, $35, $36
                )
                ON CONFLICT (correo) DO UPDATE SET
                    carnet = EXCLUDED.carnet,
                    "nombreCompleto" = EXCLUDED."nombreCompleto",
                    cargo = EXCLUDED.cargo,
                    departamento = EXCLUDED.departamento,
                    "orgDepartamento" = EXCLUDED."orgDepartamento",
                    "orgGerencia" = EXCLUDED."orgGerencia",
                    "idOrg" = EXCLUDED."idOrg",
                    "jefeCarnet" = EXCLUDED."jefeCarnet",
                    "jefeNombre" = EXCLUDED."jefeNombre",
                    "jefeCorreo" = EXCLUDED."jefeCorreo",
                    "fechaIngreso" = EXCLUDED."fechaIngreso",
                    genero = EXCLUDED.genero,
                    username = EXCLUDED.username,
                    cedula = EXCLUDED.cedula,
                    area = EXCLUDED.area,
                    gerencia = EXCLUDED.gerencia,
                    direccion = EXCLUDED.direccion,
                    empresa = EXCLUDED.empresa,
                    ubicacion = EXCLUDED.ubicacion,
                    primer_nivel = EXCLUDED.primer_nivel,
                    segundo_nivel = EXCLUDED.segundo_nivel,
                    tercer_nivel = EXCLUDED.tercer_nivel,
                    cuarto_nivel = EXCLUDED.cuarto_nivel,
                    quinto_nivel = EXCLUDED.quinto_nivel,
                    sexto_nivel = EXCLUDED.sexto_nivel,
                    carnet_jefe2 = EXCLUDED.carnet_jefe2,
                    carnet_jefe3 = EXCLUDED.carnet_jefe3,
                    carnet_jefe4 = EXCLUDED.carnet_jefe4,
                    tipo_empleado = EXCLUDED.tipo_empleado,
                    tipo_contrato = EXCLUDED.tipo_contrato,
                    fuente_datos = EXCLUDED.fuente_datos
            `;

            const params = [
                correo, row.nombre_completo || 'Sin Nombre', row.carnet, true, 'Empleado', row.pais || 'NI',
                row.nombre_completo, row.cargo, row.Departamento, row.oDEPARTAMENTO, row.OGERENCIA, row.idorg,
                row.carnet_jefe1, row.nom_jefe1, row.correo_jefe1, fechaIngreso, row.Gender, row.UserNam,
                row.cedula, row.oSUBGERENCIA, row.OGERENCIA, row.Direccion, row.empresa, row.Nombreubicacion,
                row.primernivel, row.segundo_nivel, row.tercer_nivel, row.cuarto_nivel, row.quinto_nivel, row.sexto_nivel,
                row.carnet_jefe2, row.carnet_jefe3, row.carnet_jefe4, row.ManagerLevel, row.ActionCode, 'SYNC_RRHH_CSV_V2'
            ];

            await ds.query(sql, params);
        }

        console.log('SQL Sync complete.');

    } catch (e) {
        console.error(e);
    } finally {
        await ds.destroy();
    }
}

syncUsers();
