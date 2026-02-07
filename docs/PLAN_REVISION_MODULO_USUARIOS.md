# 📋 PLAN DE TRABAJO: Revisión Completa de Módulo de Usuarios y Permisos

**Fecha de Generación:** 06 de Febrero, 2026  
**Módulo:** `/app/admin/users` (UsersPage.tsx)  
**Objetivo:** Auditar el sistema de gestión de usuarios, permisos y visibilidad para identificar lo que funciona, lo que falta, y crear un roadmap de implementación.

---

## 1. 📊 Estado Actual del Módulo

### **1.1 Funcionalidades Implementadas ✅**

| Funcionalidad | Estado | Ubicación | Notas |
|---------------|--------|-----------|-------|
| Listar Usuarios (Paginado) | ✅ Funcional | `UsersPage.tsx` | Soporta búsqueda client-side |
| Vista Directorio (Lista) | ✅ Funcional | `viewMode: 'list'` | Muestra nombre, carnet, correo, rol |
| Vista Jerarquía (Organigrama) | ✅ Parcial | `viewMode: 'hierarchy'` | Muestra estructura recursiva |
| Cambiar Rol de Usuario | ✅ Funcional | `handleSaveRole()` | Actualiza `rolGlobal` e `idRol` |
| Restablecer Contraseña | ✅ Funcional | `handleResetPassword()` | Valor por defecto: `123456` |
| Personalizar Menú por Usuario | ✅ Funcional | `MenuBuilder.tsx` | Permite seleccionar ítems del menú base |
| Crear Usuario Nuevo | ✅ Funcional | `handleCreateUser()` | Crea usuario con rol "Colaborador" |
| Exportar CSV | ✅ Funcional | `handleExport()` | Exporta lista filtrada |
| Crear Nodo Organigrama | ✅ Funcional | `handleCreateNode()` | Permite crear sub-equipos |
| Asignar Usuario a Nodo | ✅ Funcional | `handleAssignUser()` | Roles: Colaborador, Líder, Director |
| Ver Visibilidad Efectiva | ✅ Funcional | `VisibilityModal.tsx` | Muestra quiénes puede ver un usuario |
| Gestionar Permisos por Persona | ✅ Funcional | `VisibilityModal.tsx` (tab 'people') | Permite ALLOW y DENY |
| Gestionar Permisos por Área | ✅ Funcional | `VisibilityModal.tsx` (tab 'areas') | Soporta ALLOW y DENY |

### **1.2 Funcionalidades Faltantes o Incompletas ❌**

| Funcionalidad | Estado | Impacto | Prioridad |
|---------------|--------|---------|-----------|
| **Route Backend: Crear Usuario** | ✅ Funcional | Implementado | � Realizado |
| Activar/Desactivar Usuario | ✅ Funcional | Icono Toggle en tabla | � Realizado |
| Editar Datos del Usuario | ✅ Funcional | Modal Edición (inputs) | � Realizado |
| Eliminar Usuario (Soft Delete) | ✅ Funcional | Botón en Modal Edición (Soft Delete) |  Realizado |
| Asignación de Carnet | ✅ Funcional | Editable en modal | � Realizado |
| Permisos por Área con DENY | ✅ Funcional | Implementado en Visibilidad | � Realizado |
| Remover Usuario de Nodo | ✅ Funcional | Botón 'X' en vista Jerarquía |  Realizado |
| Historial de Cambios (Audit) | ✅ Funcional | Tab 'Historial' en Modal Edición |  Realizado |
| Transferencia Masiva | ⚠️ UI Existe, Sin Lógica | Medio - Botón existe pero no hace nada | 🟡 Media |
| Perfil de Seguridad (Perfil Preconfigurado) | ❌ Falta | Bajo - Podría tener plantillas de menú por perfil | 🟢 Baja |
| Búsqueda Avanzada (Filtros) | ⚠️ Incompleto | Bajo - Solo búsqueda de texto simple | 🟢 Baja |

---

## 2. 🔐 Análisis del Sistema de Permisos y Visibilidad

### **2.1 Flujo Actual de Visibilidad**

