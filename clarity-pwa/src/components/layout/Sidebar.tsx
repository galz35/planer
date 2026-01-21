

import React, { useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
    LogOut,
    ArrowLeftFromLine,
    ArrowRightFromLine,
    ChevronDown,
    ChevronRight,
    FileText,
    type LucideIcon,
    // Add missing icons here if needed for dynamic mapping
    Calendar, Target, Map
} from 'lucide-react';

import { CountrySelector } from './CountrySelector';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { APP_MENU, ICON_MAP } from '../../constants/appMenu';

// Helper for the collapse icon
const WrapperIcon = () => <ArrowRightFromLine size={16} />;

type NavItem = {
    path?: string;
    label: string;
    icon: LucideIcon;
    permission?: string;
    children?: { path: string; label: string; icon?: LucideIcon; permission?: string }[];
};

export const Sidebar: React.FC = () => {
    const { isSidebarCollapsed, toggleSidebar } = useUI();
    const location = useLocation();
    const navigate = useNavigate();
    const { logout, user } = useAuth();
    const currentPath = location.pathname;

    // Groups State for Collapsible Menus
    const [openMenus, setOpenMenus] = useState<{ [key: string]: boolean }>({
        'Mi Espacio': true,
        'Gestión Equipo': true,
        'Estrategia': false
    });

    const toggleGroup = (label: string) => {
        if (isSidebarCollapsed) {
            toggleSidebar(); // Auto expand sidebar if clicking a group
            setOpenMenus(prev => ({ ...prev, [label]: true }));
        } else {
            setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }));
        }
    };

    const isActive = (path: string) => {
        if (!path) return false;
        if (currentPath === path) return true;

        // Verificar si la ruta actual es una sub-ruta de 'path'
        if (currentPath.startsWith(path + '/')) {
            // Obtener todas las rutas posibles del menú para ver si hay una más específica
            const allMenuPaths = rawMenuGroups.flatMap(g => g.items.map(i => i.path)).filter(Boolean) as string[];

            // Si existe otra ruta en el menú que sea más larga (más específica) y también coincida,
            // entonces esta ruta (la más corta) no es la activa principal.
            const hasBetterMatch = allMenuPaths.some(p => p !== path && p.startsWith(path) && currentPath.startsWith(p));

            return !hasBetterMatch;
        }

        return false;
    };

    // Menu Structure with Permission Requirements
    // Use Shared Menu
    const rawMenuGroups = APP_MENU.map(group => ({
        ...group,
        items: group.items.map(item => ({
            ...item,
            icon: ICON_MAP[item.icon as string] // Convert string icon to component
        }))
    }));

    // Local Map includes extra icons not in menu but used in UI
    const iconMap: { [key: string]: LucideIcon } = {
        ...ICON_MAP,
        LogOut, ArrowLeftFromLine, ArrowRightFromLine, ChevronDown, ChevronRight,
        Calendar, Target, Map
    };

    // Determine Menu Logic
    const getMenu = () => {
        // 1. If User has Dynamic Menu Config (from Backend)
        if ((user as any)?.menuConfig) {
            try {
                const dynamicMenu = (user as any).menuConfig;

                // Nuevo: Si es un objeto con profileType (en lugar de array)
                if (dynamicMenu.profileType) {
                    const baseMenu = rawMenuGroups;

                    if (dynamicMenu.profileType === 'LEADER') {
                        // Líder: Mostrar todo excepto Administración
                        return baseMenu.filter(group => group.group !== 'Administración');
                    } else if (dynamicMenu.profileType === 'EMPLOYEE') {
                        // Empleado: Solo "Mi Espacio"
                        return baseMenu.filter(group => group.group === 'Mi Espacio');
                    }
                }

                // Antiguo: Si es un array (customMenu manual)
                if (Array.isArray(dynamicMenu)) {
                    return dynamicMenu.map((g: any) => ({
                        ...g,
                        items: g.items.map((i: any) => ({
                            ...i,
                            icon: iconMap[i.icon] || FileText // Fallback icon
                        }))
                    }));
                }
            } catch (e) {
                console.error("Error loading dynamic menu", e);
            }
        }

        // 2. Default Fallback (Hardcoded) with Role Filtering
        const baseMenu = rawMenuGroups;

        // Check if user is Admin
        if (user && ['Admin', 'Administrador', 'SuperAdmin'].includes(user.rolGlobal || '')) {
            return baseMenu;
        }

        // Filter out Administration for non-admins
        return baseMenu.filter(group => group.group !== 'Administración');
    };

    const menuGroups = getMenu();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const renderNavItem = (item: NavItem) => {
        // If it has children, it's a collapsible menu
        if (item.children) {
            const isOpen = openMenus[item.label] || false;
            const isChildActive = item.children.some(c => isActive(c.path));

            return (
                <div key={item.label} className="mb-1 select-none">
                    <button
                        type="button"
                        onClick={() => toggleGroup(item.label)}
                        className={`w-full flex items-center justify-between py-2 px-3 rounded-lg transition-colors group relative
                            ${isChildActive ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:bg-slate-50'}
                        `}
                    >
                        <div className={`flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center w-full' : ''}`}>
                            <item.icon size={20} className={isChildActive ? 'stroke-2' : 'stroke-[1.5px]'} />
                            {!isSidebarCollapsed && (
                                <span className="font-semibold text-sm">{item.label}</span>
                            )}
                        </div>
                        {!isSidebarCollapsed && (
                            <div className="text-slate-400">
                                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </div>
                        )}
                    </button>

                    {/* Submenu */}
                    {isOpen && !isSidebarCollapsed && (
                        <div className="ml-9 mt-1 space-y-1 border-l-2 border-slate-100 pl-2 animate-in slide-in-from-top-2 duration-200">
                            {item.children.map(child => {
                                const active = isActive(child.path);
                                return (
                                    <Link
                                        key={child.label}
                                        to={child.path}
                                        className={`block py-1.5 px-3 rounded-md text-sm transition-colors
                                            ${child.label === 'Tareas Atrasadas' ? 'text-rose-600 hover:bg-rose-50' :
                                                active ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}
                                        `}
                                    >
                                        {child.label}
                                    </Link>
                                )
                            })}
                        </div>
                    )}
                </div>
            );
        }

        // Regular Item
        const active = item.path ? isActive(item.path) : false;
        return (
            <Link
                key={item.path || item.label}
                to={item.path!}
                title={isSidebarCollapsed ? item.label : ''}
                className={`flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2 rounded-lg transition-all duration-200 group relative mb-1
                    ${active
                        ? 'bg-rose-50 text-rose-600 font-bold shadow-sm'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                    }
                `}
            >
                <item.icon size={20} className={active ? 'stroke-[2.5px]' : 'stroke-2 group-hover:scale-110 transition-transform'} />
                {!isSidebarCollapsed && <span className="">{item.label}</span>}
                {active && !isSidebarCollapsed && <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-rose-500"></div>}
            </Link>
        );
    };

    return (
        <aside className={`hidden md:flex flex-col h-screen bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 fixed left-0 top-0 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 z-40 transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
            {/* Logo Area */}
            <div className={`p-6 border-b border-slate-50 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
                {isSidebarCollapsed ? (
                    <div onClick={toggleSidebar} className="cursor-pointer hover:scale-105 transition-transform">
                        <img src="/momentus-logo2.png" alt="M" className="h-10 w-auto" />
                    </div>
                ) : (
                    <div onClick={toggleSidebar} className="cursor-pointer flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <img src="/momentus-logo2.png" alt="Momentus" className="h-12 w-auto" />
                        <div className="animate-fade-in overflow-hidden">
                            <h1 className="font-black text-xl text-slate-900 tracking-tight leading-tight">MOMENTUS</h1>
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest leading-none">Sistema</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto custom-scrollbar p-3">
                {menuGroups.map((group: any) => (
                    <div key={group.group} className="mb-6">
                        {!isSidebarCollapsed && (
                            <p className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 animate-fade-in">{group.group}</p>
                        )}
                        {group.group === 'Supervisión de Equipo' && isSidebarCollapsed && <div className="h-px bg-slate-100 my-2 mx-4" />}
                        <div className="space-y-0.5">
                            {group.items.map((item: any) => renderNavItem(item))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Footer */}
            <div className="bg-slate-50/50 border-t border-slate-100">
                <div className="p-3">
                    <div className="px-1 pb-2 flex gap-2">
                        <button type="button" onClick={toggleSidebar} className="flex-1 py-1.5 text-slate-400 hover:text-slate-600 transition-colors flex justify-center hover:bg-slate-100 rounded-md">
                            {isSidebarCollapsed ? <WrapperIcon /> : <ArrowLeftFromLine size={16} />}
                        </button>
                    </div>

                    {!isSidebarCollapsed ? (
                        <div className="animate-fade-in bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold border-2 border-white shadow-sm ring-1 ring-slate-100 text-sm">
                                    {user?.nombre?.charAt(0) || 'U'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-800 truncate leading-tight">{user?.nombre}</p>
                                    <p className="text-[10px] text-slate-500 truncate font-semibold">{user?.correo}</p>
                                </div>
                            </div>

                            <CountrySelector collapsed={isSidebarCollapsed} />

                            <button
                                type="button"
                                onClick={handleLogout}
                                className="flex items-center justify-center gap-2 w-full px-3 py-1.5 mt-2 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-lg hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-colors"
                            >
                                <LogOut size={14} />
                                Desconectar
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3 pt-2">
                            <CountrySelector collapsed={isSidebarCollapsed} />
                            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs ring-2 ring-white shadow-sm">
                                {user?.nombre?.charAt(0) || 'U'}
                            </div>
                            <button onClick={handleLogout} title="Cerrar Sesión" className="text-slate-400 hover:text-rose-500 p-2 hover:bg-rose-50 rounded-lg transition-colors">
                                <LogOut size={18} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </aside >
    );
};
