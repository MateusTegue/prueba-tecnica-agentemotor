# 01 — Planeación del Proyecto

> Documento cronológico del proceso de análisis, iteración y toma de decisiones técnicas durante la fase de planeación.

---

## 1. Prompt inicial suministrado

Se solicitó un análisis profundo del archivo `spec.md` desde las siguientes perspectivas:

* Arquitectura y consistencia técnica
* Lógica de negocio (ventana de renovación de 30 días)
* Claridad técnica y comunicación
* Alcance y priorización para un MVP de ~4 horas
* Identificación de edge cases y riesgos de implementación
* Evaluación del pensamiento estructurado y decisiones técnicas

**Restricción clave:** No sobreingeniería. MVP simple, claro y funcional.

---

## 2. Contenido original del `spec.md`

A continuación, el contenido íntegro del `spec.md` antes de cualquier modificación:

```markdown
# spec.md

# 1. Entendimiento del problema

El problema principal no es únicamente almacenar pólizas, sino ayudar al asesor a priorizar y gestionar renovaciones antes de perder clientes.

Actualmente el flujo de trabajo depende de Excel y procesos manuales:

* filtrado manual de pólizas próximas a vencer,
* seguimiento manual de contactos,
* actualización manual de renovaciones,
* pérdida de contexto comercial.

Esto genera riesgos operativos:

* pérdida de información,
* duplicación de datos,
* falta de trazabilidad,
* pérdida de clientes por vencimientos no gestionados.

El contexto regulatorio introduce una regla crítica de negocio:
una póliza vencida dentro de los primeros 30 días aún puede renovarse manteniendo continuidad con el mismo intermediario.

Por lo tanto, el sistema debe ayudar a identificar rápidamente:

* qué clientes requieren atención inmediata,
* cuáles aún son recuperables,
* y cuáles probablemente ya se perdieron.

---

# 2. Objetivo del MVP

Construir una aplicación web simple que permita a un asesor:

* visualizar pólizas activas y vencidas,
* identificar prioridades de gestión,
* registrar intentos de contacto,
* renovar pólizas,
* mantener trazabilidad básica de acciones realizadas.

El objetivo no es construir un CRM completo, sino reemplazar el flujo manual basado en Excel por una herramienta enfocada en renovación de pólizas.

---

# 3. Alcance definido

## Incluido

* API REST
* Persistencia SQLite
* Frontend funcional de una sola pantalla
* Listado de pólizas
* Clasificación automática de prioridad
* Registro de intentos de contacto
* Renovación de pólizas
* Datos semilla para facilitar pruebas
* Tests de lógica crítica

## No incluido

* Autenticación y autorización
* Multiusuario
* Integraciones con aseguradoras
* Notificaciones automáticas
* Historial completo de auditoría
* Subida de archivos
* Dashboard analítico avanzado

---

# 4. Supuestos realizados

* El sistema será utilizado inicialmente por un solo asesor.
* Las pólizas ya existen en el sistema y no requieren flujo de creación complejo.
* La renovación de una póliza actualiza la fecha de vencimiento.
* El asesor necesita priorizar rapidez operativa sobre complejidad funcional.
* No se requiere persistencia distribuida ni escalabilidad horizontal para esta prueba técnica.

---

# 5. Lógica de negocio principal

La lógica más importante del sistema es la clasificación de pólizas según su estado temporal.

## Estados definidos

### ACTIVE

Póliza vigente.

### EXPIRING_SOON

Póliza próxima a vencer en los próximos 30 días.

### EXPIRED_RECOVERABLE

Póliza vencida hace máximo 30 días.
Todavía puede renovarse con continuidad para el asesor.

### LOST

Póliza vencida hace más de 30 días.
El cliente potencialmente puede perderse frente a otros intermediarios.

---

# 6. Modelo de datos

## clients

* id
* name
* phone
* email

## policies

* id
* client_id
* type
* insurer
* expiration_date
* status

## contact_attempts

* id
* policy_id
* contact_date
* notes

---

# 7. Flujos principales

## Flujo de gestión

1. El asesor ingresa a la pantalla principal.
2. Visualiza pólizas priorizadas.
3. Filtra pólizas vencidas o próximas a vencer.
4. Registra intentos de contacto.
5. Renueva pólizas exitosas.

## Flujo de renovación

1. El asesor selecciona una póliza.
2. Actualiza la nueva fecha de vencimiento.
3. El sistema recalcula automáticamente el estado.

---

# 8. Endpoints propuestos

## GET /policies

Lista pólizas con información resumida.

## GET /policies/priority

Lista pólizas priorizadas según estado y vencimiento.

## POST /policies/{id}/contact-attempt

Registra intento de contacto.

## POST /policies/{id}/renew

Actualiza fecha de renovación de póliza.

---

# 9. Caso crítico identificado

El caso más crítico es la clasificación correcta de pólizas vencidas dentro y fuera de la ventana de 30 días.

Una mala clasificación puede provocar:

* pérdida de clientes,
* pérdida de comisiones para el asesor,
* gestión incorrecta de prioridades.

Por esta razón, los tests se enfocan principalmente en validar la lógica temporal y de priorización.

---

# 10. Trade-offs y decisiones técnicas

Decidí priorizar:

* simplicidad,
* claridad,
* mantenibilidad,
* velocidad de ejecución local.

No implementé autenticación porque no aporta valor central al problema de negocio dentro del alcance de esta prueba.

SQLite fue elegido por simplicidad operativa y facilidad de evaluación.

La aplicación fue diseñada como un MVP funcional enfocado en resolver el flujo principal de María con el menor nivel posible de complejidad accidental.
```