```
┌─────────────────────────────────────────────────────────────────┐
│                      ¿Quién puede ver a quién?                  │
├─────────────────────────────────────────────────────────────────┤
│  1. Jerarquía RRHH (Tabla c_Organizacion)                       │
│     └── Un jefe ve a todos sus subordinados                     │
│                                                                 │
│  2. Permisos Manuales (Tabla v_PermisosEmpleado)                │
│     ├── ALLOW: Agregar acceso a persona específica              │
│     └── DENY: Bloquear acceso a persona específica              │
│                                                                 │
│  3. Permisos por Área (Tabla v_PermisosArea)                    │
│     └── ALLOW: Ver todo el subárbol de una gerencia             │
│                                                                 │
│  4. Orden de Precedencia:                                       │
│     DENY > ALLOW Manual > Jerarquía RRHH > Permisos Área        │
└─────────────────────────────────────────────────────────────────┘
```

### **2.2 Problemas Conocidos**

1.  **No hay forma de "negar" a nivel de Área**: Si alguien tiene acceso al subárbol de una Gerencia vía `v_PermisosArea`, no hay forma de excluir una persona específica *dentro* de esa área.
    *   **Solución Propuesta:** La DENY por persona debería tener mayor precedencia.

2.  **El Carnet es obligatorio para la visibilidad**: Si un usuario no tiene carnet, NO puede tener permisos porque el sistema de visibilidad usa `carnet` como llave.
    *   **Impacto:** Usuarios creados manualmente (sin carnet) no pueden participar en el sistema de visibilidad.
    *   **Solución Propuesta:** Permitir asignar carnet desde la UI (actualmente no existe este campo editable).

3.  **No hay visualización de "por qué" tiene acceso**: La pestaña "Visibilidad Efectiva" lista quiénes puede ver, pero no explica si es por jerarquía, permiso manual, o área.
    *   **Solución Propuesta:** Agregar columna "Fuente de Acceso" con valores: `Jerarquía`, `Permiso Manual`, `Área`.

---

## 3. ✅ Checklist de Implementación

### **Fase 1: Correcciones Críticas (Prioridad Alta)**

- [ ] **P1-1:** Agregar botón "Activar/Desactivar" usuario en la tabla (toggle activo)
    - Backend: `adminRepo.toggleActivo(idUsuario, estado)`
    - Frontend: Icono de toggle en columna de acciones
- [ ] **P1-2:** Permitir edición de datos básicos (nombre, correo, cargo, teléfono)
    - Reutilizar modal de creación con modo "edición"
- [ ] **P1-3:** Agregar campo para asignar/editar Carnet
    - CRITICO para que el usuario participe en el sistema de visibilidad
    - Validación: No duplicados
- [ ] **P1-4:** Mostrar indicador visual de usuarios SIN carnet asignado
    - Badge rojo en la tabla: "Sin Carnet"

### **Fase 2: Mejoras de Visibilidad (Prioridad Media)**

- [ ] **P2-1:** Agregar columna "Fuente de Acceso" en pestaña de Visibilidad Efectiva
- [ ] **P2-2:** Implementar DENY a nivel de Área (bloquear subárbol completo)
    - Backend: Nuevo campo `tipoAcceso` en `v_PermisosArea`
- [ ] **P2-3:** Agregar vista de "Quién puede verme" (inverso de visibilidad efectiva)
    - Útil para debugging de permisos

### **Fase 3: Funcionalidades Avanzadas (Prioridad Baja)**

- [ ] **P3-1:** Transferencia masiva de usuarios entre nodos
    - Implementar lógica para el botón existente
- [ ] **P3-2:** Eliminar usuario (soft delete con flag `eliminado`)
- [ ] **P3-3:** Remover usuario de nodo organizacional
- [ ] **P3-4:** Historial de cambios por usuario (enlace a Auditoría filtrada)
- [ ] **P3-5:** Perfiles de Seguridad preconfigurados (plantillas de menú)
- [ ] **P3-6:** Filtros avanzados: por rol, por área, por estado, por fecha de creación

---

## 4. 📐 Diseño Propuesto para Mejoras

### **4.1 Toggle Activo/Inactivo**

