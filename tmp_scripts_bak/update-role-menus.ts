
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

dotenv.config();

const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
});

// DEFINICIÓN DE MENÚS BASE

const MENU_BASE = [
    {
        group: 'Mi Espacio',
        items: [
            { path: '/app/hoy', label: 'Mi Agenda', icon: 'Sun' },
            { path: '/app/pendientes', label: 'Mis Tareas', icon: 'CheckSquare' },
            { path: '/app/notas', label: 'Mis Notas', icon: 'FileText' },
        ]
    },
    {
        group: 'Planificación',
        items: [
            { path: '/app/planning/plan-trabajo', label: 'Plan de Trabajo', icon: 'FileCheck' },
        ]
    },
    {
        group: 'Historial',
        items: [
            { path: '/app/archivo', label: 'Archivo Tareas', icon: 'Archive' },
        ]
    },
    {
        group: 'Ayuda',
        items: [
            { path: '/app/help', label: 'Tutorial Interactivo', icon: 'BookOpen' },
        ]
    }
];

const MENU_GESTION = [
    ...MENU_BASE, // Incluye lo base
    {
        group: 'Gestión Equipo',
        items: [
            { path: '/app/equipo', label: 'Dashboard', icon: 'LayoutDashboard' },
            { path: '/app/equipo/mi-equipo', label: 'Mi Equipo', icon: 'Eye' },
            { path: '/app/equipo/bloqueos', label: 'Bloqueos y Riesgos', icon: 'Shield' },
        ]
    },
    {
        group: 'Planificación',
        items: [
            { path: '/app/planning/carga', label: 'Carga Laboral', icon: 'BarChart' },
            { path: '/app/planning/plan-trabajo', label: 'Plan de Trabajo', icon: 'FileCheck' },
            // Aprobaciones solo para gestión
            { path: '/app/planning/approvals', label: 'Aprobaciones', icon: 'FileCheck' },
        ]
    }
];

// Arreglar duplicados en Planificacion al hacer el spread
// (Unimos los items de planificación para no tener dos grupos iguales)
const mergePlanificacion = (menu: any[]) => {
    const planGroupIndex = menu.findIndex(g => g.group === 'Planificación');
    const newItems = [
        { path: '/app/planning/carga', label: 'Carga Laboral', icon: 'BarChart' },
        { path: '/app/planning/plan-trabajo', label: 'Plan de Trabajo', icon: 'FileCheck' },
        { path: '/app/planning/approvals', label: 'Aprobaciones', icon: 'FileCheck' },
    ];
    menu[planGroupIndex].items = newItems;
    return menu;
};


const MENU_ADMIN = [
    ...MENU_GESTION,
    {
        group: 'Inteligencia',
        items: [
            { path: '/app/reports', label: 'Centro de Reportes', icon: 'PieChart' },
        ]
    },
    {
        group: 'Administración',
        items: [
            { path: '/app/admin/users', label: 'Usuarios', icon: 'Users' },
            { path: '/app/admin/roles', label: 'Roles y Permisos', icon: 'Shield' },
            { path: '/app/admin/permisos', label: 'Control de Acceso', icon: 'KeyRound' },
            { path: '/app/admin/visibilidad', label: 'Visibilidad', icon: 'Eye' },
            { path: '/app/admin/audit', label: 'Auditar Acciones', icon: 'ShieldCheck' },
            { path: '/app/admin/import', label: 'Importar Datos', icon: 'Database' },
            { path: '/app/admin/logs', label: 'Monitor Sistema', icon: 'Terminal' }
        ]
    }
];

