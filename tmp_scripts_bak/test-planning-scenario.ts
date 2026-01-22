
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as bcrypt from 'bcrypt';
import { Usuario, Rol, UsuarioCredenciales, OrganizacionNodo, UsuarioOrganizacion, Proyecto, Tarea, TareaAsignado, Checkin, Bloqueo } from '../entities';
import { ClarityService } from '../clarity/clarity.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

// Load .env
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

async function runPlanningTest() {
    console.log('\n🚢 INICIANDO PRUEBA DE ESCENARIOS DE PLANIFICACIÓN (MANAGER -> EMPLEADO) 🚢\n');

    const AppDataSource = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        entities: [Usuario, Rol, UsuarioCredenciales, OrganizacionNodo, UsuarioOrganizacion, Proyecto, Tarea, TareaAsignado, Checkin, Bloqueo],
        synchronize: false, // Don't sync, rely on existing DB state
        logging: false
    });

    try {
        await AppDataSource.initialize();
        console.log('✅ BASE DE DATOS CONECTADA');

        // Repositories
        const userRepo = AppDataSource.getRepository(Usuario);
        const tareaRepo = AppDataSource.getRepository(Tarea);
        const asignadoRepo = AppDataSource.getRepository(TareaAsignado);
        const proyectoRepo = AppDataSource.getRepository(Proyecto);

        // --- SCENARIO 1: IDENTIFY USERS ---
        // Using specific hierarchy: Cándida (Manager) -> Gustavo (Employee)
        const manager = await userRepo.findOne({ where: { correo: 'candida@claro.com.ni' } });
        const employee = await userRepo.findOne({ where: { correo: 'gustavo@claro.com.ni' } });

        if (!manager || !employee) {
            throw new Error('❌ No se encontraron los usuarios de prueba (Cándida/Gustavo). Ejecuta seed-db.ts primero.');
        }
        console.log(`✅ SCENARIO 1: Usuarios Identificados - Manager: ${manager.nombre}, Empleado: ${employee.nombre}`);

        // --- SCENARIO 2: MANAGER ASSIGNS TASK TO EMPLOYEE ---
        // Create a task first (Manager creates it, or it exists in backlog)
        const project = await proyectoRepo.findOne({ where: { nombre: 'Migración 2025' } });
        if (!project) throw new Error('No se encontró proyecto');

        const managerTask = tareaRepo.create({
            titulo: 'Tarea Asignada por Jefe',
            idProyecto: project.idProyecto,
            estado: 'Pendiente',
            idCreador: manager.idUsuario,
            prioridad: 'Alta',
            esfuerzo: 'M'
        });
        const savedTask = await tareaRepo.save(managerTask);

        // MANAGER ACTION: Assign to Employee
        // Using logic similar to clarity.service.ts -> tareaAsignarResponsable

        // 1. Clear existing assignments (if any)
        await asignadoRepo.delete({ idTarea: savedTask.idTarea });

        // 2. Assign to new user
        await asignadoRepo.save({
            idTarea: savedTask.idTarea,
            idUsuario: employee.idUsuario,
            tipo: 'Responsable'
        });

        // 3. Update Tarea with idAsignadoPor
        savedTask.idAsignadoPor = manager.idUsuario;
        await tareaRepo.save(savedTask);

        console.log(`✅ SCENARIO 2: Manager asignó tarea "${savedTask.titulo}" (ID: ${savedTask.idTarea}) a ${employee.nombre}`);

        // --- SCENARIO 3: VALIDATE ASSIGNMENT IN DB ---
        const verifyTask = await tareaRepo.findOne({
            where: { idTarea: savedTask.idTarea },
            relations: ['asignados', 'asignados.usuario', 'asignadoPor']
        });

        if (verifyTask && verifyTask.idAsignadoPor === manager.idUsuario && verifyTask.asignados[0].idUsuario === employee.idUsuario) {
            console.log(`✅ SCENARIO 3: Verificación DB correcta. idAsignadoPor = ${verifyTask.asignadoPor.nombre}, Responsable = ${verifyTask.asignados[0].usuario.nombre}`);
        } else {
            throw new Error('❌ Falló la verificación de asignación en DB');
        }

        // --- SCENARIO 4: EMPLOYEE SEES TASK ---
        // Simulate "Get My Tasks" query
        const employeeTasks = await tareaRepo.createQueryBuilder('t')
            .innerJoin('t.asignados', 'ta')
            .where('ta.idUsuario = :uid', { uid: employee.idUsuario })
            .andWhere('t.estado = :est', { est: 'Pendiente' })
            .getMany();

        const found = employeeTasks.find(t => t.idTarea === savedTask.idTarea);
        if (found) {
            console.log(`✅ SCENARIO 4: Empleado ve la tarea en su lista de pendientes.`);
        } else {
            throw new Error('❌ El empleado no ve la tarea asignada.');
        }

        console.log('\n✨ TODOS LOS ESCENARIOS DE PLANIFICACIÓN EXITOSOS ✨\n');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ FALLÓ UN ESCENARIO:');
        console.error(error);
        process.exit(1);
    }
}

runPlanningTest();