```
┌─────────────────────────────────────────────────────────────────────┐
│  ... | Rol Sistema | Estado   | Acciones                           │
├─────────────────────────────────────────────────────────────────────┤
│  ... | Empleado    | ●Activo  | [Editar] [Visibilidad] [⚙️ Toggle] │
│  ... | Admin       | ○Inactivo| [Editar] [Visibilidad] [⚙️ Toggle] │
└─────────────────────────────────────────────────────────────────────┘
```

*   Al hacer clic en Toggle:
    *   Si está activo → Desactivar (no puede hacer login)
    *   Si está inactivo → Activar

### **4.2 Edición de Datos Básicos**

Reutilizar el modal de creación pero en modo edición:
*   Prellenar campos con datos actuales
*   Agregar campo "Carnet" (solo editable aquí)
*   Botón "Guardar Cambios" en lugar de "Crear"

### **4.3 Indicador de Carnet Faltante**

```
┌─────────────────────────────────────────────────────────────────────┐
│ Colaborador       | Carnet/ID       | Correo                        │
├─────────────────────────────────────────────────────────────────────┤
│ Juan Pérez        | 500123          | juan@empresa.com              │
│ María García      | ⚠️ Sin Carnet   | maria@empresa.com             │
└─────────────────────────────────────────────────────────────────────┘
```

*   Click en "⚠️ Sin Carnet" abre modal de edición con foco en el campo Carnet.

---

## 5. 🗄️ Cambios de Base de Datos Requeridos

### **5.1 Nuevos Campos (Si no existen)**

```sql
-- Verificar que p_Usuarios tenga:
-- activo BIT DEFAULT 1
-- eliminado BIT DEFAULT 0
-- carnet NVARCHAR(50) NULL

-- Para DENY en áreas:
ALTER TABLE v_PermisosArea ADD tipoAcceso NVARCHAR(10) DEFAULT 'ALLOW';
```

### **5.2 Nuevos Stored Procedures**

```sql
-- Toggle Estado Usuario
CREATE PROCEDURE sp_ToggleUsuarioActivo
    @idUsuario INT,
    @nuevoEstado BIT
AS
    UPDATE p_Usuarios SET activo = @nuevoEstado WHERE idUsuario = @idUsuario;

-- Actualizar Datos Básicos
CREATE PROCEDURE sp_ActualizarUsuarioDatosBasicos
    @idUsuario INT,
    @nombre NVARCHAR(200),
    @correo NVARCHAR(200),
    @cargo NVARCHAR(100),
    @telefono NVARCHAR(50),
    @carnet NVARCHAR(50)
AS
    UPDATE p_Usuarios 
    SET nombre = @nombre, 
        correo = @correo, 
        cargo = @cargo, 
        telefono = @telefono,
        carnet = @carnet
    WHERE idUsuario = @idUsuario;
```

---

## 6. 📅 Orden de Ejecución Sugerido

| Día | Tareas |
|-----|--------|
| **Día 1** | P1-3: Campo Carnet editable + Indicador visual P1-4 |
| **Día 2** | P1-1: Toggle Activo/Inactivo |
| **Día 3** | P1-2: Edición de datos básicos (reusar modal) |
| **Día 4** | P2-1: Fuente de Acceso en Visibilidad Efectiva |
| **Día 5** | P2-3: Vista "Quién puede verme" |
| **Día 6+** | Fase 3 según demanda |

---

## 7. 🔍 Resumen Ejecutivo

### ¿Qué YA funciona bien?
- Listar, buscar y paginar usuarios
- Cambiar rol y resetear contraseña
- Personalizar menú por usuario (MenuBuilder)
- Sistema de visibilidad (jerárquica + manual)
- Creación de organigrama

### ¿Qué necesita atención urgente?
1.  **Asignación de Carnet** - Sin esto, el usuario no puede participar en visibilidad
2.  **Activar/Desactivar Usuario** - No hay forma de bloquear acceso
3.  **Editar Datos Básicos** - No se puede corregir información incorrecta

### ¿Qué sería nice-to-have?
- Transferencia masiva entre equipos
- Historial de cambios por usuario
- Perfiles de seguridad preconfigurados