async function main() {
    await ds.initialize();

    console.log('Actualizando Menús por Defecto...');

    // 1. ADMIN (Rol 1)
    // Usamos mergePlanificacion en MENU_GESTION antes de expandirlo a ADMIN para asegurar correctitud
    // Pero en este script simple, redefinamos mejor para evitar líos de JS arrays

    // Simplificación: Construir explícitamente sin spread complejo

    // --- EMPLEADO / COLABORADOR (Roles 4 y 5) ---
    // Solo Agenda, Tareas, Notas, Plan Trabajo, Archivo, Ayuda
    const menuEmpleado = JSON.stringify(MENU_BASE);

    // --- COORDINADOR (Rol 3) y GERENTE (Rol 2) ---
    // Añade Gestión Equipo y Carga/Aprobaciones
    const menuGerencia = JSON.stringify([
        {
            group: 'Mi Espacio',
            items: [
                { path: '/app/hoy', label: 'Mi Agenda', icon: 'Sun' },
                { path: '/app/pendientes', label: 'Mis Tareas', icon: 'CheckSquare' },
                { path: '/app/notas', label: 'Mis Notas', icon: 'FileText' },
            ]
        },
        {
            group: 'Gestión Equipo',
            items: [
                { path: '/app/equipo', label: 'Dashboard', icon: 'LayoutDashboard' },
                { path: '/app/equipo/mi-equipo', label: 'Mi Equipo', icon: 'Eye' },
                { path: '/app/equipo/bloqueos', label: 'Bloqueos y Riesgos', icon: 'Shield' },
            ]
        },
        {
            group: 'Planificación',
            items: [
                { path: '/app/planning/carga', label: 'Carga Laboral', icon: 'BarChart' },
                { path: '/app/planning/plan-trabajo', label: 'Plan de Trabajo', icon: 'FileCheck' },
                { path: '/app/planning/approvals', label: 'Aprobaciones', icon: 'FileCheck' },
            ]
        },
        {
            group: 'Historial',
            items: [
                { path: '/app/archivo', label: 'Archivo Tareas', icon: 'Archive' },
            ]
        },
        {
            group: 'Ayuda',
            items: [
                { path: '/app/help', label: 'Tutorial Interactivo', icon: 'BookOpen' },
            ]
        }
    ]);

    // --- ADMIN (Rol 1) ---
    // Todo
    // No necesitamos actualizarlo porque probablemente ya lo tiene o queremos que sea todo. 
    // Pero mejor forzarlo para que sea consistente.
    // El admin ve TODO lo que está en APP_MENU original.
    /*
        Como ADMIN tiene acceso a todo, si dejamos defaultMenu en null o vacío, 
        el frontend podría o no filtrarlo. 
        Pero para consistencia, asignemosle todo el APP_MENU.
    */
    // Obtenemos todo el APP_MENU 'full'
    // (Simulado aquí porque no puedo importar el del frontend fácilmente en este runtime node puro sin tsconfig paths mapping setup)
    const menuAdmin = JSON.stringify([
        {
            group: 'Mi Espacio',
            items: [
                { path: '/app/hoy', label: 'Mi Agenda', icon: 'Sun' },
                { path: '/app/pendientes', label: 'Mis Tareas', icon: 'CheckSquare' },
                { path: '/app/notas', label: 'Mis Notas', icon: 'FileText' },
            ]
        },
        {
            group: 'Gestión Equipo',
            items: [
                { path: '/app/equipo', label: 'Dashboard', icon: 'LayoutDashboard' },
                { path: '/app/equipo/mi-equipo', label: 'Mi Equipo', icon: 'Eye' },
                { path: '/app/equipo/bloqueos', label: 'Bloqueos y Riesgos', icon: 'Shield' },
            ]
        },
        {
            group: 'Planificación',
            items: [
                { path: '/app/planning/carga', label: 'Carga Laboral', icon: 'BarChart' },
                { path: '/app/planning/plan-trabajo', label: 'Plan de Trabajo', icon: 'FileCheck' },
                { path: '/app/planning/approvals', label: 'Aprobaciones', icon: 'FileCheck' },
            ]
        },
        {
            group: 'Inteligencia',
            items: [
                { path: '/app/reports', label: 'Centro de Reportes', icon: 'PieChart' },
            ]
        },
        {
            group: 'Administración',
            items: [
                { path: '/app/admin/users', label: 'Usuarios', icon: 'Users' },
                { path: '/app/admin/roles', label: 'Roles y Permisos', icon: 'Shield' },
                { path: '/app/admin/permisos', label: 'Control de Acceso', icon: 'KeyRound' },
                { path: '/app/admin/visibilidad', label: 'Visibilidad', icon: 'Eye' },
                { path: '/app/admin/audit', label: 'Auditar Acciones', icon: 'ShieldCheck' },
                { path: '/app/admin/import', label: 'Importar Datos', icon: 'Database' },
                { path: '/app/admin/logs', label: 'Monitor Sistema', icon: 'Terminal' }
            ]
        },
        {
            group: 'Historial',
            items: [
                { path: '/app/archivo', label: 'Archivo Tareas', icon: 'Archive' },
            ]
        },
        {
            group: 'Ayuda',
            items: [
                { path: '/app/help', label: 'Tutorial Interactivo', icon: 'BookOpen' },
            ]
        }
    ]);

    // UPDATE QUERIES

    // 1. Empleados y Colaboradores (Roles con nombre '%Empleado%' o '%Colaborador%')
    await ds.query(`UPDATE "p_Roles" SET "defaultMenu" = $1 WHERE nombre ILIKE '%Empleado%' OR nombre ILIKE '%Colaborador%'`, [menuEmpleado]);
    console.log('Actualizado menú para Empleados/Colaboradores');

    // 2. Coordinadores y Gerentes
    await ds.query(`UPDATE "p_Roles" SET "defaultMenu" = $1 WHERE nombre ILIKE '%Gerente%' OR nombre ILIKE '%Coordinador%'`, [menuGerencia]);
    console.log('Actualizado menú para Gerentes/Coordinadores');

    // 3. Admin
    await ds.query(`UPDATE "p_Roles" SET "defaultMenu" = $1 WHERE nombre = 'Admin'`, [menuAdmin]);
    console.log('Actualizado menú para Admin');

    await ds.destroy();
}

main().catch(console.error);
