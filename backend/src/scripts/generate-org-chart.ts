import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { Usuario, OrganizacionNodo, UsuarioOrganizacion } from '../entities';

const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    entities: [Usuario, OrganizacionNodo, UsuarioOrganizacion],
    synchronize: false,
    logging: false
});

async function generateOrgChart() {
    try {
        await AppDataSource.initialize();

        const nodes = await AppDataSource.getRepository(OrganizacionNodo).find();
        const assignments = await AppDataSource.getRepository(UsuarioOrganizacion).find({ relations: ['usuario', 'nodo'] });

        let mdContent = '# 🏢 Organigrama Funcional y Jerárquico\n\n';
        mdContent += `Generado: ${new Date().toLocaleString()}\n\n`;

        // 1. Build Tree
        const nodeMap = new Map<number, any>();
        nodes.forEach(n => nodeMap.set(n.idNodo, { ...n, children: [], staff: [] }));

        // Assign Staff to Nodes
        assignments.forEach(a => {
            const node = nodeMap.get(a.idNodo);
            if (node) {
                node.staff.push({
                    name: a.usuario.nombre,
                    email: a.usuario.correo,
                    role: a.rol,
                    userId: a.idUsuario
                });
            }
        });

        // Build Hierarchy
        const rootNodes: any[] = [];
        nodeMap.forEach(n => {
            if (n.idPadre) {
                const parent = nodeMap.get(n.idPadre);
                if (parent) parent.children.push(n);
                else rootNodes.push(n); // Orphan or root
            } else {
                rootNodes.push(n);
            }
        });

        // 2. Render Recursive
        const renderNode = (n: any, level: number) => {
            const indent = '  '.repeat(level);
            const icon = n.tipo === 'Gerencia' ? '👑' : '🛡️';

            mdContent += `${indent}- **${icon} ${n.nombre}**\n`;

            // Managers First
            const bosses = n.staff.filter((s: any) => ['Director', 'Gerente', 'Lider'].includes(s.role));
            const team = n.staff.filter((s: any) => !['Director', 'Gerente', 'Lider'].includes(s.role));

            bosses.forEach((b: any) => {
                mdContent += `${indent}  - 👤 **${b.name}** (${b.role}) - _${b.email}_\n`;
            });
            team.forEach((t: any) => {
                mdContent += `${indent}  - ⚪ ${t.name} (${t.role}) - _${t.email}_\n`;
            });

            n.children.forEach((c: any) => renderNode(c, level + 1));
        };

        rootNodes.forEach(n => renderNode(n, 0));

        // 3. User Access Table
        mdContent += '\n## 🔐 Matriz de Visibilidad (Quién ve qué)\n';
        mdContent += '| Usuario | Rol | Alcance (Nodos Visibles) |\n';
        mdContent += '|---|---|---|\n';

        // Simple heuristic for visibility
        assignments.forEach(a => {
            let scope = 'Solo sus tareas';
            if (['Director', 'Gerente'].includes(a.rol)) scope = `Todo bajo "${a.nodo.nombre}"`;
            else if (a.rol === 'Lider') scope = `Equipo "${a.nodo.nombre}"`;

            mdContent += `| ${a.usuario.nombre} | ${a.rol} | ${scope} |\n`;
        });

        fs.writeFileSync(path.resolve(__dirname, '../../../ORGANIGRAMA_RRHH.md'), mdContent);
        console.log('✅ Archivo ORGANIGRAMA_RRHH.md generado en la raíz del proyecto.');

    } catch (e) {
        console.error(e);
    } finally {
        await AppDataSource.destroy();
    }
}

generateOrgChart();
