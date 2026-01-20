import { DataSource, In } from 'typeorm';
import {
    Usuario, Tarea, TareaAsignado, Proyecto, OrganizacionNodo,
    Rol, Checkin, CheckinTarea, Bloqueo, TareaAvance, AuditLog,
    UsuarioOrganizacion, UsuarioConfig, UsuarioCredenciales
} from '../entities';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../../.env') });

const entities = [
    Usuario, Tarea, TareaAsignado, Proyecto, OrganizacionNodo,
    Rol, Checkin, CheckinTarea, Bloqueo, TareaAvance, AuditLog,
    UsuarioOrganizacion, UsuarioConfig, UsuarioCredenciales
];

async function run() {
    console.log('--- RESET Y SEED DE ESCENARIO DE SIMULACIÓN ---');

    const ds = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_NAME || 'clarity_db',
        entities: entities,
        synchronize: false,
    });

    await ds.initialize();

    const queryRunner = ds.createQueryRunner();
    await queryRunner.connect();

    try {
        // 1. LIMPIEZA AGRESIVA de datos de prueba previos
        console.log('Limpiando base de datos (Escenario de Prueba)...');

        // Buscamos usuarios de prueba previos
        const testEmails = ['eduardo@prueba.com', 'emp1@prueba.com', 'emp2@prueba.com', 'emp3@prueba.com', 'ramon@gerencia.com', 'soporte@prueba.com'];
        const existingUsers = await ds.getRepository(Usuario).find({
            where: { correo: In(testEmails) }
        });
        const userIds = existingUsers.map(u => u.idUsuario);

        if (userIds.length > 0) {
            // Borrar relaciones dependientes
            await queryRunner.query(`DELETE FROM "p_TareaAsignados" WHERE "idUsuario" = ANY($1)`, [userIds]);
            await queryRunner.query(`DELETE FROM "p_CheckinTareas" WHERE "idTarea" IN (SELECT "idTarea" FROM "p_Tareas" WHERE "idCreador" = ANY($1))`, [userIds]);
            await queryRunner.query(`DELETE FROM "p_TareaAvances" WHERE "idUsuario" = ANY($1)`, [userIds]);
            await queryRunner.query(`DELETE FROM "p_Bloqueos" WHERE "idOrigenUsuario" = ANY($1) OR "idDestinoUsuario" = ANY($1)`, [userIds]);
            await queryRunner.query(`DELETE FROM "p_Checkins" WHERE "idUsuario" = ANY($1)`, [userIds]);
            await queryRunner.query(`DELETE FROM "p_UsuariosOrganizacion" WHERE "idUsuario" = ANY($1)`, [userIds]);
            await queryRunner.query(`DELETE FROM "p_UsuariosConfig" WHERE "idUsuario" = ANY($1)`, [userIds]);
            await queryRunner.query(`DELETE FROM "p_UsuariosCredenciales" WHERE "idUsuario" = ANY($1)`, [userIds]);
            await queryRunner.query(`DELETE FROM "p_Auditoria" WHERE "idUsuario" = ANY($1)`, [userIds]);

            // Borrar tareas creadas por ellos
            await queryRunner.query(`DELETE FROM "p_Tareas" WHERE "idCreador" = ANY($1)`, [userIds]);

            // Borrar los usuarios
            await queryRunner.query(`DELETE FROM "p_Usuarios" WHERE "idUsuario" = ANY($1)`, [userIds]);
        }

        // Borrar proyectos de prueba y sus tareas asociadas
        const projectNames = ['Proyecto de Simulación', 'Proyecto de Simulación Core', 'Infraestructura 2026'];

        // 1. Identificar proyectos
        const projectsToDelete = await ds.getRepository(Proyecto).find({ where: { nombre: In(projectNames) } });
        const projectIds = projectsToDelete.map(p => p.idProyecto);

        if (projectIds.length > 0) {
            console.log(`Eliminando ${projectIds.length} proyectos y sus dependencias...`);

            // 2. Identificar tareas de estos proyectos
            const tasksToDelete = await ds.getRepository(Tarea).find({ where: { idProyecto: In(projectIds) } });
            const taskIds = tasksToDelete.map(t => t.idTarea);

            if (taskIds.length > 0) {
                console.log(`Eliminando ${taskIds.length} tareas asociadas a los proyectos...`);
                // 3. Eliminar dependencias de tareas
                await queryRunner.query(`DELETE FROM "p_TareaAsignados" WHERE "idTarea" = ANY($1)`, [taskIds]);
                await queryRunner.query(`DELETE FROM "p_Bloqueos" WHERE "idTarea" = ANY($1)`, [taskIds]);
                await queryRunner.query(`DELETE FROM "p_CheckinTareas" WHERE "idTarea" = ANY($1)`, [taskIds]);
                await queryRunner.query(`DELETE FROM "p_TareaAvances" WHERE "idTarea" = ANY($1)`, [taskIds]);

                // 4. Eliminar tareas
                await queryRunner.query(`DELETE FROM "p_Tareas" WHERE "idTarea" = ANY($1)`, [taskIds]);
            }

            // 5. Eliminar proyectos
            await queryRunner.query(`DELETE FROM "p_Proyectos" WHERE "idProyecto" = ANY($1)`, [projectIds]);
        }

        // 6. Limpiar Nodos y sus relaciones
        const nodeNames = ['Equipo de Soporte', 'Escenario de Simulación'];
        const nodesToDelete = await ds.getRepository(OrganizacionNodo).find({ where: { nombre: In(nodeNames) } });
        const nodeIds = nodesToDelete.map(n => n.idNodo);

        if (nodeIds.length > 0) {
            console.log(`Eliminando referencias a ${nodeIds.length} nodos...`);
            await queryRunner.query(`DELETE FROM "p_UsuariosOrganizacion" WHERE "idNodo" = ANY($1)`, [nodeIds]);
            await queryRunner.query(`DELETE FROM "p_OrganizacionNodos" WHERE "idNodo" = ANY($1)`, [nodeIds]);
        }

        console.log('Base limpia. Iniciando creación de datos frescos...');

        // 2. CREACIÓN DE ROL
        let rolColab = await ds.getRepository(Rol).findOneBy({ nombre: 'Colaborador' });
        if (!rolColab) {
            rolColab = await ds.getRepository(Rol).save({ nombre: 'Colaborador', descripcion: 'Personal operativo' });
        }

        // 3. ESTRUCTURA ORGANIZACIONAL
        const nodoSim = await ds.getRepository(OrganizacionNodo).save({
            nombre: 'Escenario de Simulación',
            tipo: 'Equipo',
            descripcion: 'Nodo para pruebas de flujo completo'
        });

        // 4. USUARIOS Y JERARQUÍA COMPLETA
        const hashedPw = await bcrypt.hash('123456', 10);

        async function crearUsuario(nombre, correo, passHash) {
            const u = await ds.getRepository(Usuario).save({ nombre, correo, rolGlobal: 'User' });
            await ds.getRepository(UsuarioCredenciales).save({ idUsuario: u.idUsuario, passwordHash: passHash });
            return u;
        }

        // Nivel 1: Gerencia
        const gerenteTi = await crearUsuario('Gerente TI (Ramón)', 'ramon@gerencia.com', hashedPw);

        // Nivel 2: Liderazgo (Jefe Eduardo)
        const jefeEduardo = await crearUsuario('Jefe Eduardo', 'eduardo@prueba.com', hashedPw);

        // Nivel 3: Operativos
        const emp1 = await crearUsuario('Empleado Uno (Dev)', 'emp1@prueba.com', hashedPw);
        const emp2 = await crearUsuario('Empleado Dos (UX)', 'emp2@prueba.com', hashedPw);
        const emp3 = await crearUsuario('Empleado Tres (QA)', 'emp3@prueba.com', hashedPw);

        // Nivel 4: Otro Equipo (Soporte)
        const soporte = await crearUsuario('Soporte Técnico', 'soporte@prueba.com', hashedPw);

        const nodoSoporte = await ds.getRepository(OrganizacionNodo).save({
            nombre: 'Equipo de Soporte',
            idPadre: nodoSim.idNodo,
            tipo: 'Equipo',
            descripcion: 'Atención a incidentes'
        });

        // Asignar a la organización con fechas de inicio
        const now = new Date();
        await ds.getRepository(UsuarioOrganizacion).save([
            { idUsuario: gerenteTi.idUsuario, idNodo: nodoSim.idNodo, rol: 'Gerente', fechaInicio: now },
            { idUsuario: jefeEduardo.idUsuario, idNodo: nodoSim.idNodo, rol: 'Lider', fechaInicio: now },
            { idUsuario: emp1.idUsuario, idNodo: nodoSim.idNodo, rol: 'Colaborador', fechaInicio: now },
            { idUsuario: emp2.idUsuario, idNodo: nodoSim.idNodo, rol: 'Colaborador', fechaInicio: now },
            { idUsuario: emp3.idUsuario, idNodo: nodoSim.idNodo, rol: 'Colaborador', fechaInicio: now },
            { idUsuario: soporte.idUsuario, idNodo: nodoSoporte.idNodo, rol: 'Colaborador', fechaInicio: now },
        ]);

        // 5. PROYECTOS MÚLTIPLES
        const proyectoCore = await ds.getRepository(Proyecto).save({
            nombre: 'Proyecto de Simulación Core',
            descripcion: 'Reestructuración del sistema principal',
            idNodoDuenio: nodoSim.idNodo,
            estado: 'Activo'
        });

        const proyectoInfra = await ds.getRepository(Proyecto).save({
            nombre: 'Infraestructura 2026',
            descripcion: 'Migración a nuevos servidores',
            idNodoDuenio: nodoSim.idNodo,
            estado: 'Activo'
        });

        // 6. TAREAS CON DIVERSOS ESTADOS Y BLOQUEOS

        // Tarea 1: En curso (Eduardo)
        const tEduardo = await ds.getRepository(Tarea).save({
            titulo: 'Revisión Estratégica',
            descripcion: 'Analizar KPIs del equipo',
            idProyecto: proyectoCore.idProyecto,
            idCreador: gerenteTi.idUsuario,
            prioridad: 'Alta',
            estado: 'EnCurso'
        });
        await ds.getRepository(TareaAsignado).save({ idTarea: tEduardo.idTarea, idUsuario: jefeEduardo.idUsuario, tipo: 'Responsable' });

        // Tarea 2: Bloqueada por otro equipo (Emp1)
        const tEmp1 = await ds.getRepository(Tarea).save({
            titulo: 'Despliegue de Backend',
            descripcion: 'Preparar ambiente de staging',
            idProyecto: proyectoInfra.idProyecto,
            idCreador: jefeEduardo.idUsuario,
            prioridad: 'Alta',
            estado: 'Pendiente'
        });
        await ds.getRepository(TareaAsignado).save({ idTarea: tEmp1.idTarea, idUsuario: emp1.idUsuario, tipo: 'Responsable' });

        await ds.getRepository(Bloqueo).save({
            idTarea: tEmp1.idTarea,
            idOrigenUsuario: emp1.idUsuario,
            idDestinoUsuario: soporte.idUsuario,
            motivo: 'Faltan credenciales del servidor',
            estado: 'Activo'
        });

        // Tarea 3: Sin proyecto (Emp3)
        await ds.getRepository(Tarea).save({
            titulo: 'Organización de Oficina',
            descripcion: 'Limpieza de cables y monitores',
            idCreador: jefeEduardo.idUsuario,
            prioridad: 'Baja',
            estado: 'Pendiente'
        });

        // Tarea 4: Bloqueo interno (Emp2 esperando a Emp1)
        const tEmp2 = await ds.getRepository(Tarea).save({
            titulo: 'Integración UI con API',
            idProyecto: proyectoCore.idProyecto,
            idCreador: jefeEduardo.idUsuario,
            prioridad: 'Media',
            estado: 'Pendiente'
        });
        await ds.getRepository(TareaAsignado).save({ idTarea: tEmp2.idTarea, idUsuario: emp2.idUsuario, tipo: 'Responsable' });

        await ds.getRepository(Bloqueo).save({
            idTarea: tEmp2.idTarea,
            idOrigenUsuario: emp2.idUsuario,
            idDestinoUsuario: emp1.idUsuario,
            motivo: 'Endpoint de login no responde',
            estado: 'Activo'
        });

        console.log('SCENARIO SEEDED COMPLETO:');
        console.log(`- Gerente: ramon@gerencia.com (Ve a todo el equipo)`);
        console.log(`- Jefe: eduardo@prueba.com (Lidera a Emp1, Emp2, Emp3)`);
        console.log(`- Soporte Técnico: soporte@prueba.com (Bloquea a Emp1)`);

    } catch (error) {
        console.error('Error durante el seed:', error);
    } finally {
        await queryRunner.release();
        await ds.destroy();
    }
}

run();
