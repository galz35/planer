# Sugerencia de Seguridad: Protección de Datos en URL

Actualmente, para mejorar la experiencia de usuario y evitar esperas de carga (flicker), estamos pasando datos sensibles (Carnet y Nombre) directamente en los parámetros de búsqueda (Query Params):
`?carnet=401992&nombre=MILCY+CAROLINA...`

Aunque esto funciona perfectamente, a futuro se pueden considerar las siguientes estrategias para "ocultar" o proteger esta información del historial del navegador o de miradas indiscretas.

---

## 1. Uso de `Location State` (Recomendado)
React Router permite pasar un objeto de estado que **no es visible en la URL** y que persiste durante la navegación de la sesión.

### Implementación al Navegar
```tsx
// En MiEquipoPage.tsx
navigate(`/app/agenda/${uid}`, { 
  state: { 
    carnet: e.carnet, 
    nombre: e.nombreCompleto 
  } 
});
```

### Implementación al Recibir
```tsx
// En MemberAgendaPage.tsx
const location = useLocation();
const { carnet, nombre } = location.state || {}; // Se extraen sin estar en la URL
```
**Pros:** URL limpia (`/app/agenda/28`), datos protegidos.  
**Cons:** Si el usuario presiona F5 (Refrescar), el `state` se pierde a menos que se guarde adicionalmente en un cache local (SWR/React Query).

---

## 2. Codificación Base64 (Ofuscación)
No es encriptación real, pero evita que el nombre sea legible a simple vista.

### Ejemplo
`?p=NDAxOTkyfE1JTENZ...` (donde `p` es un string base64)

```tsx
const payload = btoa(`carnet=${carnet}&nombre=${nombre}`);
navigate(`/app/agenda/${uid}?p=${payload}`);

// Para leerlo:
const params = new URLSearchParams(window.location.search);
const decoded = atob(params.get('p'));
```

---

## 3. Tokens Temporales (Seguridad Alta)
Generar un ID de sesión corto en el backend o en un Store global que asocie el ID `28` con una carga de datos específica.

---

## Próximos Pasos Sugeridos
Para una implementación futura, la opción de **`Location State` combinado con un Store Global (Zustand/Redux)** es la más profesional, ya que permite que la URL sea `/app/agenda/28` y que el sistema "sepa" quién es esa persona porque ya la cargó previamente en la vista de lista.
