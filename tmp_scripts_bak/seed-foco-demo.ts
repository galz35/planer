/**
 * Script para crear datos de prueba del sistema de Foco/Agenda
 * Incluye: tareas terminadas, pendientes arrastradas, bloqueos, y tareas actuales
 * 
 * Ejecutar: npx ts-node src/scripts/seed-foco-demo.ts
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import {
    Usuario, Tarea, FocoDiario, Bloqueo, Proyecto, TareaAsignado,
    Rol, OrganizacionNodo, UsuarioOrganizacion, UsuarioCredenciales, UsuarioConfig,
    TareaAvance, Checkin, CheckinTarea, Nota, LogSistema, AuditLog
} from '../entities';

// Cargar dotenv
import * as dotenv from 'dotenv';
dotenv.config();

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'planificacion',
    entities: [
        Usuario, Tarea, FocoDiario, Bloqueo, Proyecto, TareaAsignado,
        Rol, OrganizacionNodo, UsuarioOrganizacion, UsuarioCredenciales, UsuarioConfig,
        TareaAvance, Checkin, CheckinTarea, Nota, LogSistema, AuditLog
    ],
    synchronize: true,
    logging: false,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

function getDate(daysAgo: number): string {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
}

async function seed() {
    await AppDataSource.initialize();
    console.log('🔌 Conectado a la base de datos');

    const usuarioRepo = AppDataSource.getRepository(Usuario);
    const tareaRepo = AppDataSource.getRepository(Tarea);
    const focoRepo = AppDataSource.getRepository(FocoDiario);
    const bloqueoRepo = AppDataSource.getRepository(Bloqueo);
    const proyectoRepo = AppDataSource.getRepository(Proyecto);
    const asignadoRepo = AppDataSource.getRepository(TareaAsignado);

    // Buscar usuario de prueba (gustavo o cualquier usuario activo)
    let usuario = await usuarioRepo.findOne({ where: { correo: 'gustavo@claro.com.ni' } });
    if (!usuario) {
        // Buscar cualquier usuario activo
        usuario = await usuarioRepo.findOne({ where: { activo: true } });
    }
    if (!usuario) {
        console.log('❌ No hay usuarios activos en la base de datos');
        return;
    }
    console.log(`👤 Usuario: ${usuario.nombre} (ID: ${usuario.idUsuario})`);

    // Buscar o crear proyecto de prueba
    let proyecto = await proyectoRepo.findOne({ where: { nombre: 'Demo Agenda' } });
    if (!proyecto) {
        proyecto = await proyectoRepo.save({
            nombre: 'Demo Agenda',
            descripcion: 'Proyecto de demostración para el sistema de Foco/Agenda',
            estado: 'Activo'
        });
        console.log('📁 Proyecto creado: Demo Agenda');
    }

    const hoy = getDate(0);
    const ayer = getDate(1);
    const hace3Dias = getDate(3);
    const hace5Dias = getDate(5);

    console.log('\n📅 Fechas de referencia:');
    console.log(`   Hoy: ${hoy}`);
    console.log(`   Ayer: ${ayer}`);
    console.log(`   Hace 3 días: ${hace3Dias}`);
    console.log(`   Hace 5 días: ${hace5Dias}`);

    // --- CREAR TAREAS DE PRUEBA ---
    console.log('\n📝 Creando tareas de prueba...');

    // 1. Tarea completada ayer
    const tareaCompletadaAyer = await tareaRepo.save({
        titulo: 'Revisar presupuesto Q1',
        descripcion: 'Revisar y aprobar presupuesto del primer trimestre',
        estado: 'Hecha',
        prioridad: 'Alta',
        fechaObjetivo: ayer,
        fechaHecha: new Date(ayer),
        idCreador: usuario.idUsuario,
        idProyecto: proyecto.idProyecto
    });
    await asignadoRepo.save({ idTarea: tareaCompletadaAyer.idTarea, idUsuario: usuario.idUsuario, tipo: 'Responsable' });

    // 2. Tarea arrastrada desde hace 3 días (aún pendiente)
    const tareaArrastrada3Dias = await tareaRepo.save({
        titulo: 'Preparar presentación ejecutiva',
        descripcion: 'Crear slides para la junta directiva',
        estado: 'EnCurso',
        prioridad: 'Alta',
        fechaObjetivo: hace3Dias,
        idCreador: usuario.idUsuario,
        idProyecto: proyecto.idProyecto
    });
    await asignadoRepo.save({ idTarea: tareaArrastrada3Dias.idTarea, idUsuario: usuario.idUsuario, tipo: 'Responsable' });

    // 3. Tarea arrastrada desde hace 5 días - OBJETIVO ESTRATÉGICO
    const tareaEstrategica5Dias = await tareaRepo.save({
        titulo: 'Cerrar negociación con cliente principal',
        descripcion: 'Objetivo estratégico del mes',
        estado: 'EnCurso',
        prioridad: 'Alta',
        fechaObjetivo: hace5Dias,
        idCreador: usuario.idUsuario,
        idProyecto: proyecto.idProyecto
    });
    await asignadoRepo.save({ idTarea: tareaEstrategica5Dias.idTarea, idUsuario: usuario.idUsuario, tipo: 'Responsable' });

    // 4. Tarea bloqueada desde ayer
    const tareaBloqueada = await tareaRepo.save({
        titulo: 'Actualizar sistema de inventario',
        descripcion: 'Requiere acceso a servidor',
        estado: 'Bloqueada',
        prioridad: 'Media',
        fechaObjetivo: ayer,
        idCreador: usuario.idUsuario,
        idProyecto: proyecto.idProyecto
    });
    await asignadoRepo.save({ idTarea: tareaBloqueada.idTarea, idUsuario: usuario.idUsuario, tipo: 'Responsable' });

    // 5. Tareas nuevas de hoy
    const tareaHoy1 = await tareaRepo.save({
        titulo: 'Reunión de seguimiento semanal',
        descripcion: 'Revisar avances con el equipo',
        estado: 'Pendiente',
        prioridad: 'Media',
        fechaObjetivo: hoy,
        idCreador: usuario.idUsuario,
        idProyecto: proyecto.idProyecto
    });
    await asignadoRepo.save({ idTarea: tareaHoy1.idTarea, idUsuario: usuario.idUsuario, tipo: 'Responsable' });

    const tareaHoy2 = await tareaRepo.save({
        titulo: 'Revisar correos pendientes',
        descripcion: 'Inbox zero',
        estado: 'Pendiente',
        prioridad: 'Baja',
        fechaObjetivo: hoy,
        idCreador: usuario.idUsuario,
        idProyecto: proyecto.idProyecto
    });
    await asignadoRepo.save({ idTarea: tareaHoy2.idTarea, idUsuario: usuario.idUsuario, tipo: 'Responsable' });

    console.log('   ✅ Tarea completada ayer: "Revisar presupuesto Q1"');
    console.log('   ⏳ Tarea arrastrada 3 días: "Preparar presentación ejecutiva"');
    console.log('   ★ Objetivo estratégico 5 días: "Cerrar negociación con cliente"');
    console.log('   🔴 Tarea bloqueada: "Actualizar sistema de inventario"');
    console.log('   📌 Tareas de hoy: 2 nuevas');

    // --- CREAR FOCOS (AGENDA) ---
    console.log('\n📌 Creando registros de Foco/Agenda...');

    // Foco completado ayer
    await focoRepo.save({
        idUsuario: usuario.idUsuario,
        idTarea: tareaCompletadaAyer.idTarea,
        fecha: ayer,
        esEstrategico: false,
        fechaPrimerFoco: ayer,
        diasArrastre: 1,
        orden: 1,
        completadoEnFecha: ayer
    });

    // Foco arrastrado 3 días (aparecerá hoy con "Día 4")
    await focoRepo.save({
        idUsuario: usuario.idUsuario,
        idTarea: tareaArrastrada3Dias.idTarea,
        fecha: hace3Dias,
        esEstrategico: false,
        fechaPrimerFoco: hace3Dias,
        diasArrastre: 1,
        orden: 1,
        completadoEnFecha: undefined
    });

    // Objetivo estratégico arrastrado 5 días
    await focoRepo.save({
        idUsuario: usuario.idUsuario,
        idTarea: tareaEstrategica5Dias.idTarea,
        fecha: hace5Dias,
        esEstrategico: true,
        fechaPrimerFoco: hace5Dias,
        diasArrastre: 1,
        orden: 1,
        completadoEnFecha: undefined
    });

    // Tarea bloqueada en foco de ayer
    await focoRepo.save({
        idUsuario: usuario.idUsuario,
        idTarea: tareaBloqueada.idTarea,
        fecha: ayer,
        esEstrategico: false,
        fechaPrimerFoco: ayer,
        diasArrastre: 1,
        orden: 2,
        completadoEnFecha: undefined
    });

    console.log('   ✅ Foco completado ayer');
    console.log('   ⏳ Foco arrastrado desde hace 3 días');
    console.log('   ★ Objetivo estratégico desde hace 5 días');
    console.log('   🔴 Foco bloqueado desde ayer');

    // --- CREAR BLOQUEO ---
    console.log('\n🔴 Creando bloqueo de prueba...');

    await bloqueoRepo.save({
        idTarea: tareaBloqueada.idTarea,
        idOrigenUsuario: usuario.idUsuario,
        destinoTexto: 'Sistemas TI',
        motivo: 'Esperando credenciales de acceso al servidor de producción',
        accionMitigacion: 'Preparando documentación mientras tanto',
        estado: 'Activo',
        fechaCreacion: new Date(ayer)
    });

    console.log('   ✅ Bloqueo creado: "Esperando credenciales de TI"');

    console.log('\n🎉 ¡Datos de demo creados exitosamente!');
    console.log('\n📊 RESUMEN:');
    console.log('   • 1 tarea COMPLETADA ayer');
    console.log('   • 1 tarea ARRASTRADA 3 días');
    console.log('   • 1 objetivo ESTRATÉGICO arrastrado 5 días');
    console.log('   • 1 tarea BLOQUEADA desde ayer');
    console.log('   • 2 tareas NUEVAS para hoy');
    console.log('   • 1 BLOQUEO activo');
    console.log('\n💡 Ahora recarga la página Mi Agenda para ver los datos.');

    await AppDataSource.destroy();
}

seed().catch(e => {
    console.error('❌ Error:', e.message || e);
    console.error(e.stack || e);
    process.exit(1);
});