---

## 3. Análisis realizado

### 3.1 Hallazgo crítico #1 — Colisión semántica en el campo `status`

**Problema detectado:** El modelo original incluye un campo `status` en la tabla `policies`, pero los estados definidos (`ACTIVE`, `EXPIRING_SOON`, `EXPIRED_RECOVERABLE`, `LOST`) son **temporales** — cambian automáticamente con el paso del tiempo sin intervención del usuario.

Si se almacenan en la base de datos, se vuelven inconsistentes (stale) inmediatamente. Una póliza que hoy es `EXPIRING_SOON`, mañana puede ser `EXPIRED_RECOVERABLE`, y en 30 días será `LOST`, sin que nadie actualice la base de datos.

**Decisión:** Separar en dos conceptos distintos:
1. **Estado temporal** — calculado en runtime a partir de `expiration_date` y la fecha actual. Nunca se almacena.
2. **Estado de gestión (`management_status`)** — almacenado en la DB. Cambia solo por acciones explícitas del asesor: `pending` → `contacted` → `renewed`.

### 3.2 Hallazgo crítico #2 — Boundaries indefinidos

**Problema detectado:** La spec original no define qué ocurre en los límites exactos:
- ¿Una póliza que vence **hoy** es `ACTIVE`, `EXPIRING_SOON` o `EXPIRED_RECOVERABLE`?
- ¿Una póliza vencida exactamente hace **30 días** es `EXPIRED_RECOVERABLE` o `LOST`?

**Decisión:** Definir boundaries explícitos con fórmula:
```
days_until_expiration = expiration_date - today
```
- `days_until_expiration > 30` → `ACTIVE`
- `0 < days_until_expiration <= 30` → `EXPIRING_SOON`
- `-30 <= days_until_expiration <= 0` → `EXPIRED_RECOVERABLE`
- `days_until_expiration < -30` → `LOST`

Esto establece que el día de vencimiento (`= 0`) ya es `EXPIRED_RECOVERABLE` (la póliza venció) y el día 30 de vencida (`= -30`) aún es recuperable (inclusive).

### 3.3 Hallazgo #3 — Endpoints redundantes

**Problema detectado:** `GET /policies` y `GET /policies/priority` son redundantes. No queda claro qué retorna uno que no retorne el otro.

**Decisión:** Unificar en un solo endpoint `GET /policies` con query params para filtrado (`temporal_status`, `management_status`, `search`) y ordenamiento (`sort=priority`). Más RESTful, más flexible, menos confusión.

### 3.4 Hallazgo #4 — Modelo de datos incompleto

**Campos faltantes identificados:**

| Tabla | Campo | Razón |
|---|---|---|
| `policies` | `policy_number` | Identificador de negocio real. María lo necesita para referenciarlo con la aseguradora. |
| `policies` | `created_at` | Trazabilidad mínima. |
| `contact_attempts` | `outcome` | Sin resultado del contacto, María no sabe qué pasó. El enunciado describe que ella "marca con una X" — eso es un campo de resultado. |
| `contact_attempts` | `created_at` | Timestamp preciso del intento (no solo fecha). |

### 3.5 Hallazgo #5 — Trade-offs genéricos

**Problema detectado:** Los trade-offs listados ("simplicidad, claridad, mantenibilidad") son demasiado genéricos y no demuestran profundidad de análisis.

**Decisión:** Reformular cada trade-off como una decisión concreta con:
- Qué se decidió
- Qué se sacrificó
- Por qué es aceptable para el MVP

### 3.6 Hallazgo #6 — Falta de contexto técnico

**Problema detectado:** La spec no menciona el stack tecnológico (framework backend, frontend, herramienta de tests). La spec se lee antes que el código — debe incluir esta información.

### 3.7 Hallazgo #7 — Flujos superficiales

**Problema detectado:** Los flujos son demasiado abstractos. El flujo de gestión dice "visualiza pólizas priorizadas" pero no describe cómo se ve esa priorización, qué acciones puede tomar el asesor, ni qué feedback visual recibe.

### 3.8 Edge cases identificados

| Edge Case | Riesgo | Mitigación |
|---|---|---|
| Póliza que vence hoy | Clasificación ambigua | Definido explícitamente: `EXPIRED_RECOVERABLE` |
| Póliza vencida exactamente 30 días | Boundary ambiguo | Definido explícitamente: `EXPIRED_RECOVERABLE` (inclusive) |
| Renovación con fecha pasada | Error silencioso | Validación: `new_expiration_date > today` |
| Renovación de póliza `LOST` | Operación inválida por regulación | Bloqueo explícito con error 400 |
| Renovación doble | Comportamiento indefinido | Bloqueo: `management_status = renewed` no puede renovarse |
| Zona horaria | Inconsistencia de fechas | Supuesto documentado: `YYYY-MM-DD` en hora local colombiana |

