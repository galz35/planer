
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { Usuario } from './src/auth/entities/usuario.entity';
import { Tarea } from './src/planning/entities/tarea.entity';
import { TareaAsignado } from './src/planning/entities/tarea-asignado.entity';

console.log('Script starting...');
dotenv.config();
console.log('Environment loaded');


const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [Usuario, Tarea, TareaAsignado],
    ssl: { rejectUnauthorized: false },
    synchronize: false,
});

async function checkTania() {
    await ds.initialize();

    // 1. Find User
    const email = 'taniaa.aguirre@claro.com.ni';
    const user = await ds.getRepository(Usuario).findOne({ where: { correo: email } });

    if (!user) {
        console.log(`User ${email} NOT FOUND`);
        await ds.destroy();
        return;
    }

    console.log(`User Found: ID=${user.idUsuario}, Name=${user.nombre}`);

    // 2. Find Tasks Assigned
    const asignaciones = await ds.getRepository(TareaAsignado).find({
        where: { idUsuario: user.idUsuario, tipo: 'Responsable' },
        relations: ['tarea']
    });

    console.log(`Total Tasks Assigned (Responsable): ${asignaciones.length}`);

    asignaciones.forEach(a => {
        const t = a.tarea;
        console.log(`- Task [${t.idTarea}]: ${t.titulo} | ID: ${t.idTarea} | Estado: ${t.estado} | Obj: ${t.fechaObjetivo} | Plan: ${t.fechaInicioPlanificada} | Hecha: ${t.fechaHecha}`);
    });

    // 3. Verify specifically for "MisTareas" logic
    // Logic in TasksService:
    /*
        return this.tareaRepo.find({
            where: { asignados: { idUsuario, tipo: 'Responsable' } },
            relations: ['proyecto', 'asignados', 'asignados.usuario'],
            order: { fechaObjetivo: 'ASC', prioridad: 'DESC' }
        });
    */
    // This seems consistent with what I just checked.

    await ds.destroy();
}

checkTania().catch(console.error);
