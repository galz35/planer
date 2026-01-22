
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as fs from 'fs';
import { Usuario } from '../auth/entities/usuario.entity';
import { Rol } from '../auth/entities/rol.entity';
import { UsuarioOrganizacion } from '../auth/entities/usuario-organizacion.entity';

config();

async function main() {
    console.log('Connecting to database...');
    const ds = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        entities: [__dirname + '/../auth/entities/*.entity.ts', __dirname + '/../planning/entities/*.entity.ts'],
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        synchronize: false,
    });

    await ds.initialize();
    console.log('Connected.');

    const csvPath = 'd:\\planificacion\\rrhh.csv';
    if (!fs.existsSync(csvPath)) {
        console.error('CSV file not found at: ' + csvPath);
        return;
    }

    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim().length > 0);

    // DELIMITER IS SEMICOLON ;
    const headers = lines[0].split(';').map(h => h.trim());
    console.log('Headers detected: ' + headers.length);

    const dataRows = lines.slice(1).map(line => {
        const values = line.split(';');
        const obj: any = {};
        headers.forEach((h, i) => {
            let val = values[i] ? values[i].trim() : null;
            if (val === 'NULL' || val === 'null' || val === '') val = null;
            obj[h] = val;
        });
        return obj;
    });

    console.log(`Processing ${dataRows.length} records...`);

    let updatedCount = 0;
    let createdCount = 0;

    for (const row of dataRows) {
        const correo = row.correo ? row.correo.toLowerCase().trim() : null;
        console.log(`Checking row: ${row.nombre_completo} <${correo}>`);
        if (!correo) {
            console.warn('Skipping row without email: ' + row.nombre_completo);
            continue;
        }


        // Parse date
        if (correo.includes('ali.rodriguez')) {
            console.log('!!! FOUND ALI IN CSV !!!');
            console.log('Row Data for Ali:', JSON.stringify(row, null, 2));
        }

        let fechaIngreso: Date | null = null;
        if (row.fechaingreso) {
            // Assume format M/D/YYYY or similar from sample 7/10/2013
            const parts = row.fechaingreso.split('/');
            if (parts.length === 3) {
                // Parts are probably D/M/Y or M/D/Y. Sample 7/10/2013 could be either.
                // Row 10: 2/8/2016. 
                // Let's assume M/D/YYYY as it is common in some exports or D/M/YYYY.
                // Sample 29/11/1988 (Row 4 birth) -> D/M/YYYY
                fechaIngreso = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            }
        }

        const repo = ds.getRepository(Usuario);
        let user = await repo.findOne({ where: { correo } });

        if (!user) {
            console.log('Creating new user: ' + correo);
            user = repo.create({
                correo,
                nombre: row.nombre_completo || 'Sin Nombre',
                activo: true,
                rolGlobal: 'Empleado',
                pais: row.pais || 'NI'
            });
            createdCount++;
        } else {
            updatedCount++;
        }

        // Map fields
        user.carnet = row.carnet;
        user.nombreCompleto = row.nombre_completo;
        user.cargo = row.cargo;
        user.departamento = row.Departamento;
        user.orgDepartamento = row.oDEPARTAMENTO;
        user.orgGerencia = row.OGERENCIA;
        user.idOrg = row.idorg;
        user.jefeCarnet = row.carnet_jefe1;
        user.jefeNombre = row.nom_jefe1;
        user.jefeCorreo = row.correo_jefe1;
        user.fechaIngreso = fechaIngreso;
        user.genero = row.Gender;
        user.username = row.UserNam;

        // Extended fields
        user.cedula = row.cedula;
        user.area = row.oSUBGERENCIA;
        user.gerencia = row.OGERENCIA;
        user.direccion = row.Direccion;
        user.empresa = row.empresa;
        user.ubicacion = row.Nombreubicacion;

        user.primerNivel = row.primernivel;
        user.segundoNivel = row.segundo_nivel;
        user.tercerNivel = row.tercer_nivel;
        user.cuartoNivel = row.cuarto_nivel;
        user.quintoNivel = row.quinto_nivel;
        user.sextoNivel = row.sexto_nivel;

        user.carnetJefe2 = row.carnet_jefe2;
        user.carnetJefe3 = row.carnet_jefe3;
        user.carnetJefe4 = row.carnet_jefe4;

        user.tipoEmpleado = row.ManagerLevel;
        user.tipoContrato = row.ActionCode; // Placeholder as mentioned
        user.fuenteDatos = 'SYNC_RRHH_CSV';

        await repo.save(user);
    }

    console.log(`Sync complete. Created: ${createdCount}, Updated: ${updatedCount}`);
    await ds.destroy();
}

main().catch(error => {
    console.error('Error during sync:');
    console.error(error);
});
