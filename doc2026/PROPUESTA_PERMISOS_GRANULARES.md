# 🔐 Propuesta: Sistema de Permisos Granulares por Proyecto

**Versión:** 1.0  
**Fecha:** 2026-02-05  
**Estado:** Propuesta para Fase Futura (No Implementar Ahora)  
**Autor:** Sistema / Equipo de Desarrollo  

---

## 📋 Resumen Ejecutivo

Este documento propone un sistema de permisos **granular y flexible** que permitirá a los responsables de proyectos definir **quién puede ver y qué puede hacer** cada persona en su proyecto, más allá de la jerarquía organizacional existente.

### Problema Actual
1. **Rigidez Jerárquica:** Los permisos actuales dependen exclusivamente de la estructura de RRHH (jefe → subordinado). Si alguien no está en tu línea jerárquica, no puede colaborar fácilmente.
2. **Todo o Nada:** Actualmente, si alguien puede ver un proyecto, puede hacer casi todo. No hay niveles intermedios (ej: "solo puede ver pero no editar").
3. **Falta de Control del Líder:** El Responsable del Proyecto no tiene herramientas para invitar a personas específicas ni para limitar lo que pueden hacer.

### Solución Propuesta
Implementar un sistema de **Permisos por Proyecto** donde el Responsable pueda:
- Invitar personas específicas (fuera de la jerarquía)
- Asignar un **Rol de Colaboración** con permisos específicos
- Revocar acceso en cualquier momento

---

## 🎯 Objetivos del Sistema

| Objetivo | Descripción |
|----------|-------------|
| **Agilidad** | Cualquier persona autorizada puede trabajar rápido sin bloqueos innecesarios |
| **Control** | El Responsable decide quién entra y qué puede hacer |
| **Trazabilidad** | Todo cambio queda registrado en el historial (ya implementado) |
| **Flexibilidad** | Soportar diferentes estilos de gestión (proyectos abiertos vs. cerrados) |
| **Simplicidad** | Fácil de entender para usuarios no técnicos |

---

## 🏗️ Arquitectura Propuesta

### 1. Nueva Tabla: `p_ProyectoColaboradores`

```sql
CREATE TABLE p_ProyectoColaboradores (
    id INT IDENTITY(1,1) PRIMARY KEY,
    idProyecto INT NOT NULL,
    carnetUsuario NVARCHAR(50) NOT NULL,
    rolColaboracion NVARCHAR(50) NOT NULL DEFAULT 'Colaborador',
    permisos NVARCHAR(MAX) NULL,  -- JSON con permisos específicos (opcional)
    invitadoPor NVARCHAR(50) NOT NULL,
    fechaInvitacion DATETIME DEFAULT GETDATE(),
    fechaExpiracion DATETIME NULL,  -- Para accesos temporales
    activo BIT DEFAULT 1,
    notas NVARCHAR(500) NULL,
    
    FOREIGN KEY (idProyecto) REFERENCES p_Proyectos(idProyecto),
    UNIQUE (idProyecto, carnetUsuario)
);
```

### 2. Roles de Colaboración Predefinidos

| Rol | Descripción | Permisos Incluidos |
|-----|-------------|-------------------|
| **Dueño** | Control total del proyecto | Todo |
| **Administrador** | Casi todo, excepto eliminar proyecto | Crear, Editar, Eliminar tareas, Asignar, Invitar |
| **Colaborador** | Trabajo activo en el proyecto | Crear, Editar propias, Asignar a sí mismo |
| **Editor** | Puede modificar tareas existentes | Editar cualquier tarea |
| **Observador** | Solo lectura | Ver tareas, Ver reportes |
| **Revisor** | Aprobar/Rechazar entregables | Ver, Comentar, Aprobar |

### 3. Matriz de Permisos Granulares

Cada permiso es un "switch" que puede estar encendido o apagado:

| Permiso | Código | Descripción |
|---------|--------|-------------|
| Ver Proyecto | `VIEW_PROJECT` | Puede ver el proyecto en su lista |
| Ver Tareas | `VIEW_TASKS` | Puede ver las tareas del proyecto |
| Crear Tareas | `CREATE_TASK` | Puede crear nuevas tareas |
| Editar Tarea Propia | `EDIT_OWN_TASK` | Puede editar tareas que creó o tiene asignadas |
| Editar Cualquier Tarea | `EDIT_ANY_TASK` | Puede editar cualquier tarea del proyecto |
| Eliminar Tarea Propia | `DELETE_OWN_TASK` | Puede eliminar tareas que creó (van a papelera) |
| Eliminar Cualquier Tarea | `DELETE_ANY_TASK` | Puede eliminar cualquier tarea |
| Asignar a Sí Mismo | `ASSIGN_SELF` | Puede tomarse tareas no asignadas |
| Asignar a Otros | `ASSIGN_OTHERS` | Puede asignar tareas a otros usuarios |
| Reasignar | `REASSIGN` | Puede cambiar el responsable de una tarea |
| Invitar Colaboradores | `INVITE` | Puede agregar nuevos colaboradores al proyecto |
| Gestionar Colaboradores | `MANAGE_COLLABORATORS` | Puede cambiar roles/expulsar colaboradores |
| Editar Proyecto | `EDIT_PROJECT` | Puede cambiar nombre, fechas, descripción del proyecto |
| Eliminar Proyecto | `DELETE_PROJECT` | Puede enviar el proyecto a la papelera |
| Exportar | `EXPORT` | Puede exportar datos del proyecto |
| Ver Historial | `VIEW_HISTORY` | Puede ver el log de cambios del proyecto |

