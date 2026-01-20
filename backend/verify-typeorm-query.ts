
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { Usuario } from './src/auth/entities/usuario.entity';
import { Tarea } from './src/planning/entities/tarea.entity';
import { TareaAsignado } from './src/planning/entities/tarea-asignado.entity';
import { Proyecto } from './src/planning/entities/proyecto.entity';
import { PlanTrabajo } from './src/planning/entities/plan-trabajo.entity';
import { TareaAvance } from './src/planning/entities/tarea-avance.entity';
import { Rol } from './src/auth/entities/rol.entity';
import { UsuarioOrganizacion } from './src/auth/entities/usuario-organizacion.entity';
import { OrganizacionNodo } from './src/auth/entities/organizacion-nodo.entity';

dotenv.config();

const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [Usuario, Tarea, TareaAsignado, Proyecto, PlanTrabajo, TareaAvance, Rol, UsuarioOrganizacion, OrganizacionNodo],
    ssl: { rejectUnauthorized: false },
    synchronize: false,
});

async function check() {
    try {
        await ds.initialize();
        console.log('DS Initialized');

        const idUsuario = 2; // Tania

        // Test the exact query used in TasksService
        const tasks = await ds.getRepository(Tarea).find({
            where: {
                asignados: {
                    idUsuario: idUsuario,
                    tipo: 'Responsable'
                }
            },
            relations: ['proyecto', 'asignados', 'asignados.usuario'],
            order: { fechaObjetivo: 'ASC', prioridad: 'DESC' }
        });

        console.log(`Tasks found via TypeORM find(): ${tasks.length}`);
        tasks.forEach(t => console.log(`- [${t.idTarea}] ${t.titulo}`));

    } catch (e) {
        console.error(e);
    } finally {
        await ds.destroy();
    }
}

check();
