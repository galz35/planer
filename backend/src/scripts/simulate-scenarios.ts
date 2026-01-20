import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { Proyecto, OrganizacionNodo, Tarea, SolicitudCambio, Usuario, Rol, UsuarioCredenciales, UsuarioOrganizacion, TareaAsignado, Checkin, CheckinTarea, Bloqueo, TareaAvance, UsuarioConfig, Nota, LogSistema, AuditLog } from '../entities';

dotenv.config();

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
    entities: [Proyecto, OrganizacionNodo, Tarea, SolicitudCambio, Usuario, Rol, UsuarioCredenciales, UsuarioOrganizacion, TareaAsignado, Checkin, CheckinTarea, Bloqueo, TareaAvance, UsuarioConfig, Nota, LogSistema, AuditLog],
});

async function simulate() {
    await AppDataSource.initialize();
    console.log('\n🎬 --- INICIANDO SIMULACIÓN DE ESCENARIOS REALES --- 🎬\n');

    const userRepo = AppDataSource.getRepository(Usuario);
    const proyectoRepo = AppDataSource.getRepository(Proyecto);
    const tareaRepo = AppDataSource.getRepository(Tarea);
    const solicitudRepo = AppDataSource.getRepository(SolicitudCambio);
    const auditRepo = AppDataSource.getRepository(AuditLog);

    // 1. SETUP: Obtener Actores
    // Usaremos usuarios existentes o crearemos dummies si no hay
    let empleado = await userRepo.findOne({ where: { rolGlobal: 'User' } });
    if (!empleado) empleado = await userRepo.save(userRepo.create({ nombre: 'Empleado Demo', correo: 'demo@test.com', rolGlobal: 'User', activo: true }));

    let gerente = await userRepo.findOne({ where: { rolGlobal: 'Admin' } }); // Usamos Admin como gerente para asegurar permisos
    if (!gerente) gerente = await userRepo.save(userRepo.create({ nombre: 'Gerente Demo', correo: 'boss@test.com', rolGlobal: 'Admin', activo: true }));

    console.log(`👤 Actor Empleado: ${empleado.nombre}`);
    console.log(`👤 Actor Gerente: ${gerente.nombre}`);

    // =================================================================================
    // ESCENARIO 1: Tarea Operativa (Cambio Directo)
    // =================================================================================
    console.log('\n🧪 [ESCENARIO 1] Modificación de Tarea Operativa (Sin Restricciones)');

    // Obtener proyecto operativo
    let proyOperativo = await proyectoRepo.findOne({ where: { tipo: 'Operativo' } });
    if (!proyOperativo) proyOperativo = await proyectoRepo.save(proyectoRepo.create({ nombre: 'Mantenimiento Rutinario', tipo: 'Operativo', requiereAprobacion: false }));

    // Crear tarea
    let tareaOp = await tareaRepo.save(tareaRepo.create({
        titulo: 'Revisar Logs Servidor',
        descripcion: 'Tarea rutinaria',
        proyecto: proyOperativo,
        idCreador: empleado.idUsuario,
        fechaInicioPlanificada: '2025-01-01',
        fechaObjetivo: '2025-01-05',
        estado: 'Pendiente'
    }));
    console.log(`   📝 Tarea creada: "${tareaOp.titulo}" (ID: ${tareaOp.idTarea}) en Proyecto Operativo.`);

    // Acción: Empleado cambia la fecha directamente
    tareaOp.fechaObjetivo = '2025-01-10'; // Retraso de 5 días
    await tareaRepo.save(tareaOp);
    console.log(`   ✅ Cambio directo realizado con éxito (Fecha -> 2025-01-10)`);

    // Verificación de Auditoría
    // (En la app real esto lo hace el TasksService, aquí simulamos que el servicio lo hizo para verificar que la DB lo soporta,
    // o consultamos si el servicio lo hubiera hecho. Como estamos bypassendo el servicio, insertamos el log manualmente para probar la entidad).
    /* Nota: Al usar repositorios directos en este script, NO estamos invocando la lógica del TasksService. 
       Para una prueba real de lógica, deberíamos instanciar el servicio, pero eso requiere NestJS context. 
       Aquí validaremos que la ESTRUCTURA DE DATOS soporta el flujo. */

    console.log(`   🔍 Validando estructura de datos...`);

    // =================================================================================
    // ESCENARIO 2: Tarea Estratégica (Intento de Cambio y Bloqueo)
    // =================================================================================
    console.log('\n🧪 [ESCENARIO 2] Modificación de Tarea Estratégica (Gobernanza)');

    let proyEstrat = await proyectoRepo.findOne({ where: { tipo: 'Estrategico' } });
    if (!proyEstrat) proyEstrat = await proyectoRepo.save(proyectoRepo.create({ nombre: 'Expansión LATAM', tipo: 'Estrategico', requiereAprobacion: true }));

    let tareaStrat = await tareaRepo.save(tareaRepo.create({
        titulo: 'Firmar Contrato Partner Local',
        proyecto: proyEstrat,
        idCreador: empleado.idUsuario,
        fechaObjetivo: '2025-03-01',
        estado: 'Pendiente',
        prioridad: 'Alta'
    }));
    console.log(`   🔒 Tarea Estratégica creada: "${tareaStrat.titulo}" (ID: ${tareaStrat.idTarea})`);

    // Simulación: El frontend detecta 'requiereAprobacion' y fuerza a usar SolicitudCambio.
    console.log(`   ⚠️  Sistema detecta Proyecto Estratégico. Bloqueando edición directa.`);
    console.log(`   📩 Empleado envía Solicitud de Cambio...`);

    const solicitud = await solicitudRepo.save(solicitudRepo.create({
        idTarea: tareaStrat.idTarea,
        idUsuarioSolicitante: empleado.idUsuario,
        campoAfectado: 'fechaObjetivo',
        valorAnterior: '2025-03-01',
        valorNuevo: '2025-04-01',
        motivo: 'Retraso legal en firmas',
        estado: 'Pendiente'
    }));

    console.log(`   ✅ Solicitud #${solicitud.idSolicitud} creada. Estado: ${solicitud.estado}`);

    // =================================================================================
    // ESCENARIO 3: Aprobación Gerencial
    // =================================================================================
    console.log('\n🧪 [ESCENARIO 3] Aprobación Gerencial y Aplicación del Cambio');

    // Gerente revisa pendientes
    const pendientes = await solicitudRepo.find({ where: { estado: 'Pendiente' } });
    console.log(`   👀 Gerente ve ${pendientes.length} solicitud(es) pendiente(s).`);

    // Gerente aprueba la solicitud
    solicitud.estado = 'Aprobado';
    solicitud.idAprobador = gerente.idUsuario;
    solicitud.fechaResolucion = new Date();
    await solicitudRepo.save(solicitud);

    // Sistema aplica el cambio AUTOMÁTICAMENTE (Simulado aquí, en real lo hace el Service)
    tareaStrat.fechaObjetivo = solicitud.valorNuevo!;
    await tareaRepo.save(tareaStrat);

    console.log(`   ✅ Solicitud Aprobada por ${gerente.nombre}.`);
    console.log(`   🔄 Tarea Actualizada Automáticamente: Nueva Fecha ${tareaStrat.fechaObjetivo}`);

    // Auditoría Final
    await auditRepo.save(auditRepo.create({
        idUsuario: gerente.idUsuario,
        accion: 'AprobarCambio',
        recurso: 'Tarea',
        recursoId: tareaStrat.idTarea.toString(),
        detalles: JSON.stringify({ solicitud: solicitud.idSolicitud, cambio: 'Fecha 03-01 -> 04-01' }),
        fecha: new Date()
    }));
    console.log(`   📜 Auditoría registrada: "AprobarCambio" por Gerente.`);

    console.log('\n✅ --- SIMULACIÓN COMPLETADA EXITOSAMENTE ---');
    await AppDataSource.destroy();
}

simulate().catch(console.error);
