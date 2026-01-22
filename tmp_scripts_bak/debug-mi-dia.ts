
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AuthService } from '../auth/auth.service';
import { TasksService } from '../clarity/tasks.service';
import { Usuario } from '../entities';
import { DataSource } from 'typeorm';

async function debugMiDia() {
    try {
        console.log('🔄 Iniciando diagnóstico para endpoint /mi-dia ...');
        const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });

        const authService = app.get(AuthService);
        const tasksService = app.get(TasksService);
        const dataSource = app.get(DataSource);
        const userRepo = dataSource.getRepository(Usuario);

        // 1. Simular Login para obtener Token Valido
        const email = 'gustavo.lira@claro.com.ni';
        const user = await userRepo.findOne({ where: { correo: email } });

        if (!user) {
            console.error('❌ Usuario de prueba no encontrado');
            return;
        }

        console.log(`👤 Usuario: ${user.nombre} [ID: ${user.idUsuario}]`);

        // 2. Probar lógica del servicio directamente (Bypass HTTP)
        console.log('\n🧪 [Prueba Lógica] Ejecutando TasksService.miDiaGet()...');
        try {
            const result = await tasksService.miDiaGet(user.idUsuario, '2026-01-17');
            console.log('✅ Resultado Logic Service:', JSON.stringify(result, null, 2).slice(0, 200) + '...');
        } catch (e) {
            console.error('❌ Error en TasksService:', e);
        }

        // 3. Generar curl con token real para que el usuario pruebe
        console.log('\n🔐 Generando Token JWT válido...');
        const login = await authService.login(user);
        const token = login.access_token;

        console.log('\n📋 CURL PARA PRUEBA DE CONECTIVIDAD:');
        console.log('---------------------------------------------------');
        console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/mi-dia?fecha=2026-01-17`);
        console.log('---------------------------------------------------');

        await app.close();
    } catch (e) {
        console.error('🔥 Error Crítico:', e);
    }
}

debugMiDia();
