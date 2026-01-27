# Mapa de Riesgos: Proyecto Clarity (Post-Migración Jerarquía v2.1)

Este documento clasifica los riesgos técnicos y operativos actuales del proyecto, priorizados por impacto y probabilidad.

---

## 🛑 Nivel 1: Riesgos Críticos (Integridad y Estabilidad)
*Intervención inmediata requerida. Amenazan la consistencia de los datos o la funcionalidad core.*

| ID | Riesgo | Descripción Técnica | Impacto | Probabilidad | Mitigación Propuesta |
|:---|:---|:---|:---|:---|:---|
| **CR-01** | **Escritura Dual (Legacy Code)** | Existen dos vías para escribir tareas: el nuevo `tasks.repo.ts` (seguro) y el viejo `planning.repo.ts` (inseguro). Si se usa el viejo, se saltan validaciones de jerarquía y ciclos. | Corrupción de datos, huérfanos, ciclos infinitos. | **Alta** (Código viejo abunda) | **Deprecate & Redirect:** Renombrar métodos viejos a `_unsafe` y redirigir todo tráfico al nuevo Repo. |
| **CR-02** | **Race Condition en Frontend** | La UI puede mostrar datos viejos del "Padre" tras actualizar un "Hijo". Si el usuario edita el padre basándose en datos viejos, sobreescribe el cálculo automático del servidor. | Pérdida de datos de progreso (Lost Update revertido por usuario). | Media | **Response Enrichment:** API debe devolver siempre el estado actualizado del Padre y UI debe consumirlo. |
| **CR-03** | **Silenciamiento de Errores SQL** | El backend podría no estar mapeando correctamente errores específicos de SQL (ej. `50011` Ciclo Detectado) a excepciones HTTP legibles (`400 Bad Request`). | Usuario recibe "Error 500" sin saber qué hizo mal. Frustración. | Alta | **Exception Filter:** Crear mapeo global de errores SQL -> HTTP en NestJS. |

---

## ⚠️ Nivel 2: Riesgos Altos (Performance y Escalabilidad)
*Afectarán el sistema cuando aumente la carga o el número de usuarios.*

| ID | Riesgo | Descripción Técnica | Impacto | Probabilidad | Mitigación Propuesta |
|:---|:---|:---|:---|:---|:---|
| **AL-01** | **Recursividad N+1 en Lectura** | Al leer una tarea, si se piden sus hijos y nietos, podría estar generando múltiples queries en lugar de un solo `JOIN` o `CTE`. | Lentitud extrema al abrir el Modal de Tareas. | Media | Usar **CTE Recursivo** para leer todo el árbol de una sola vez en `tasks.repo`. |
| **AL-02** | **Visibilidad en Bucle** | `crearTareaMasiva` verifica permisos uno por uno dentro de un loop `for`. | Latencia alta en operaciones masivas. Bloqueo del hilo de Node.js. | Baja (por ahora) | Implementar `bulkCheckPermissions` en `VisibilidadService`. |
| **AL-03** | **Bloqueo de Tablas (Locking)** | El uso de `UPDLOCK, HOLDLOCK` es seguro pero agresivo. Si la transacción dura mucho, bloqueará lecturas de otros usuarios en esa rama del árbol. | Timeouts en horas pico. | Baja | Mantener las transacciones SP **extremadamente cortas**. Optimizar índices. |

---

## 📉 Nivel 3: Riesgos Medios (Mantenibilidad y Deuda Técnica)
*Dificultan el desarrollo futuro, pero no rompen el sistema hoy.*

| ID | Riesgo | Descripción Técnica | Impacto | Probabilidad | Mitigación Propuesta |
|:---|:---|:---|:---|:---|:---|
| **ME-01** | **Strings Mágicos ("Hecha")** | El código SQL y TS usa strings literales para estados. Un cambio de nombre ("Hecha" -> "Finalizada") requiere refactor masivo. | Bugs por typos, refactorización costosa. | Alta | Crear tabla `cat_Estados` y usar ENUMs estrictos sincronizados. |
| **ME-02** | **Logs de Auditoría Dispersos** | Algunos cambios se auditan en `AuditService`, otros logs quedan solo en tablas de sistema o consolas. | Dificultad para rastrear "quién rompió qué". | Media | Centralizar todos los eventos de cambio de estado en un trigger o servicio único. |

---

## ✅ Estado de Mitigaciones Recientes (Lo que YA arreglamos)

*   **Integridad Referencial:** `FK_p_Tareas_Padre` con `NO ACTION` (Solucionado en v2.1).
*   **Ciclos Infinitos:** Constraint `CK_...NoSelfParent` y SP `ValidarNoCiclo` (Solucionado en v2.1).
*   **Cálculos Concurrentes:** Lógica movida a SP con transacciones (Solucionado en v2.1).

---

### Recomendación Estratégica Inmediata

Atacar **CR-01 (Escritura Dual)** es la prioridad absoluta. Mientras exista una "puerta trasera" en el código (`planning.repo.ts`) que permita crear tareas sin las nuevas reglas, todo el sistema de jerarquía es vulnerable.

**¿Procedo a auditar y blindar el código para cerrar la brecha del riesgo CR-01?**
