import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Usuario } from '../entities';
import { DataSource } from 'typeorm';

async function bootstrap() {
    console.log('🌍 Iniciando migración de países basada en dominio de correo...');

    const app = await NestFactory.createApplicationContext(AppModule);
    const dataSource = app.get(DataSource);
    const usuarioRepo = dataSource.getRepository(Usuario);

    const usuarios = await usuarioRepo.find();
    console.log(`📊 Total de usuarios encontrados: ${usuarios.length}`);

    let actualizados = 0;
    let nicaragua = 0;
    let honduras = 0;
    let salvador = 0;
    let costaRica = 0;
    let guatemala = 0;
    let desconocidos = 0;

    for (const u of usuarios) {
        let nuevoPais = 'NI'; // Default
        const email = u.correo.toLowerCase();

        if (email.endsWith('.ni') || email.includes('.com.ni')) {
            nuevoPais = 'NI';
            nicaragua++;
        } else if (email.endsWith('.hn') || email.includes('.com.hn')) {
            nuevoPais = 'HN';
            honduras++;
        } else if (email.endsWith('.sv') || email.includes('.com.sv')) {
            nuevoPais = 'SV';
            salvador++;
        } else if (email.endsWith('.cr') || email.includes('.co.cr') || email.includes('.cr')) {
            nuevoPais = 'CR';
            costaRica++;
        } else if (email.endsWith('.gt') || email.includes('.com.gt')) {
            nuevoPais = 'GT';
            guatemala++;
        } else {
            // Fallback para correos genéricos (.com) -> Asumir NI o dejar como estaba
            console.warn(`⚠️ Dominio desconocido para ${u.correo}. Asignando NI por defecto.`);
            nuevoPais = 'NI';
            desconocidos++;
        }

        // Solo actualizar si estaba vacío o es diferente (ahora siempre actualizamos porque es nuevo campo)
        u.pais = nuevoPais;
        await usuarioRepo.save(u);
        actualizados++;
        process.stdout.write('.');
    }

    console.log('\n\n✅ Migración COMPLETADA.');
    console.table({
        'Nicaragua (NI)': nicaragua,
        'Honduras (HN)': honduras,
        'El Salvador (SV)': salvador,
        'Costa Rica (CR)': costaRica,
        'Guatemala (GT)': guatemala,
        'Desconocidos (NI default)': desconocidos,
        'Total Procesados': actualizados
    });

    await app.close();
}

bootstrap();
