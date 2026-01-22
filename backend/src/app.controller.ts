import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

// NOTA: Endpoints de seed/test deshabilitados temporalmente durante migración MSSQL
// Usaban sintaxis PostgreSQL ($1, $2...) incompatible con SQL Server

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('reset-passwords')
  async resetPasswords() {
    return {
      message: 'Endpoint deshabilitado durante migración. Usar SSMS para reset manual.',
      sql: "UPDATE p_UsuariosCredenciales SET passwordHash = '<bcrypt_hash>' WHERE 1=1"
    };
  }

  @Get('seed-test-tasks')
  async seedTestTasks() {
    return { message: 'Seed endpoints deshabilitados. Usar scripts SQL directamente.' };
  }

  @Get('seed-completed-tasks')
  async seedCompletedTasks() {
    return { message: 'Seed endpoints deshabilitados. Usar scripts SQL directamente.' };
  }

  @Get('seed-all-states')
  async seedAllStates() {
    return { message: 'Seed endpoints deshabilitados. Usar scripts SQL directamente.' };
  }

  @Get('rrhh-users')
  async getRRHH() {
    return { message: 'Endpoint legacy deshabilitado.' };
  }
}