### 4. Permisos por Rol (Configuración Default)

```json
{
  "Dueño": ["*"],
  "Administrador": [
    "VIEW_PROJECT", "VIEW_TASKS", "CREATE_TASK", 
    "EDIT_OWN_TASK", "EDIT_ANY_TASK", 
    "DELETE_OWN_TASK", "DELETE_ANY_TASK",
    "ASSIGN_SELF", "ASSIGN_OTHERS", "REASSIGN",
    "INVITE", "MANAGE_COLLABORATORS",
    "EDIT_PROJECT", "EXPORT", "VIEW_HISTORY"
  ],
  "Colaborador": [
    "VIEW_PROJECT", "VIEW_TASKS", "CREATE_TASK",
    "EDIT_OWN_TASK", "DELETE_OWN_TASK",
    "ASSIGN_SELF", "VIEW_HISTORY"
  ],
  "Editor": [
    "VIEW_PROJECT", "VIEW_TASKS",
    "EDIT_OWN_TASK", "EDIT_ANY_TASK",
    "VIEW_HISTORY"
  ],
  "Observador": [
    "VIEW_PROJECT", "VIEW_TASKS", "VIEW_HISTORY"
  ],
  "Revisor": [
    "VIEW_PROJECT", "VIEW_TASKS", 
    "EDIT_ANY_TASK", "VIEW_HISTORY"
  ]
}
```

---

## 🔄 Flujo de Verificación de Permisos

### Algoritmo Propuesto (Pseudocódigo)

```
FUNCIÓN verificarPermiso(idUsuario, idProyecto, permisoRequerido):
    
    usuario = obtenerUsuario(idUsuario)
    
    # 1. SuperAdmin siempre puede todo
    SI usuario.rolGlobal EN ['Admin', 'SuperAdmin']:
        RETORNAR PERMITIDO
    
    # 2. Verificar si es el Creador/Dueño del Proyecto
    proyecto = obtenerProyecto(idProyecto)
    SI proyecto.idCreador == idUsuario O proyecto.responsableCarnet == usuario.carnet:
        RETORNAR PERMITIDO
    
    # 3. Buscar en tabla de colaboradores
    colaborador = obtenerColaborador(idProyecto, usuario.carnet)
    SI colaborador EXISTE Y colaborador.activo:
        permisos = obtenerPermisosDeRol(colaborador.rolColaboracion)
        
        # Permisos personalizados sobrescriben los del rol
        SI colaborador.permisos NO ES NULO:
            permisos = MERGE(permisos, colaborador.permisos)
        
        SI permisoRequerido EN permisos O "*" EN permisos:
            RETORNAR PERMITIDO
    
    # 4. Fallback: Jerarquía Organizacional (sistema actual)
    SI usuarioTieneAccesoJerarquico(idUsuario, proyecto):
        RETORNAR PERMITIDO CON ROL 'Colaborador' (permisos limitados)
    
    # 5. Denegado
    RETORNAR DENEGADO
```

---

## 🖥️ Interfaz de Usuario Propuesta

### Pantalla: "Gestionar Colaboradores del Proyecto"

Accesible desde el menú de tres puntos del proyecto (solo para Dueños/Admins).

**Mockup Conceptual:**

