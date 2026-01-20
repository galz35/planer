import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import { Usuario } from '../auth/entities/usuario.entity';
import { Tarea } from '../planning/entities/tarea.entity';
import { Proyecto } from '../planning/entities/proyecto.entity';

@Injectable()
export class SeedService {
    constructor(private dataSource: DataSource) { }

    async seedSystem() {
        console.log('🚀 Starting Unified System Seed (From CSV)...');

        // 1. Clean Database
        // We drop p_empleados table as requested to unify everything into p_Usuarios
        await this.dataSource.query(`DROP TABLE IF EXISTS "p_empleados" CASCADE`);

        // Truncate other tables to start fresh
        // Order matters for FK
        await this.dataSource.query(`
            TRUNCATE TABLE "p_Bloqueos", "p_CheckinTareas", "p_Checkins", 
            "p_TareaAsignados", "p_Tareas", "p_Proyectos", 
            "p_UsuariosOrganizacion", "p_OrganizacionNodos", 
            "p_UsuariosCredenciales", "p_Usuarios"
            RESTART IDENTITY CASCADE
        `);
        console.log('✅ Database cleaned & p_empleados dropped.');

        // 2. Load CSV
        const csvPath = 'd:/planificacion/rrhh.csv';
        if (!fs.existsSync(csvPath)) {
            console.error('❌ CSV file not found at:', csvPath);
            return { success: false, message: 'CSV not found' };
        }

        const fileContent = fs.readFileSync(csvPath, { encoding: 'latin1' });
        const lines = fileContent.split(/\r?\n/);
        const headers = lines[0].split(';');

        // Helper to get value by header name
        const getValue = (row: string[], headerName: string): string => {
            const index = headers.findIndex(h => h.trim() === headerName);
            return index >= 0 && row[index] ? row[index].trim() : '';
        };

        const parseDate = (dateStr: string): Date | null => {
            if (!dateStr) return null;
            // Expected format: d/M/yyyy (e.g., 7/10/2013)
            const parts = dateStr.split('/');
            if (parts.length === 3) {
                const d = parseInt(parts[0]);
                const m = parseInt(parts[1]) - 1; // Month is 0-indexed
                const y = parseInt(parts[2]);
                return new Date(y, m, d);
            }
            return null;
        };

        const repoUsuario = this.dataSource.getRepository(Usuario);
        const defaultHash = await bcrypt.hash('password123', 10);

        let processedCount = 0;
        let createdCount = 0;

        // 3. Process Rows
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;

            const row = line.split(';');

            // Extract fields
            const correo = getValue(row, 'correo');
            const carnet = getValue(row, 'carnet');
            const nombre = getValue(row, 'nombre_completo');

            if (!correo || !carnet) {
                console.warn(`Skipping line ${i}: Missing correo or carnet`);
                continue; // Validate keys
            }

            // Map fields to Entity
            const userData = {
                correo: correo.toLowerCase(),
                carnet: carnet,
                nombre: nombre, // Display name
                nombreCompleto: nombre, // Full name
                cargo: getValue(row, 'cargo'),
                departamento: getValue(row, 'Departamento'),
                orgDepartamento: getValue(row, 'oDEPARTAMENTO'),
                orgGerencia: getValue(row, 'OGERENCIA'),
                idOrg: getValue(row, 'idorg'),
                jefeCarnet: getValue(row, 'carnet_jefe1'),
                jefeNombre: getValue(row, 'nom_jefe1'),
                jefeCorreo: getValue(row, 'correo_jefe1'),
                fechaIngreso: parseDate(getValue(row, 'fechaingreso')),
                genero: getValue(row, 'Gender'),
                username: getValue(row, 'UserNam'),
                pais: getValue(row, 'pais') || 'NI',
                activo: true, // Assuming active based on file presence
                rolGlobal: 'Empleado',
                passwordHash: defaultHash // Special handling for credentials
            };

            // Check if user exists (by carnet or correo)
            let existing = await repoUsuario.findOne({ where: [{ carnet: userData.carnet }, { correo: userData.correo }] });

            let savedUser;
            if (existing) {
                // Update
                repoUsuario.merge(existing, userData);
                savedUser = await repoUsuario.save(existing);
            } else {
                // Create
                const newUser = repoUsuario.create(userData);
                savedUser = await repoUsuario.save(newUser);
                createdCount++;

                // Add Creds
                await this.dataSource.query(`
                    INSERT INTO "p_UsuariosCredenciales" ("idUsuario", "passwordHash") 
                    VALUES ($1, $2)
                `, [savedUser.idUsuario, defaultHash]);
            }
            processedCount++;
        }

        console.log(`✅ Seed Completed. Processed: ${processedCount}, Created: ${createdCount}`);
        return { success: true, processed: processedCount, created: createdCount };
    }
}