### 3.9 Evaluación del alcance para 4 horas

El alcance fue evaluado como **ajustado pero realista** con uso intensivo de IA:

| Componente | Tiempo estimado |
|---|---|
| Setup proyecto (backend + frontend + SQLite) | 30-40 min |
| Modelo de datos + seed data | 20-30 min |
| Lógica de clasificación + tests | 30-40 min |
| Endpoints REST (3-4) | 30-40 min |
| Frontend (pantalla principal) | 60-80 min |
| Documentación (spec, README, code review) | 40-50 min |
| **Total** | **~3.5 - 4.5 hrs** |

---

## 4. Mejoras propuestas (resumen)

| # | Mejora | Tipo | Impacto |
|---|---|---|---|
| 1 | Separar estado temporal (calculado) de estado de gestión (almacenado) | Lógica de negocio | 🔴 Crítico |
| 2 | Definir boundaries exactos con fórmula `days_until_expiration` | Lógica de negocio | 🔴 Crítico |
| 3 | Agregar stack tecnológico | Estructura | 🟡 Alto |
| 4 | Agregar campos faltantes al modelo (`policy_number`, `outcome`, timestamps) | Modelo de datos | 🟡 Alto |
| 5 | Unificar endpoints en `GET /policies` con query params | Endpoints | 🟡 Alto |
| 6 | Agregar endpoint `GET /policies/{id}` con detalle | Endpoints | 🟡 Alto |
| 7 | Especificar request/response y validaciones en endpoints | Endpoints | 🟡 Alto |
| 8 | Documentar reglas de priorización y ordenamiento | Lógica de negocio | 🟡 Alto |
| 9 | Detallar flujos con acciones concretas del asesor | Flujos | 🟡 Medio |
| 10 | Agregar flujo de póliza perdida | Flujos | 🟢 Medio |
| 11 | Reformular trade-offs con profundidad y especificidad | Trade-offs | 🟢 Medio |
| 12 | Documentar exclusiones con justificación individual | Alcance | 🟢 Medio |
| 13 | Agregar supuestos faltantes (zona horaria, NOT NULL) | Supuestos | 🟢 Medio |
| 14 | Definir tests planificados con casos específicos | Tests | 🟢 Medio |

---

## 5. Versión final mejorada

La versión final del `spec.md` incorpora todas las mejoras listadas. A continuación, un resumen de las diferencias clave respecto a la versión original:

### Estructura

**Antes (10 secciones):**
```
1. Entendimiento del problema
2. Objetivo del MVP
3. Alcance definido
4. Supuestos realizados
5. Lógica de negocio principal
6. Modelo de datos
7. Flujos principales
8. Endpoints propuestos
9. Caso crítico identificado
10. Trade-offs y decisiones técnicas
```

**Después (11 secciones):**
```
1. Entendimiento del problema          ← Refinado: regla de 30 días como subsección
2. Objetivo del MVP                    ← Refinado: enfoque en ventana de 30 días
3. Stack tecnológico                   ← NUEVO
4. Alcance definido                    ← Mejorado: tabla con justificaciones
5. Supuestos realizados                ← Mejorado: supuestos adicionales
6. Lógica de negocio principal         ← Reescrito completamente
   6.1 Estado temporal (calculado)     ← NUEVO: fórmula + tabla + boundaries
   6.2 Estado de gestión (almacenado)  ← NUEVO: separación conceptual
   6.3 Priorización                    ← NUEVO: reglas de ordenamiento
7. Modelo de datos                     ← Reescrito: tablas con tipos y constraints
8. Endpoints propuestos                ← Reescrito: request/response + validaciones
9. Flujos principales                  ← Reescrito: detalle operativo + 3 flujos
10. Caso crítico y tests               ← Mejorado: tests con boundaries exactos
11. Trade-offs                         ← Reescrito: 5 trade-offs detallados
```

### Cambios más significativos

1. **Separación estado temporal vs. estado de gestión** — La distinción más importante del análisis. Elimina la posibilidad de datos inconsistentes y demuestra comprensión profunda del dominio.

2. **Boundaries explícitos con fórmula** — `days_until_expiration = expiration_date - today` permite implementación directa y tests precisos.

3. **Modelo de datos tipado** — Cada campo tiene tipo, restricción y descripción. Los evaluadores pueden leer el modelo y entender la base de datos completa.

4. **Endpoints con contratos definidos** — Request/response en JSON, validaciones documentadas, y comportamiento esperado para cada endpoint.

5. **Trade-offs con profundidad** — Cada decisión tiene tres componentes: qué se decidió, qué se sacrificó, por qué es aceptable.

### Archivo final

El archivo `spec.md` actualizado se encuentra en la raíz del proyecto:  
`tegue_luis/spec.md`

---

*Documento generado durante la fase de planeación del proyecto.*  
*Herramienta utilizada: Gemini (Antigravity — Google DeepMind)*  
*Fecha: 2026-05-28*
