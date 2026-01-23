# 🚀 SUGERENCIAS Y MEJORAS ESTRATÉGICAS: CLARITY / MOMENTUS
> **Objetivo:** Listar las oportunidades de optimización técnica y funcional para llevar el sistema al siguiente nivel.

---

## 1. ⚡ OPTIMIZACIÓN TÉCNICA (BACKEND)

### A. Caché de Visibilidad (Priority: High)
*   **Problema:** La consulta recursiva de visibilidad se ejecuta en cada request, lo cual escalará mal con miles de usuarios.
*   **Solución:** Implementar una tabla de caché `p_VisibilidadCache` o usar Redis. Invalidar la caché solo cuando cambie el jefe de un usuario o se otorgue un permiso de área.

### B. Migración Completa a Stored Procedures
*   **Problema:** Hay lógica mixta entre repositorios TS y SPs de SQL Server.
*   **Solución:** Estandarizar toda la lógica pesada (agregaciones de dashboards, reportes de carga laboral) en SPs para reducir el tráfico de datos entre DB y Backend.

### C. Refactorización de Tipados
*   **Mejora:** Asegurar que todos los resultados de `ejecutarQuery` estén fuertemente tipados con las interfaces de `schema.interfaces.ts`, eliminando el uso de `any` en los servicios.

---

## 🖥️ 2. MEJORAS DE EXPERIENCIA DE USUARIO (FRONTEND)

### A. Implementación de React Query / TanStack Query
*   **Mejora:** Reemplazar los `useEffect` de carga de datos por React Query para manejar estados de carga, error y caché de cliente de forma profesional.

### B. Micro-interacciones y Feedback Visual
*   **Mejora:** Agregar esqueletos de carga (Skeletons) en las tablas y animaciones suaves (framer-motion) al cambiar entre vistas de "Mi Día" para una sensación más premium.

### C. Modo Offline (PWA Real)
*   **Mejora:** Configurar Service Workers para permitir que los usuarios vean su agenda "Mi Día" incluso sin conexión a internet, sincronizando los cambios una vez recuperada la señal.

---

## 🧠 3. NUEVAS FUNCIONALIDADES (INNOVACIÓN)

### A. IA para Predicción de Retrasos
*   **Idea:** Analizar el histórico de tareas para predecir si un proyecto se retrasará antes de que suceda, enviando alertas preventivas al Gerente.

### B. Gamificación de Productividad
*   **Idea:** Implementar un sistema de "Energía" o "Puntos" por completar el Check-in temprano y cerrar tareas a tiempo, fomentando la cultura de transparencia.

### C. Integración Conversacional (Bots)
*   **Idea:** Permitir reportar bloqueos o crear tareas rápidas a través de un Bot de Teams o Telegram, integrando el flujo de trabajo donde el usuario ya se encuentra.

---

## 🛠️ 4. DEBT (DEUDA TÉCNICA)
*   [ ] Limpiar archivos `.bak` y `.txt` temporales en el root del backend.
*   [ ] Estandarizar nombres de columnas en la DB (algunos usan `camelCase` y otros `PascalCase`).
*   [ ] Completar la cobertura de pruebas unitarias para `VisibilidadService`.
