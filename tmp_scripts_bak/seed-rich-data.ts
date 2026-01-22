import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Usuario, Rol, UsuarioCredenciales, OrganizacionNodo, UsuarioOrganizacion, Proyecto, Tarea, TareaAsignado, Checkin, CheckinTarea, Bloqueo } from '../entities';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    entities: [Usuario, Rol, UsuarioCredenciales, OrganizacionNodo, UsuarioOrganizacion, Proyecto, Tarea, TareaAsignado, Checkin, CheckinTarea, Bloqueo],
});

async function seedRichData() {
    try {
        await AppDataSource.initialize();
        console.log("✅ DB Connected");

        const userRepo = AppDataSource.getRepository(Usuario);
        const tareaRepo = AppDataSource.getRepository(Tarea);
        const proyectoRepo = AppDataSource.getRepository(Proyecto);
        const tareaAsignadoRepo = AppDataSource.getRepository(TareaAsignado);

        // 1. Find Gustavo and Candida
        const gustavo = await userRepo.findOne({ where: { correo: 'gustavo@claro.com.ni' } });
        const candida = await userRepo.findOne({ where: { correo: 'candida@claro.com.ni' } });

        if (!gustavo || !candida) throw new Error("Users not found. Run seed-db.ts first.");

        // 2. Find or Create Projects
        let pMigracion = await proyectoRepo.findOne({ where: { nombre: 'Migración 2025' } });
        if (!pMigracion) {
            pMigracion = await proyectoRepo.save(proyectoRepo.create({ nombre: 'Migración 2025', estado: 'Activo' }));
        }

        let pMantenimiento = await proyectoRepo.findOne({ where: { nombre: 'Mantenimiento' } });
        if (!pMantenimiento) {
            pMantenimiento = await proyectoRepo.save(proyectoRepo.create({ nombre: 'Mantenimiento', estado: 'Activo' }));
        }

        let pGeneral = await proyectoRepo.findOne({ where: { nombre: 'General' } });
        if (!pGeneral) {
            pGeneral = await proyectoRepo.save(proyectoRepo.create({ nombre: 'General', estado: 'Activo' }));
        }

        // 3. Create Tasks
        const tasksData = [
            { titulo: "Corregir bug en Login (Auth0)", proyecto: pMantenimiento, prioridad: "Alta", esfuerzo: "S", estado: "Pendiente" },
            { titulo: "Actualizar documentación de API", proyecto: pGeneral, prioridad: "Baja", esfuerzo: "M", estado: "Pendiente" },
            { titulo: "Implementar Dark Mode en Dashboard", proyecto: pMigracion, prioridad: "Media", esfuerzo: "L", estado: "Pendiente" },
            { titulo: "Revisar logs de error en producción", proyecto: pMantenimiento, prioridad: "Alta", esfuerzo: "S", estado: "Pendiente" },
            { titulo: "Refactorizar componente de Tabla", proyecto: pMigracion, prioridad: "Media", esfuerzo: "M", estado: "Pendiente" },
            { titulo: "Preparar presentación de Sprint", proyecto: pGeneral, prioridad: "Media", esfuerzo: "S", estado: "Pendiente" },
            { titulo: "Optimizar consultas SQL en Reportes", proyecto: pMigracion, prioridad: "Alta", esfuerzo: "L", estado: "Pendiente" },
            { titulo: "Investigar librería de Gráficos", proyecto: pGeneral, prioridad: "Baja", esfuerzo: "S", estado: "Pendiente" },
            // Assigned by Manager
            { titulo: "URGENTE: Arreglar pasarela de pagos", proyecto: pMantenimiento, prioridad: "Alta", esfuerzo: "M", estado: "Pendiente", asignadoPor: candida.idUsuario },
            { titulo: "Revisión de Seguridad Trimestral", proyecto: pGeneral, prioridad: "Media", esfuerzo: "L", estado: "Pendiente", asignadoPor: candida.idUsuario }
        ];

        console.log("🌱 Inserting Tasks...");

        for (const data of tasksData) {
            const t = tareaRepo.create({
                idProyecto: data.proyecto!.idProyecto,
                idCreador: gustavo.idUsuario, // Created by self usually, or manager
                titulo: data.titulo,
                prioridad: data.prioridad as any,
                esfuerzo: data.esfuerzo as any,
                estado: 'Pendiente',
                idAsignadoPor: data.asignadoPor // Optional
            });
            const saved = await tareaRepo.save(t);

            await tareaAsignadoRepo.save({
                idTarea: saved.idTarea,
                idUsuario: gustavo.idUsuario,
                tipo: 'Responsable'
            });
        }

        console.log("✅ Rich Data Seeded Successfully!");

    } catch (err) {
        console.error("Error seeding rich data:", err);
    } finally {
        await AppDataSource.destroy();
    }
}

seedRichData();
