# 🎯 Plan de Implementación: Panel de Control de Seguridad

## Objetivo
Crear una interfaz administrativa para gestionar menús y permisos de usuarios de forma visual, eficiente y sin tocar código.

---

## 📐 Arquitectura Técnica

### Backend (NestJS + TypeORM)
```
src/
├── admin/
│   ├── admin.module.ts          (Nuevo módulo)
│   ├── admin-security.controller.ts
│   ├── admin-security.service.ts
│   └── dto/
│       └── assign-menu.dto.ts
```

### Frontend (React + TypeScript)
```
src/
├── pages/
│   └── Admin/
│       ├── SecurityManagementPage.tsx  (Vista principal)
│       └── components/
│           ├── UserAccessTable.tsx     (Tabla de usuarios)
│           ├── MenuEditorModal.tsx     (Editor de menú)
│           └── ProfileBadge.tsx        (Badge de tipo)
├── services/
│   └── admin.service.ts                (API calls)
```

---

## ✅ Checklist de Implementación

### Fase 1: Backend - Módulo de Administración

#### 1.1 Crear Módulo Admin
- [ ] Crear carpeta `backend/src/admin/`
- [ ] Crear `admin.module.ts`
- [ ] Registrar en `app.module.ts`

#### 1.2 DTOs y Validación
- [ ] Crear `dto/assign-menu.dto.ts`
  ```typescript
  export class AssignMenuDto {
    @IsNumber() idUsuario: number;
    @IsOptional() @IsString() customMenu?: string;
  }
  ```

#### 1.3 Service Layer
- [ ] Crear `admin-security.service.ts`
- [ ] Implementar métodos:
  - [ ] `getUsersWithAccessInfo()` - Lista con subordinados y tipo de menú
  - [ ] `assignCustomMenu(userId, menuJson)` - Guardar menú manual
  - [ ] `removeCustomMenu(userId)` - Resetear a automático
  - [ ] `getSecurityProfiles()` - Plantillas disponibles

#### 1.4 Controller Layer
- [ ] Crear `admin-security.controller.ts`
- [ ] Endpoints:
  - [ ] `GET /api/admin/users-access` - Lista de usuarios
  - [ ] `POST /api/admin/assign-menu` - Asignar menú
  - [ ] `DELETE /api/admin/assign-menu/:id` - Quitar menú custom
  - [ ] `GET /api/admin/security-profiles` - Plantillas
- [ ] Proteger con Guard de Admin

#### 1.5 Testing
- [ ] Probar endpoints con Postman
- [ ] Verificar que solo Admin puede acceder
- [ ] Validar que customMenu se guarda correctamente

---

### Fase 2: Frontend - Servicio API

#### 2.1 Admin Service
- [ ] Crear `clarity-pwa/src/services/admin.service.ts`
- [ ] Implementar métodos:
  ```typescript
  getUsersAccess(): Promise<UserAccessInfo[]>
  assignMenu(userId: number, menuJson: string): Promise<void>
  removeCustomMenu(userId: number): Promise<void>
  getProfiles(): Promise<SecurityProfile[]>
  ```

#### 2.2 TypeScript Types
- [ ] Crear interfaces en `types/admin.ts`:
  ```typescript
  interface UserAccessInfo {
    idUsuario: number;
    nombre: string;
    cargo: string;
    departamento: string;
    subordinateCount: number;
    menuType: 'ADMIN' | 'LEADER' | 'EMPLOYEE' | 'CUSTOM';
    hasCustomMenu: boolean;
  }
  ```

---

### Fase 3: Frontend - Componentes UI

#### 3.1 Componente: ProfileBadge
- [ ] Crear `ProfileBadge.tsx`
- [ ] Props: `type: MenuType`
- [ ] Diseño:
  - ADMIN → Badge azul con ícono de escudo
  - LEADER → Badge verde con ícono de usuarios
  - EMPLOYEE → Badge gris con ícono de persona
  - CUSTOM → Badge morado con ícono de engranaje

#### 3.2 Componente: UserAccessTable
- [ ] Crear `UserAccessTable.tsx`
- [ ] Features:
  - [ ] Búsqueda por nombre/carnet
  - [ ] Filtro por tipo de menú
  - [ ] Ordenamiento por columnas
  - [ ] Paginación (50 por página)
