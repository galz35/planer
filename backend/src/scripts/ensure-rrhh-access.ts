
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';

dotenv.config();

// Configuración de conexión segura a Supabase
const ds = new DataSource({
    type: 'postgres', // Forzamos postgres ya que es lo que usa Supabase
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: true,
    extra: {
        ssl: {
            rejectUnauthorized: false
        }
    },
    connectTimeoutMS: 60000,
});

async function main() {
    console.log('🔌 Conectando a Supabase...');
    await ds.initialize();
    console.log('✅ Conectado.');

    const passHash = await bcrypt.hash('123456', 10);

    // Leer archivo CSV
    const csvPath = 'd:\\planificacion\\rrhh.csv';
    console.log(`📂 Leyendo archivo: ${csvPath}`);

    if (!fs.existsSync(csvPath)) {
        console.error('❌ El archivo rrhh.csv no existe en la ruta especificada.');
        process.exit(1);
    }

    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = fileContent.split('\n');
    let procesados = 0;
    let errores = 0;

    // Ignorar cabecera (línea 0)
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Parseo básico de CSV (asumiendo que no hay comas DENTRO de los campos clave o están entre comillas)
        // Usamos una regex simple para separar por comas ignorando las que están entre comillas
        const cols = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');

        // Limpiar comillas
        const clean = (val) => val ? val.replace(/^"|"$/g, '').trim() : '';

        // Mapeo basado en análisis previo del CSV
        // idhcm,Idhrms,idhcm2,LVL,userlvl,carnet,carnet2,nombre,correo,...
        // Indices aproximados si se hace split simple, pero con regex puede variar.
        // Vamos a usar split por coma simple y tratar de reconstruir si hay error, 
        // pero el archivo parecía tener campos entre comillas "Santo Domingo, Casa..." que desplazan índices.

        // MEJOR ESTRATEGIA: Usar la posición exacta de las columnas clave observadas en el `head`
        // Carnet está cerca del inicio. Correo tiene @. Nombre está en mayúsculas antes del correo.

        const rawLine = lines[i];
        const partes = rawLine.split(',');

        // Buscamos el correo (tiene @)
        const emailIndex = partes.findIndex(p => p.includes('@claro.com.ni'));

        if (emailIndex === -1) {
            console.log(`⚠️ Línea ${i}: No se encontró correo claro.com.ni. Saltando.`);
            continue;
        }

        const correo = clean(partes[emailIndex]);
        // Nombre suele estar antes del correo
        const nombre = clean(partes[emailIndex - 1]);
        // Cargo suele estar después del correo
        const cargo = clean(partes[emailIndex + 1]);
        // Carnet suele estar en indice 5 (sexta columna)
        const carnet = clean(partes[5]);

        if (!correo || !nombre) {
            console.log(`⚠️ Línea ${i}: Datos incompletos. Correo: ${correo}, Nombre: ${nombre}`);
            continue;
        }

        // Determinar Rol ID
        let idRol = 2; // Default User/Manager
        // Si es Gustavo -> Admin
        if (correo.includes('gustavo.lira')) idRol = 1;

        // Verificar existencia en BD
        try {
            console.log(`\n👤 Procesando [${i}/${lines.length}]: ${nombre} (${correo})`);

            let userDB = await ds.query('SELECT "idUsuario" FROM "p_Usuarios" WHERE correo = $1', [correo]);
            let userId = null;

            if (userDB.length === 0) {
                const insertResult = await ds.query(
                    `INSERT INTO "p_Usuarios" (nombre, correo, carnet, "idRol", activo, "fechaCreacion") 
                     VALUES ($1, $2, $3, $4, true, NOW()) RETURNING "idUsuario"`,
                    [nombre, correo, carnet, idRol]
                );
                userId = insertResult[0].idUsuario;
                console.log(`   ✅ Creado (ID: ${userId})`);
            } else {
                userId = userDB[0].idUsuario;
                console.log(`   🔹 Ya existe. Actualizando rol...`);
                await ds.query('UPDATE "p_Usuarios" SET "idRol" = $1 WHERE "idUsuario" = $2', [idRol, userId]);
            }

            // Credenciales
            const creds = await ds.query('SELECT "idCredencial" FROM "p_UsuariosCredenciales" WHERE "idUsuario" = $1', [userId]);
            if (creds.length === 0) {
                await ds.query(
                    `INSERT INTO "p_UsuariosCredenciales" ("idUsuario", "passwordHash") VALUES ($1, $2)`,
                    [userId, passHash]
                );
                console.log('   🔑 Credenciales generadas');
            } else {
                await ds.query(
                    `UPDATE "p_UsuariosCredenciales" SET "passwordHash" = $1 WHERE "idUsuario" = $2`,
                    [passHash, userId]
                );
                console.log('   🔑 Contraseña reseteada');
            }
            procesados++;

        } catch (e) {
            console.error(`❌ Error con usuario ${correo}:`, e.message);
            errores++;
        }
    }

    console.log(`\n✨ Finalizado. Procesados: ${procesados}, Errores: ${errores}`);
    await ds.destroy();
}

main().catch(console.error);