```
┌─────────────────────────────────────────────────────────────┐
│  👥 Colaboradores del Proyecto: "Plan Estratégico 2026"     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [+ Invitar Colaborador]                    🔍 Buscar...    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 👤 Juan Pérez (500708)           [Dueño ▼]     ⚙️   │    │
│  │    📧 juan.perez@empresa.com                        │    │
│  │    📅 Creador del proyecto                          │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 👤 María García (500123)     [Colaborador ▼]   ⚙️ ❌│    │
│  │    📧 maria.garcia@empresa.com                      │    │
│  │    📅 Invitada el 15 Ene 2026                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 👤 Carlos López (500456)      [Observador ▼]   ⚙️ ❌│    │
│  │    📧 carlos.lopez@empresa.com                      │    │
│  │    📅 Invitado el 20 Ene 2026 • Expira 28 Feb 2026  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ── Acceso por Jerarquía (Automático) ──────────────────    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 👤 Director General              [Heredado]    ℹ️   │    │
│  │    Tiene acceso por ser jefe jerárquico             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Modal: "Invitar Colaborador"

```
┌─────────────────────────────────────────────────────────────┐
│  ➕ Invitar Colaborador                              [X]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Buscar Usuario:                                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 🔍 Escribe nombre, correo o carnet...               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  Rol de Colaboración:                                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ○ Colaborador (Crear y editar sus tareas)           │    │
│  │ ○ Editor (Editar cualquier tarea)                   │    │
│  │ ○ Administrador (Control casi total)                │    │
│  │ ○ Observador (Solo lectura)                         │    │
│  │ ○ Personalizado... ⚙️                               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ☐ Acceso temporal (expira el _____)                        │
│                                                             │
│  Nota (opcional):                                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ "Apoyo temporal para revisión de entregables Q1"    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│              [Cancelar]    [✓ Invitar]                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Modal: "Permisos Personalizados"

```
┌─────────────────────────────────────────────────────────────┐
│  ⚙️ Permisos Personalizados para: María García       [X]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Base: [Colaborador ▼]                                      │
│                                                             │
│  ── Tareas ──────────────────────────────────────────────   │
│  ☑ Ver tareas del proyecto                                  │
│  ☑ Crear tareas                                             │
│  ☑ Editar tareas propias                                    │
│  ☐ Editar cualquier tarea                                   │
│  ☑ Eliminar tareas propias                                  │
│  ☐ Eliminar cualquier tarea                                 │
│                                                             │
│  ── Asignación ──────────────────────────────────────────   │
│  ☑ Asignarse tareas a sí mismo                              │
│  ☐ Asignar tareas a otros                                   │
│  ☐ Reasignar tareas                                         │
│                                                             │
│  ── Administración ──────────────────────────────────────   │
│  ☐ Invitar colaboradores                                    │
│  ☐ Gestionar colaboradores                                  │
│  ☐ Editar configuración del proyecto                        │
│  ☐ Eliminar proyecto                                        │
│                                                             │
│  ── Otros ───────────────────────────────────────────────   │
│  ☑ Ver historial de cambios                                 │
│  ☑ Exportar datos                                           │
│                                                             │
│              [Cancelar]    [✓ Guardar Permisos]             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📡 API Endpoints Propuestos

### Gestión de Colaboradores

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/proyectos/:id/colaboradores` | Listar colaboradores del proyecto |
| `POST` | `/proyectos/:id/colaboradores` | Invitar nuevo colaborador |
| `PATCH` | `/proyectos/:id/colaboradores/:carnet` | Actualizar rol/permisos |
| `DELETE` | `/proyectos/:id/colaboradores/:carnet` | Revocar acceso |

### Verificación de Permisos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/proyectos/:id/mis-permisos` | Obtener mis permisos en este proyecto |
| `GET` | `/proyectos/:id/verificar-permiso/:permiso` | Verificar si tengo un permiso específico |

### Ejemplo de Request/Response

**POST /proyectos/123/colaboradores**
```json
{
  "carnetUsuario": "500456",
  "rolColaboracion": "Colaborador",
  "permisos": null,
  "fechaExpiracion": "2026-03-31",
  "notas": "Apoyo temporal para proyecto Q1"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Colaborador invitado exitosamente",
  "colaborador": {
    "id": 45,
    "carnetUsuario": "500456",
    "nombreUsuario": "Carlos López",
    "rolColaboracion": "Colaborador",
    "fechaInvitacion": "2026-02-05T10:30:00Z",
    "fechaExpiracion": "2026-03-31T23:59:59Z"
  }
}
```

---

## 🔒 Consideraciones de Seguridad

### 1. Auditoría
Todas las acciones de gestión de colaboradores deben quedar registradas:
- Quién invitó a quién
- Cambios de rol/permisos
- Revocaciones de acceso
- Modificaciones de permisos personalizados

### 2. Prevención de Escalamiento de Privilegios
- Nadie puede asignarse un rol superior al que tiene
- Solo el Dueño puede crear otros Dueños
- Los permisos heredados por jerarquía no pueden ser modificados (son automáticos)

### 3. Expiración Automática
- Implementar un job nocturno que desactive colaboradores con `fechaExpiracion` vencida
- Notificar al colaborador 7 días antes de que expire su acceso

### 4. Límites
- Máximo de colaboradores por proyecto (configurable, ej: 50)
- Rate limiting en invitaciones (evitar spam)

---

## 📊 Impacto en el Sistema Actual

### Archivos a Modificar

