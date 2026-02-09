# Plan de Trabajo - Post Diagnóstico

**Fecha:** 8 de Febrero de 2026
**Objetivo:** Validar y completar las implementaciones identificadas en el diagnóstico.

---

## Tareas

### 1. ✅ Verificar Compilación Flutter
- **Comando:** `flutter analyze --no-fatal-infos`
- **Criterio de éxito:** 0 errores.

### 2. 🔄 Mejorar SyncWorker con Pull Automático
- **Problema:** El SyncWorker actual solo sube datos (Push), pero no baja datos nuevos (Pull) del servidor al reconectar.
- **Solución:** Agregar llamada a refrescar repositorios locales después de vaciar la cola.
- **Archivos:** `sync_worker.dart`

### 3. 🔍 Verificar Endpoint de Registro FCM en Backend
- **Buscar:** `POST /notifications/device-token` o similar.
- **Si no existe:** Crearlo.

### 4. ✅ Verificar Compilación Backend
- **Comando:** `npm run build` en `backend/`
- **Criterio de éxito:** 0 errores.

---

## Ejecución

Se ejecutarán en orden. Resultados se documentarán abajo.

---
