
import {
    Sun, CheckSquare, FileText, LayoutDashboard, Eye, Shield, BarChart, FileCheck,
    PieChart, Users, KeyRound, ShieldCheck, Database, Terminal, Archive, BookOpen, ClipboardList
} from 'lucide-react';

export const APP_MENU = [
    {
        group: 'Mi Espacio',
        items: [
            { path: '/app/hoy', label: 'Mi Agenda', icon: 'Sun' },
            { path: '/app/pendientes', label: 'Mis Tareas', icon: 'CheckSquare' },
            { path: '/app/planning/proyectos', label: 'Gestión Proyectos', icon: 'FileCheck' },
            { path: '/app/notas', label: 'Mis Notas', icon: 'FileText' },
        ]
    },
    {
        group: 'Gestión Equipo',
        items: [
            { path: '/app/equipo/mi-equipo', label: 'Mi Equipo', icon: 'Eye' },
            // { path: '/app/equipo/bloqueos', label: 'Bloqueos y Riesgos', icon: 'Shield' },
        ]
    },
    {
        group: 'Planificación',
        items: [
            { path: '/app/planning/carga', label: 'Carga Laboral', icon: 'BarChart' },
            { path: '/app/planning/proyectos', label: 'Gestión Proyectos', icon: 'FileCheck' },
            { path: '/app/software/dashboard', label: 'Anality', icon: 'PieChart' },
            { path: '/app/planning/approvals', label: 'Aprobaciones', icon: 'FileCheck' },
        ]
    },
    /* {
        group: 'Inteligencia',
        items: [
            { path: '/app/reports', label: 'Centro de Reportes', icon: 'PieChart' },
        ]
    }, */
    {
        group: 'Administración',
        items: [
            { path: '/app/admin/users', label: 'Usuarios', icon: 'Users' },
            { path: '/app/admin/roles', label: 'Roles y Permisos', icon: 'Shield' },
            { path: '/app/admin/permisos', label: 'Control de Acceso', icon: 'KeyRound' },
            { path: '/app/admin/visibilidad', label: 'Visibilidad', icon: 'Eye' },
            { path: '/app/admin/seguridad', label: 'Seguridad y Accesos', icon: 'ShieldCheck' },
            { path: '/app/admin/audit', label: 'Auditar Acciones', icon: 'ShieldCheck' },
            { path: '/app/admin/import', label: 'Importar Datos', icon: 'Database' },
            { path: '/app/admin/logs', label: 'Monitor Sistema', icon: 'Terminal' }
        ]
    },
    /* {
        group: 'Historial',
        items: [
            { path: '/app/archivo', label: 'Archivo Tareas', icon: 'Archive' },
        ]
    }, */
    {
        group: 'Ayuda',
        items: [
            { path: '/app/help', label: 'Tutorial Interactivo', icon: 'BookOpen' },
        ]
    }
];

export const ICON_MAP: any = {
    Sun, CheckSquare, FileText, LayoutDashboard, Eye, Shield, BarChart, FileCheck,
    PieChart, Users, KeyRound, ShieldCheck, Database, Terminal, Archive, BookOpen, ClipboardList
};