| Archivo | Tipo de Cambio |
|---------|----------------|
| `planning.service.ts` | Integrar nueva lógica de verificación |
| `planning.repo.ts` | Agregar queries para colaboradores |
| `visibilidad.service.ts` | Extender para soportar colaboradores |
| `ProyectosPage.tsx` | Agregar botón "Gestionar Colaboradores" |
| `modelos.ts` | Agregar interfaces de Colaborador |
| `clarity.service.ts` | Agregar endpoints de colaboradores |

### Nuevos Archivos

| Archivo | Propósito |
|---------|-----------|
| `colaboradores.repo.ts` | Queries específicas de colaboradores |
| `colaboradores.service.ts` | Lógica de negocio de gestión |
| `GestionColaboradoresModal.tsx` | UI de gestión |
| `InvitarColaboradorModal.tsx` | UI de invitación |

### Migración de Base de Datos

```sql
-- Crear tabla de colaboradores
CREATE TABLE p_ProyectoColaboradores (...);

-- Crear tabla de permisos predefinidos
CREATE TABLE p_RolesColaboracion (
    id INT IDENTITY(1,1) PRIMARY KEY,
    nombre NVARCHAR(50) NOT NULL,
    permisos NVARCHAR(MAX) NOT NULL,
    esSistema BIT DEFAULT 0,
    orden INT DEFAULT 0
);

-- Insertar roles default
INSERT INTO p_RolesColaboracion (nombre, permisos, esSistema, orden) VALUES
('Dueño', '["*"]', 1, 1),
('Administrador', '["VIEW_PROJECT","VIEW_TASKS","CREATE_TASK",...]', 1, 2),
-- etc.

-- Índices para performance
CREATE INDEX IX_ProyectoColaboradores_Proyecto ON p_ProyectoColaboradores(idProyecto);
CREATE INDEX IX_ProyectoColaboradores_Usuario ON p_ProyectoColaboradores(carnetUsuario);
```

---

## 📅 Plan de Implementación Sugerido

### Fase 1: Base de Datos (1 semana)
- [ ] Crear tabla `p_ProyectoColaboradores`
- [ ] Crear tabla `p_RolesColaboracion`
- [ ] Insertar roles predefinidos
- [ ] Crear índices

### Fase 2: Backend (2 semanas)
- [ ] Crear `colaboradores.repo.ts`
- [ ] Crear `colaboradores.service.ts`
- [ ] Agregar endpoints al controller
- [ ] Modificar `verificarAccesoTarea` para consultar colaboradores
- [ ] Integrar verificación de permisos granulares

### Fase 3: Frontend (2 semanas)
- [ ] Crear modal de gestión de colaboradores
- [ ] Crear modal de invitación
- [ ] Crear modal de permisos personalizados
- [ ] Integrar en página de proyectos
- [ ] Agregar indicadores visuales de rol

### Fase 4: Testing y Refinamiento (1 semana)
- [ ] Tests unitarios de lógica de permisos
- [ ] Tests de integración de flujos
- [ ] Pruebas de usuario
- [ ] Ajustes de UX

### Fase 5: Documentación y Rollout
- [ ] Manual de usuario
- [ ] Capacitación
- [ ] Rollout gradual

---

## ❓ Preguntas Abiertas para Discusión

1. **¿Los permisos de jerarquía deben poder ser sobrescritos?**
   - Opción A: No, siempre tienen acceso automático
   - Opción B: Sí, el dueño puede "bloquear" incluso a su jefe

2. **¿Queremos notificaciones de invitación?**
   - Email cuando alguien te invita a un proyecto
   - Notificación in-app

3. **¿Permisos a nivel de tarea individual?**
   - ¿Debería poder marcarse una tarea específica como "privada" dentro del proyecto?

4. **¿Grupos de colaboradores?**
   - ¿Debería poderse invitar un "equipo" predefinido de una vez?

5. **¿Plantillas de permisos por tipo de proyecto?**
   - Proyecto Estratégico → Permisos más restrictivos por default
   - Proyecto Operativo → Permisos más abiertos por default

---

## 📌 Conclusión

Este sistema de permisos granulares resuelve el dilema actual entre **agilidad** y **control**, dando al Responsable del Proyecto la capacidad de:

1. **Invitar** a quien necesite, sin depender de RRHH
2. **Definir** exactamente qué puede hacer cada persona
3. **Revocar** acceso cuando ya no sea necesario
4. **Confiar** en el historial de cambios como mecanismo de supervisión

Todo esto sin perder la base de visibilidad jerárquica actual, que sigue funcionando como "red de seguridad" automática.

**Recomendación:** Implementar en una fase futura cuando el sistema actual esté estabilizado y haya demanda clara de los usuarios para este nivel de control.

---

*Documento generado automáticamente. Revisar y ajustar según las necesidades del negocio.*
