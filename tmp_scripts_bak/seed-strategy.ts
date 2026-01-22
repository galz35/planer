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

async function main() {
    await AppDataSource.initialize();
    console.log('Base de datos conectada.');

    const proyectoRepo = AppDataSource.getRepository(Proyecto);

    // Buscar si existe un proyecto para convertir a Estratégico
    let proyecto = await proyectoRepo.findOne({ where: { nombre: 'Implementación ISO 27001' } });

    if (!proyecto) {
        console.log('Creando proyecto de prueba Estratégico...');
        // Crear uno nuevo si no existe
        proyecto = proyectoRepo.create({
            nombre: 'Implementación ISO 27001',
            descripcion: 'Proyecto estratégico de seguridad',
            estado: 'Activo',
            tipo: 'Estrategico', // Nuevo campo
            requiereAprobacion: true // Nuevo campo
        });
        // Asignar un nodo dueño arbitrario si es necesario (el primero que encuentre)
        const nodo = await AppDataSource.getRepository(OrganizacionNodo).findOne({ where: {} });
        if (nodo) proyecto.nodoDuenio = nodo;

        await proyectoRepo.save(proyecto);
    } else {
        console.log('Actualizando proyecto existente a Estratégico...');
        proyecto.tipo = 'Estrategico';
        proyecto.requiereAprobacion = true;
        await proyectoRepo.save(proyecto);
    }

    console.log(`✅ Proyecto "${proyecto.nombre}" (ID: ${proyecto.idProyecto}) marcado como ESTRATÉGICO.`);

    // Crear un proyecto Operativo también
    let pOperativo = await proyectoRepo.findOne({ where: { nombre: 'Mantenimiento Preventivo Q1' } });
    if (!pOperativo) {
        pOperativo = proyectoRepo.create({
            nombre: 'Mantenimiento Preventivo Q1',
            descripcion: 'Tareas rutinarias',
            estado: 'Activo',
            tipo: 'Operativo',
            requiereAprobacion: false
        });
        const nodo = await AppDataSource.getRepository(OrganizacionNodo).findOne({ where: {} });
        if (nodo) pOperativo.nodoDuenio = nodo;
        await proyectoRepo.save(pOperativo);
        console.log(`✅ Proyecto Operativo creado.`);
    }

    await AppDataSource.destroy();
}

main().catch(console.error);