- [ ] Columnas:
  - Nombre
  - Cargo
  - Departamento
  - Subordinados (#)
  - Tipo de Menú (Badge)
  - Acciones (Botón "Gestionar")

#### 3.3 Componente: MenuEditorModal
- [ ] Crear `MenuEditorModal.tsx`
- [ ] Props: `user: UserAccessInfo, onClose, onSave`
- [ ] Secciones:
  - [ ] Header con nombre del usuario
  - [ ] Información actual (tipo, subordinados)
  - [ ] Opciones de menú:
    - [ ] Radio: "Automático" (borra custom)
    - [ ] Radio: "Plantilla" (dropdown)
    - [ ] Radio: "Personalizado" (textarea JSON)
  - [ ] Validación de JSON
  - [ ] Botones: Cancelar | Guardar

#### 3.4 Vista Principal: SecurityManagementPage
- [ ] Crear `SecurityManagementPage.tsx`
- [ ] Layout:
  ```
  ┌─────────────────────────────────────┐
  │ 🔐 Gestión de Seguridad y Accesos  │
  ├─────────────────────────────────────┤
  │ [Buscar...] [Filtro: Todos ▼]      │
  ├─────────────────────────────────────┤
  │ UserAccessTable                     │
  │ ┌───────────────────────────────┐  │
  │ │ Nombre | Cargo | Menú | ...   │  │
  │ └───────────────────────────────┘  │
  ├─────────────────────────────────────┤
  │ Mostrando 1-50 de 234  [< 1 2 3 >] │
  └─────────────────────────────────────┘
  ```

---

### Fase 4: Integración y Routing

#### 4.1 Registro de Ruta
- [ ] Agregar en `App.tsx`:
  ```tsx
  <Route 
    path="/app/admin/seguridad" 
    element={
      <ProtectedRoute requireAdmin>
        <SecurityManagementPage />
      </ProtectedRoute>
    } 
  />
  ```

#### 4.2 Menú de Navegación
- [ ] Agregar en `constants/appMenu.ts`:
  ```typescript
  {
    group: 'Administración',
    items: [
      // ... otros items
      {
        path: '/app/admin/seguridad',
        label: 'Seguridad y Accesos',
        icon: 'Shield'
      }
    ]
  }
  ```

---

### Fase 5: Testing y Validación

#### 5.1 Testing Funcional
- [ ] Login como Admin
- [ ] Acceder a `/app/admin/seguridad`
- [ ] Verificar que carga lista de usuarios
- [ ] Buscar un usuario específico
- [ ] Abrir modal de gestión
- [ ] Asignar menú custom
- [ ] Verificar que se guarda en BD
- [ ] Login como ese usuario
- [ ] Verificar que usa el menú custom

#### 5.2 Testing de Seguridad
- [ ] Login como usuario no-admin
- [ ] Intentar acceder a `/app/admin/seguridad`
- [ ] Verificar que redirige o muestra error
- [ ] Intentar llamar API directamente
- [ ] Verificar que backend rechaza (403)

#### 5.3 Testing de Performance
- [ ] Cargar lista con 500+ usuarios
- [ ] Verificar que tarda <2 segundos
- [ ] Probar búsqueda con debouncing
- [ ] Verificar que no hace requests innecesarios

---

## 🎨 Especificaciones de Diseño

### Paleta de Colores
```css
--admin-blue: #3b82f6
--leader-green: #10b981
--employee-gray: #6b7280
--custom-purple: #8b5cf6
--bg-primary: #ffffff
--bg-secondary: #f9fafb
--border: #e5e7eb
```

### Componentes UI
- **Tabla:** Bordes sutiles, hover con bg-gray-50
- **Badges:** Rounded-full, font-semibold, text-xs
- **Modal:** Sombra suave, backdrop blur
- **Botones:** Primario (indigo), Secundario (gray), Peligro (red)

### Responsive
- Desktop (>1024px): Tabla completa
- Tablet (768-1024px): Ocultar columna "Departamento"
- Mobile (<768px): Vista de tarjetas en lugar de tabla

---

## 📊 Estimación de Tiempo

| Fase | Tiempo Estimado | Complejidad |
|------|----------------|-------------|
| Backend (Fase 1) | 2-3 horas | Media |
| Frontend Service (Fase 2) | 1 hora | Baja |
| Componentes UI (Fase 3) | 4-5 horas | Alta |
| Integración (Fase 4) | 1 hora | Baja |
| Testing (Fase 5) | 2 horas | Media |
| **TOTAL** | **10-12 horas** | - |

---

## 🚀 Orden de Ejecución Recomendado

1. **Backend primero** (Fase 1) - Para tener datos reales
2. **Service layer** (Fase 2) - Para conectar con backend
3. **Componentes simples** (ProfileBadge) - Reutilizables
4. **Componentes complejos** (Tabla, Modal) - Usar los simples
5. **Vista principal** - Ensamblar todo
6. **Testing exhaustivo** - Antes de producción

---

## ⚠️ Consideraciones Importantes

### Seguridad
- Todos los endpoints deben validar `rolGlobal === 'Admin'`
- No confiar en validaciones del frontend
- Sanitizar JSON antes de guardar en BD

### Performance
- Implementar paginación en backend (LIMIT/OFFSET)
- Usar índices en columnas de búsqueda
- Cachear lista de perfiles (cambian poco)

### UX
- Mostrar loading states en todas las operaciones
- Confirmación antes de borrar menú custom
- Toast de éxito/error en cada acción
- Desactivar botones durante guardado

---

**Última actualización:** 2026-01-20  
**Estado:** Listo para implementación  
**Prioridad:** Alta (mejora operativa significativa)
