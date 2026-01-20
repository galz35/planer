import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './auth/entities/usuario.entity';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectRepository(Usuario) private userRepo: Repository<Usuario>
  ) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('reset-passwords')
  async resetPasswords() {
    try {
      const hash = await bcrypt.hash('123456', 10);
      // Actualizar hash en tabla de credenciales
      await this.userRepo.query('UPDATE "p_UsuariosCredenciales" SET "passwordHash" = $1', [hash]);
      return { success: true, message: "Todas las contraseñas reseteadas a '123456' (10 rounds bcrypt)" };
    } catch (e) {
      return { error: e.message };
    }
  }

  @Get('rrhh-users')
  async getRRHH() {
    try {
      // Buscar usuarios en nodos que suenen a Recursos Humanos
      const query = `
            SELECT u."idUsuario", u.nombre, u.correo, n.nombre as area, uo.rol
            FROM "p_Usuarios" u
            JOIN "p_UsuariosOrganizacion" uo ON u."idUsuario" = uo."idUsuario"
            JOIN "p_OrganizacionNodos" n ON uo."idNodo" = n."idNodo"
            WHERE n.nombre ILIKE '%Humanos%' OR n.nombre ILIKE '%RRHH%' OR n.nombre ILIKE '%Talento%'
            LIMIT 20
        `;
      return await this.userRepo.query(query);
    } catch (e) {
      return { error: e.message };
    }
  }

  @Get('seed-test-tasks')
  async seedTestTasks() {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];

      // Usuario Tania (ID 155) - de RRHH
      const userId = 155;

      // Insertar tareas de prueba con fecha de ayer
      const tasks = [
        { titulo: 'Revisar CVs candidatos Senior', prioridad: 'Alta', fechaObjetivo: yesterdayStr },
        { titulo: 'Llamar a proveedor de capacitación', prioridad: 'Media', fechaObjetivo: yesterdayStr },
        { titulo: 'Actualizar manual de onboarding', prioridad: 'Baja', fechaObjetivo: twoDaysAgoStr },
        { titulo: 'Entrevista técnica pendiente', prioridad: 'Alta', fechaObjetivo: twoDaysAgoStr },
      ];

      for (const t of tasks) {
        await this.userRepo.query(`
          INSERT INTO "p_Tareas" (titulo, prioridad, estado, esfuerzo, "fechaObjetivo", "idCreador", progreso, orden)
          VALUES ($1, $2, 'Pendiente', 'M', $3, $4, 0, 0)
        `, [t.titulo, t.prioridad, t.fechaObjetivo, userId]);
      }

      // También crear una tarea asignada a Tania
      await this.userRepo.query(`
        INSERT INTO "p_TareaAsignados" ("idTarea", "idUsuario", tipo)
        SELECT t."idTarea", $1, 'Responsable'
        FROM "p_Tareas" t
        WHERE t."idCreador" = $1 AND t.estado = 'Pendiente'
        AND NOT EXISTS (SELECT 1 FROM "p_TareaAsignados" ta WHERE ta."idTarea" = t."idTarea" AND ta."idUsuario" = $1)
      `, [userId]);

      return { success: true, message: `Creadas ${tasks.length} tareas de prueba para usuario ${userId} con fechas de ayer y anteayer.` };
    } catch (e) {
      return { error: e.message };
    }
  }

  @Get('seed-completed-tasks')
  async seedCompletedTasks() {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const userId = 155; // Tania

      // Tareas COMPLETADAS ayer
      const completedTasks = [
        { titulo: 'Enviar reporte semanal RRHH', prioridad: 'Alta' },
        { titulo: 'Reunión con gerencia', prioridad: 'Media' },
        { titulo: 'Aprobar vacaciones equipo', prioridad: 'Baja' },
      ];

      for (const t of completedTasks) {
        await this.userRepo.query(`
          INSERT INTO "p_Tareas" (titulo, prioridad, estado, esfuerzo, "fechaObjetivo", "fechaHecha", "idCreador", progreso, orden)
          VALUES ($1, $2, 'Hecha', 'M', $3, $4, $5, 100, 0)
        `, [t.titulo, t.prioridad, yesterdayStr, yesterday, userId]);
      }

      // Asignar tareas
      await this.userRepo.query(`
        INSERT INTO "p_TareaAsignados" ("idTarea", "idUsuario", tipo)
        SELECT t."idTarea", $1, 'Responsable'
        FROM "p_Tareas" t
        WHERE t."idCreador" = $1
        AND NOT EXISTS (SELECT 1 FROM "p_TareaAsignados" ta WHERE ta."idTarea" = t."idTarea" AND ta."idUsuario" = $1)
      `, [userId]);

      return { success: true, message: `Creadas ${completedTasks.length} tareas COMPLETADAS de ayer.` };
    } catch (e) {
      return { error: e.message };
    }
  }

  @Get('seed-all-states')
  async seedAllStates() {
    try {
      const userId = 155; // Tania
      const today = new Date();

      const getDate = (daysAgo: number) => {
        const d = new Date(today);
        d.setDate(d.getDate() - daysAgo);
        return d.toISOString().split('T')[0];
      };

      // Limpiar tareas de prueba anteriores de Tania
      await this.userRepo.query(`DELETE FROM "p_Tareas" WHERE "idCreador" = $1 AND titulo LIKE '[TEST]%'`, [userId]);

      const tasks = [
        // HOY
        { titulo: '[TEST] Revisar presupuesto Q1', prioridad: 'Alta', estado: 'EnCurso', fecha: getDate(0) },
        { titulo: '[TEST] Preparar presentación directivos', prioridad: 'Alta', estado: 'Pendiente', fecha: getDate(0) },

        // AYER - Mezclado
        { titulo: '[TEST] Entrevista candidato Python', prioridad: 'Alta', estado: 'Hecha', fecha: getDate(1) },
        { titulo: '[TEST] Actualizar manual empleados', prioridad: 'Media', estado: 'Hecha', fecha: getDate(1) },
        { titulo: '[TEST] Llamar proveedor uniforms', prioridad: 'Baja', estado: 'Pendiente', fecha: getDate(1) },
        { titulo: '[TEST] Revisar evaluaciones', prioridad: 'Alta', estado: 'Bloqueada', fecha: getDate(1) },

        // HACE 2 DÍAS
        { titulo: '[TEST] Capacitación seguridad industrial', prioridad: 'Alta', estado: 'Hecha', fecha: getDate(2) },
        { titulo: '[TEST] Enviar contratos firmados', prioridad: 'Media', estado: 'Pendiente', fecha: getDate(2) },
        { titulo: '[TEST] Coordinar evento team building', prioridad: 'Baja', estado: 'EnCurso', fecha: getDate(2) },

        // HACE 3 DÍAS
        { titulo: '[TEST] Procesar nómina quincenal', prioridad: 'Alta', estado: 'Hecha', fecha: getDate(3) },
        { titulo: '[TEST] Archivar expedientes 2025', prioridad: 'Baja', estado: 'Hecha', fecha: getDate(3) },
        { titulo: '[TEST] Solicitar accesos sistema ERP', prioridad: 'Media', estado: 'Bloqueada', fecha: getDate(3) },

        // HACE 4 DÍAS
        { titulo: '[TEST] Reunión con sindicato', prioridad: 'Alta', estado: 'Hecha', fecha: getDate(4) },
        { titulo: '[TEST] Revisar políticas WFH', prioridad: 'Media', estado: 'Pendiente', fecha: getDate(4) },

        // HACE 5 DÍAS
        { titulo: '[TEST] Onboarding nuevo gerente', prioridad: 'Alta', estado: 'Hecha', fecha: getDate(5) },
        { titulo: '[TEST] Actualizar organigrama', prioridad: 'Baja', estado: 'Hecha', fecha: getDate(5) },
      ];

      for (const t of tasks) {
        const progreso = t.estado === 'Hecha' ? 100 : t.estado === 'EnCurso' ? 50 : 0;
        const fechaHecha = t.estado === 'Hecha' ? t.fecha : null;

        await this.userRepo.query(`
          INSERT INTO "p_Tareas" (titulo, prioridad, estado, esfuerzo, "fechaObjetivo", "fechaHecha", "idCreador", progreso, orden)
          VALUES ($1, $2, $3, 'M', $4, $5, $6, $7, 0)
        `, [t.titulo, t.prioridad, t.estado, t.fecha, fechaHecha, userId, progreso]);
      }

      // Crear bloqueo de prueba
      const bloqueadaId = await this.userRepo.query(`SELECT "idTarea" FROM "p_Tareas" WHERE titulo LIKE '%Revisar evaluaciones%' LIMIT 1`);
      if (bloqueadaId.length > 0) {
        await this.userRepo.query(`
          INSERT INTO "p_Bloqueos" ("idTarea", "idOrigenUsuario", motivo, "destinoTexto", estado)
          VALUES ($1, $2, 'Esperando datos de Gerencia Comercial', 'Gerencia Comercial', 'Activo')
          ON CONFLICT DO NOTHING
        `, [bloqueadaId[0].idTarea, userId]);
      }

      // Asignar todas las tareas a Tania
      await this.userRepo.query(`
        INSERT INTO "p_TareaAsignados" ("idTarea", "idUsuario", tipo)
        SELECT t."idTarea", $1, 'Responsable'
        FROM "p_Tareas" t
        WHERE t."idCreador" = $1
        AND NOT EXISTS (SELECT 1 FROM "p_TareaAsignados" ta WHERE ta."idTarea" = t."idTarea" AND ta."idUsuario" = $1)
      `, [userId]);

      return {
        success: true,
        message: `Seed completo: ${tasks.length} tareas en todos los estados (Hecha, Pendiente, EnCurso, Bloqueada) para los últimos 5 días.`
      };
    } catch (e) {
      return { error: e.message };
    }
  }
}
