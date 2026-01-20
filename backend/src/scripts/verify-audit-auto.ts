import { DataSource } from 'typeorm';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { TasksService } from '../clarity/tasks.service';
import { Usuario, Tarea, AuditLog } from '../entities';

async function bootstrap() {
    console.log('--- STARTING FUNCTIONAL TEST: AUTO AUDIT ---');
    const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
    const tasksService = app.get(TasksService);
    const dataSource = app.get(DataSource);
    const usuarioRepo = dataSource.getRepository(Usuario);
    const auditRepo = dataSource.getRepository(AuditLog);

    try {
        // 1. Setup User
        const email = 'audit@tester.com';
        let user = await usuarioRepo.findOneBy({ correo: email });
        if (!user) {
            user = await usuarioRepo.save({ nombre: 'Audit Tester', correo: email, activo: true });
        }
        const userId = user!.idUsuario;
        console.log(`Using User ID: ${userId}`);

        // 2. Test: Create Task (Should Trigger INSERT Audit)
        const tareaDto = {
            titulo: 'Auto Audit Task',
            idUsuario: userId,
            idProyecto: null, // Sin proyecto
            prioridad: 'Media',

        };
        console.log('Creating Task...');
        const tareaCreada = await tasksService.tareaCrearRapida(tareaDto as any);
        const taskId = tareaCreada.idTarea.toString();

        // Wait a bit for subscriber (sync but good to be safe)
        const logCreacion = await auditRepo.findOne({
            where: { recursoId: taskId, accion: 'TAREA_CREADA' },
            order: { fecha: 'DESC' }
        });

        if (logCreacion) {
            console.log(`[PASS] Creation Log Found: ID ${logCreacion.idAudit}`);
        } else {
            console.error('[FAIL] Creation Log NOT Found');
            process.exit(1);
        }

        // 3. Test: Update Task (Should Trigger UPDATE Audit)
        console.log('Updating Task Priority...');
        await tasksService.tareaActualizar(tareaCreada.idTarea, { prioridad: 'Alta' }, userId);

        const logUpdate = await auditRepo.findOne({
            where: { recursoId: taskId, accion: 'TAREA_ACTUALIZADA' },
            order: { fecha: 'DESC' }
        });

        if (logUpdate) {
            console.log(`[PASS] Update Log Found: ID ${logUpdate.idAudit}`);
            const detalles = JSON.parse(logUpdate.detalles);
            if (detalles.cambios && detalles.cambios.some((c: string) => c.includes('Prioridad: Media -> Alta'))) {
                console.log(`[PASS] Change Details Verified: ${JSON.stringify(detalles.cambios)}`);
            } else {
                console.error(`[FAIL] Log Details Incorrect: ${logUpdate.detalles}`);
                process.exit(1);
            }
        } else {
            console.error('[FAIL] Update Log NOT Found');
            process.exit(1);
        }

        console.log('--- TEST RESULT: AUDIT SYSTEM OPERATIONAL 🚀 ---');
        process.exit(0);

    } catch (e) {
        console.error('Test Failed Exception:', e);
        process.exit(1);
    }
}

bootstrap();
