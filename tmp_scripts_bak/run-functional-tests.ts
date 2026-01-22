import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';
import {
    Usuario, UsuarioCredenciales, Proyecto, Tarea, TareaAsignado, Checkin, Bloqueo
} from '../entities';

async function runFunctionalTests() {
    console.log('\n🚢 INICIANDO SUITE DE PRUEBAS FUNCIONALES PARA CLARITY BACKEND 🚢\n');

    const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
    const AppDataSource = app.get(DataSource);

    try {
        console.log('✅ BASE DE DATOS CONECTADA (VIA NESTJS)');

        const userRepo = AppDataSource.getRepository(Usuario);
        const credsRepo = AppDataSource.getRepository(UsuarioCredenciales);
        const tareaRepo = AppDataSource.getRepository(Tarea);
        const asignadoRepo = AppDataSource.getRepository(TareaAsignado);
        const checkinRepo = AppDataSource.getRepository(Checkin);
        const proyectoRepo = AppDataSource.getRepository(Proyecto);
        const bloqueoRepo = AppDataSource.getRepository(Bloqueo);

        // --- 1. Crear Usuario de Prueba ---
        const email = faker.internet.email();
        const password = 'TestPassword123!';
        const hash = await bcrypt.hash(password, 10);

        const newUser = userRepo.create({
            nombre: faker.person.fullName(),
            correo: email,
            activo: true,
            telefono: faker.phone.number(),
            pais: 'NI' // Validar nuevo campo
        });
        const savedUser = await userRepo.save(newUser);

        await credsRepo.save({
            idUsuario: savedUser.idUsuario,
            passwordHash: hash
        });
        console.log(`✅ TEST 1: Usuario creado exitosamente (ID: ${savedUser.idUsuario}, Email: ${email}, Pais: NI)`);

        // --- 2. Simular Login (Verificar Password) ---
        const creds = await credsRepo.findOne({ where: { idUsuario: savedUser.idUsuario } });
        if (!creds) throw new Error('Credenciales no encontradas');
        const isMatch = await bcrypt.compare(password, creds.passwordHash);
        if (isMatch) console.log('✅ TEST 2: Validación de contraseña (Login) exitosa');
        else throw new Error('Fallo validación de contraseña');

        // --- 3. Crear Proyecto ---
        const newProject = proyectoRepo.create({
            nombre: 'Proyecto Transformación Digital',
            estado: 'Activo',
            descripcion: 'Migración a la nube'
        });
        const savedProject = await proyectoRepo.save(newProject);
        console.log(`✅ TEST 3: Proyecto creado (ID: ${savedProject.idProyecto})`);

        // --- 4. Crear Tarea ---
        const newTarea = tareaRepo.create({
            titulo: 'Implementar API Gateway',
            idProyecto: savedProject.idProyecto,
            estado: 'Pendiente',
            prioridad: 'Alta',
            esfuerzo: 'M',
            idCreador: savedUser.idUsuario,
            fechaObjetivo: new Date().toISOString()
        });
        const savedTarea = await tareaRepo.save(newTarea);

        // Asignar Tarea
        await asignadoRepo.save({
            idTarea: savedTarea.idTarea,
            idUsuario: savedUser.idUsuario,
            tipo: 'Responsable'
        });
        console.log(`✅ TEST 4: Tarea creada y asignada (ID: ${savedTarea.idTarea})`);

        // --- 5. Consultar "Mis Tareas" (Arrastrados logic checking) ---
        const misTareas = await tareaRepo.createQueryBuilder('t')
            .innerJoin('t.asignados', 'ta')
            .where('ta.idUsuario = :uid', { uid: savedUser.idUsuario })
            .getMany();

        if (misTareas.length > 0) console.log(`✅ TEST 5: Consulta "Mis Tareas" devuelve ${misTareas.length} item(s)`);
        else throw new Error('Mis Tareas no devolvió nada');

        // --- 6. Crear Check-in Diario ---
        const checkin = checkinRepo.create({
            idUsuario: savedUser.idUsuario,
            fecha: new Date().toISOString().split('T')[0],
            entregableTexto: 'Documentación inicial',
            nota: 'Todo bien'
        });
        await checkinRepo.save(checkin);
        console.log('✅ TEST 6: Check-in diario registrado exitosamente');

        // --- 7. Crear y Resolver Bloqueo ---
        const bloqueo = bloqueoRepo.create({
            idOrigenUsuario: savedUser.idUsuario,
            motivo: 'Falta acceso a servidor',
            estado: 'Activo'
        });
        const savedBloqueo = await bloqueoRepo.save(bloqueo);

        savedBloqueo.estado = 'Resuelto';
        savedBloqueo.fechaResolucion = new Date();
        await bloqueoRepo.save(savedBloqueo);
        console.log(`✅ TEST 7: Ciclo de Bloqueo (Crear -> Resolver) completado`);

        console.log('\n✨ TODOS LOS TESTS FUNCIONALES PASARON EXITOSAMENTE ✨\n');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ FALLÓ UN TEST:');
        console.error(error);
        process.exit(1);
    }
}

runFunctionalTests();
