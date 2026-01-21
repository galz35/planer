# 📊 Análisis: Permisos por Área - Plan de Implementación

## Fecha: 2026-01-20
## Estado: 🚧 EN PROGRESO

---

## 🔍 Estado Actual del Sistema

### Componentes Existentes:

| Componente | Ubicación | Estado |
|------------|-----------|--------|
| **Backend Entity** | `acceso/entities/permiso-area.entity.ts` | ✅ Existe |
| **Backend DTO** | `acceso/dto/crear-permiso-area.dto.ts` | ✅ Existe |
| **Backend Service** | `acceso/acceso.service.ts` | ✅ Existe |
| **Backend Visibilidad** | `acceso/visibilidad.service.ts` | ✅ Usa CTE recursivo |
| **Frontend Page** | `pages/Admin/Acceso/PermisosPage.tsx` | ✅ Existe |

### Campos Actuales de `PermisoArea`:
- `carnetRecibe`: Quién recibe el permiso
- `idOrgRaiz`: ID del nodo organizacional raíz
- `alcance`: `'SUBARBOL'` (incluye hijos) | `'SOLO_NODO'` (solo ese nodo)
- `activo`, `fechaInicio`, `fechaFin`, `motivo`

### Estructura de `p_organizacion_nodos`:
- `idOrg`: ID del nodo (PK)
- `padre`: ID del nodo padre (FK)
- `descripcion`: Nombre del nodo (ej: "Gerencia de RRHH")
- `tipo`: Tipo de nodo (ej: "Gerencia", "Subgerencia", "Equipo")
- `nivel`: Nivel jerárquico

---

## 🎯 Problemas a Resolver

### 1. UI poco clara para selección de nodos
**Problema:** El formulario actual pide "ID Org Raíz" como texto libre.
**Solución:** Agregar selector visual con jerarquía de nodos.

### 2. Falta previsualización de empleados afectados
**Problema:** El usuario no sabe cuántos empleados verá al asignar un permiso.
**Solución:** Mostrar contador/lista de empleados antes de confirmar.

### 3. Falta claridad sobre tipo de nodo
**Problema:** No está claro si el nodo es Gerencia, Subgerencia o Área.
**Solución:** Mostrar badge con el `tipo` del nodo seleccionado.

---

## ✅ Plan de Implementación

### Fase 1: Mejorar Backend - Endpoint de Nodos con Empleados ✅ COMPLETADA
- [x] **1.1** Crear endpoint `GET /api/acceso/organizacion/tree` que retorne árbol jerárquico
- [x] **1.2** Agregar endpoint `GET /api/acceso/organizacion/nodo/:id/preview` con conteo de empleados
- [x] **1.3** Agregar método `getNodo()` al servicio

### Fase 2: Mejorar Frontend - Selector de Nodos ✅ COMPLETADA
- [x] **2.1** Crear componente `NodoSelector` con árbol visual expandible
- [x] **2.2** Mostrar tipo de nodo (Gerencia/Subgerencia/Área) con badges
- [x] **2.3** Mostrar conteo de empleados afectados al seleccionar
- [x] **2.4** Integrar en modal de crear permiso con preview de empleados

### Fase 3: Mejorar Tabla de Permisos
- [ ] **3.1** Mostrar nombre del nodo (no solo ID)
- [ ] **3.2** Mostrar tipo de nodo
- [ ] **3.3** Mostrar conteo de empleados afectados
- [ ] **3.4** Agregar filtros por tipo de nodo

---

## 📐 Diseño de la UI Mejorada

### Selector de Nodos (TreeView):
```
📁 Dirección General
  └── 📁 Gerencia de RRHH (12 empleados) [GERENCIA]
      ├── 📁 Subgerencia de Compensaciones (5 empleados) [SUBGERENCIA]
      │   ├── 📄 Área de Nóminas (3 empleados) [ÁREA]
      │   └── 📄 Área de Beneficios (2 empleados) [ÁREA]
      └── 📁 Subgerencia de Desarrollo (7 empleados) [SUBGERENCIA]
```

### Tabla Mejorada:
| Receptor | Nodo | Tipo | Alcance | Empleados | Acciones |
|----------|------|------|---------|-----------|----------|
| EMP001 | Gerencia de RRHH | Gerencia | SUBARBOL | 12 | 🗑️ |
| EMP002 | Área de Nóminas | Área | SOLO_NODO | 3 | 🗑️ |

---

## 🚀 Inicio: Fase 1 - Backend

### Endpoint: `GET /api/acceso/nodos/tree`
```typescript
// Response:
{
  nodos: [
    {
      idOrg: "1001",
      descripcion: "Gerencia de RRHH",
      tipo: "Gerencia",
      empleadosCount: 12,
      hijos: [
        {
          idOrg: "1002",
          descripcion: "Subgerencia de Compensaciones",
          tipo: "Subgerencia",
          empleadosCount: 5,
          hijos: [...]
        }
      ]
    }
  ]
}
```

---

**Próximo paso:** Implementar Fase 1.1 - Endpoint de árbol de nodos
