import { DataSource } from 'typeorm';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { TasksService } from '../clarity/tasks.service';
import { CheckinUpsertDto } from '../clarity/dto/clarity.dtos';
import { Usuario, Tarea, Proyecto } from '../entities';

async function bootstrap() {
    console.log('--- STARTING FUNCTIONAL TEST: CHECKIN FLOW 1-3-5 ---');
    const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
    const tasksService = app.get(TasksService);
    const dataSource = app.get(DataSource);
    const tareaRepo = dataSource.getRepository(Tarea);
    const usuarioRepo = dataSource.getRepository(Usuario);
    const proyectoRepo = dataSource.getRepository(Proyecto);

    try {
        // 1. Setup Data: Ensure User and Tasks exists
        const email = 'gustavo@claro.com-ni';
        let user = await usuarioRepo.findOneBy({ correo: email });
        if (!user) {
            console.log('User not found, seeding...');
            // Simple seed if missing (unlikely if seeded before)
            user = await usuarioRepo.save({ nombre: 'Gustavo Test', correo: email, activo: true });
        }
        const userId = user!.idUsuario;
        console.log(`Testing with User ID: ${userId} (${email})`);

        // Create tasks for validation
        const proyecto = await proyectoRepo.save(proyectoRepo.create({ nombre: 'Test Project', estado: 'Activo' }));

        const t1 = await tareaRepo.save({ titulo: 'Task Focus', idReferencia: 'T-1', idProyecto: proyecto.idProyecto, idCreador: userId, prioridad: 'Alta', esfuerzo: 'M', estado: 'Pendiente' });
        const t2 = await tareaRepo.save({ titulo: 'Task Advance 1', idReferencia: 'T-2', idProyecto: proyecto.idProyecto, idCreador: userId, prioridad: 'Media', esfuerzo: 'M', estado: 'Pendiente' });
        const t3 = await tareaRepo.save({ titulo: 'Task Advance 2', idReferencia: 'T-3', idProyecto: proyecto.idProyecto, idCreador: userId, prioridad: 'Media', esfuerzo: 'M', estado: 'Pendiente' });
        const t4 = await tareaRepo.save({ titulo: 'Task Quick Win 1', idReferencia: 'T-4', idProyecto: proyecto.idProyecto, idCreador: userId, prioridad: 'Baja', esfuerzo: 'S', estado: 'Pendiente' });

        // 2. Execute Check-in Upsert (Backend Logic)
        const today = new Date().toISOString().split('T')[0];
        const dto: CheckinUpsertDto = {
            idUsuario: userId,
            fecha: today,
            entregableTexto: 'Validar Backend Clarity',
            estadoAnimo: 'Tope', // New Field
            entrego: [t1.idTarea],
            avanzo: [t2.idTarea, t3.idTarea],
            extras: [t4.idTarea] // New Field
        };

        console.log('Submitting Check-in DTO:', JSON.stringify(dto, null, 2));
        const savedCheckin = await tasksService.checkinUpsert(dto);
        console.log('Check-in Saved ID:', savedCheckin.idCheckin);

        // 3. Verify Data Persistence
        const checkinFromDb = await dataSource.getRepository('Checkin').findOne({
            where: { idCheckin: savedCheckin.idCheckin },
            relations: ['tareas', 'tareas.tarea']
        });

        if (!checkinFromDb) throw new Error('Checkin not found in DB');

        // Assert Mood
        const moodMatch = checkinFromDb.estadoAnimo === 'Tope';
        console.log(`[TEST] Mood Saved Correctly: ${moodMatch ? 'PASS ✅' : 'FAIL ❌'} (${checkinFromDb.estadoAnimo})`);

        // Assert Tasks
        const tasks = checkinFromDb.tareas || [];
        const focus = tasks.find(t => t.tipo === 'Entrego');
        const advance = tasks.filter(t => t.tipo === 'Avanzo');
        const extras = tasks.filter(t => t.tipo === 'Extra');

        const focusPass = focus && focus.idTarea === t1.idTarea;
        const advancePass = advance.length === 2;
        const extrasPass = extras.length === 1 && extras[0].idTarea === t4.idTarea;

        console.log(`[TEST] Focus Task Saved: ${focusPass ? 'PASS ✅' : 'FAIL ❌'}`);
        console.log(`[TEST] Advance Tasks Count (2): ${advancePass ? 'PASS ✅' : 'FAIL ❌'}`);
        console.log(`[TEST] Extras Tasks Count (1): ${extrasPass ? 'PASS ✅' : 'FAIL ❌'}`);

        // 4. Verify Service GET (Frontend Consumption)
        const miDiaData = await tasksService.miDiaGet(userId, today);
        const checkinGet = miDiaData.checkinHoy;

        const getHasTasks = checkinGet && checkinGet.tareas && checkinGet.tareas.length > 0;
        console.log(`[TEST] miDiaGet returns tasks relation: ${getHasTasks ? 'PASS ✅' : 'FAIL ❌ (Frontend wont see tasks)'}`);

        if (moodMatch && focusPass && advancePass && extrasPass && getHasTasks) {
            console.log('--- TEST RESULT: ALL SYSTEMS GO 🚀 ---');
            process.exit(0);
        } else {
            console.error('--- TEST RESULT: FAILED 💥 ---');
            process.exit(1);
        }

    } catch (e) {
        console.error('Test Failed Exception:', e);
        process.exit(1);
    }
}

bootstrap();
