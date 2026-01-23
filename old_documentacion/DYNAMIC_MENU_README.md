# Implementación de Menú Dinámico

Este documento detalla la implementación del sistema de menús dinámicos y personalizables en la plataforma Clarity.

## Resumen de Cambios

Se ha implementado una jerarquía de configuración para el menú lateral (`Sidebar`), permitiendo una personalización flexible a dos niveles:

1.  **Menú por Defecto (Por Rol):** Los administradores pueden definir una estructura de menú base para cada rol (ej. Admin, User, Gerente).
2.  **Menú Personalizado (Por Usuario):** Se puede sobrescribir el menú de un rol con una configuración específica para un usuario individual.

La prioridad de resolución al iniciar sesión es:
`Menú Personalizado` > `Menú por Defecto del Rol` > `Menú Hardcoded (Fallback)`

## Componentes Modificados

### Backend (NestJS)

-   **Entidades:**
    -   `Rol`: Se agregó la columna `defaultMenu` (text) para almacenar el JSON del menú por defecto.
    -   `UsuarioConfig`: Se agregó la columna `customMenu` (text) para almacenar el JSON del menú personalizado.

-   **AuthService:**
    -   Actualizado para resolver la configuración del menú durante el login.
    -   Importa y utiliza los repositorios de `Rol` y `UsuarioConfig`.

-   **AdminModule:**
    -   `AdminController`: Nuevos endpoints `POST /admin/roles/:idRew/menu` y `POST /admin/usuarios/:idUsuario/menu`.
    -   `AdminService`: Lógica para guardar las configuraciones de menú en la base de datos.

### Frontend (React)

-   **Sidebar.tsx:**
    -   Lógica para renderizar dinámicamente el menú basado en `user.menuConfig`.
    -   Mapeo de iconos (strings a componentes Lucide) para soportar la configuración JSON.

-   **RolesPage.tsx:**
    -   Nueva sección en el editor de roles para definir el "Menú por Defecto" mediante un editor JSON simple.

-   **UsersPage.tsx:**
    -   Nueva sección en el modal de edición de usuario para definir un "Menú Personalizado" mediante JSON.

-   **clarity.service.ts:**
    -   Nuevos métodos `updateRoleMenu` y `updateCustomMenu`.
    -   Actualización de tipos para `getRoles`.

## Guía de Uso

### Configurar Menú para un Rol
1.  Navegar a **Administración > Roles y Permisos**.
2.  Seleccionar un rol (ej. "User").
3.  Hacer clic en "Editar Permisos".
4.  En la parte inferior, localizar la sección **Menú por Defecto (JSON)**.
5.  Ingresar la estructura JSON deseada (ver ejemplo abajo).
6.  Guardar cambios.

### Configurar Menú para un Usuario
1.  Navegar a **Administración > Usuarios**.
2.  Buscar y editar un usuario.
3.  En la parte inferior del modal, localizar la sección **Menú Personalizado (JSON)**.
4.  Ingresar la estructura JSON.
5.  Hacer clic en "Guardar Menú".

### Ejemplo de Estructura JSON

```json
[
  {
    "group": "Mi Espacio",
    "items": [
      { "path": "/app/hoy", "label": "Mi Agenda", "icon": "Sun" },
      { "path": "/app/pendientes", "label": "Mis Tareas", "icon": "CheckSquare" }
    ]
  },
  {
    "group": "Gestión",
    "items": [
      { "path": "/app/planning/plan-trabajo", "label": "Proyectos", "icon": "Briefcase" }
    ]
  }
]
```

**Iconos Disponibles:** Sun, CheckSquare, Users, FileText, BarChart, PieChart, Shield, Terminal, Database, etc. (Ver `Sidebar.tsx` para la lista completa).
