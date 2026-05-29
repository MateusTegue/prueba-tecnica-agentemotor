# spec.md — Sistema de Gestión de Renovación de Pólizas

---

## 1. Entendimiento del problema

El problema central no es almacenar pólizas, sino **ayudar al asesor a priorizar y gestionar renovaciones antes de perder clientes**.

María, asesora con 280 clientes activos, gestiona su cartera desde un Excel con procesos manuales:

* filtrado manual de pólizas próximas a vencer cada lunes,
* seguimiento manual de contactos sin trazabilidad,
* actualización manual de renovaciones,
* pérdida frecuente de contexto comercial.

Esto genera riesgos operativos concretos:

* pérdida de información por corrupción o duplicación del Excel,
* falta de trazabilidad sobre qué se ofreció a quién,
* pérdida de 5-10 clientes al mes por vencimientos no gestionados.

### Regla de negocio crítica — Ventana de renovación de 30 días

En Colombia, una póliza de auto vencida puede ser renovada por el mismo intermediario **dentro de los 30 días calendario siguientes** a la fecha de vencimiento, sin que el cliente pierda historial ni la aseguradora trate la operación como nueva contratación.

Después de esos 30 días, la renovación se considera **nueva contratación** y el asesor compite con cualquier otro intermediario. Esto significa pérdida potencial del cliente y de las comisiones recurrentes.

**Esta ventana de 30 días es el eje central del sistema.** Toda la lógica de priorización gira alrededor de ella.

---

## 2. Objetivo del MVP

Construir una aplicación web simple que permita a un asesor:

* visualizar pólizas clasificadas por urgencia de gestión,
* identificar rápidamente qué requiere atención inmediata,
* registrar intentos de contacto con resultado,
* renovar pólizas actualizando su fecha de vencimiento,
* mantener trazabilidad básica de acciones realizadas.

El objetivo **no** es construir un CRM completo, sino reemplazar el flujo manual basado en Excel por una herramienta enfocada en la renovación de pólizas dentro de la ventana crítica de 30 días.

---

## 3. Stack tecnológico

| Capa | Tecnología | Justificación |
|---|---|---|
| Backend | Python + FastAPI | Tipado fuerte, async nativo, documentación automática con OpenAPI |
| Base de datos | SQLite | Simplicidad operativa, cero configuración, facilidad de evaluación |
| Frontend | React (Vite) | Componentización, ecosistema maduro, velocidad de desarrollo |
| Tests | pytest | Integrado con Python, fixtures nativos, assertions claras |

---

## 4. Alcance definido

### Incluido

* API REST con endpoints documentados
* Persistencia en SQLite
* Frontend funcional de una sola pantalla principal
* Listado de pólizas con clasificación automática por prioridad
* Registro de intentos de contacto con resultado
* Renovación de pólizas
* Datos semilla (seed) con escenarios representativos de los 4 estados temporales
* 2-3 tests del caso más crítico (lógica de clasificación temporal)

### No incluido (con justificación)

| Funcionalidad                          | Razón de exclusión                                                                        |
|----------------------------------------|-------------------------------------------------------------------------------------------|
| Autenticación y autorización           | No aporta valor al problema de negocio. El sistema es mono-asesor para el MVP.            |
| Multiusuario / `advisor_id`            | El sistema asume un solo asesor. En producción, sería un campo obligatorio en `policies`. |
| Integraciones con aseguradoras          | Fuera del alcance. Las pólizas se cargan como datos existentes.                          |
| Notificaciones automáticas (email/SMS) | Valor agregado importante, pero no esencial para validar el flujo principal.              |
| Historial completo de auditoría        | Se registran intentos de contacto y renovaciones, pero no un log de auditoría completo.   |
| CRUD completo de clientes/pólizas      | Las pólizas y clientes ya existen en el sistema. No se requiere flujo de alta/baja.       |
| Dashboard analítico avanzado           | El MVP se enfoca en gestión operativa, no en análisis.                                    |

---

## 5. Supuestos realizados

* El sistema será utilizado inicialmente por **un solo asesor** (María).
* Las pólizas y clientes ya existen en el sistema y se cargan mediante datos semilla.
* La renovación actualiza la fecha de vencimiento **in-place** sobre la misma póliza (ver trade-off en sección 11).
* El asesor necesita priorizar **rapidez operativa** sobre complejidad funcional.
* Las fechas se manejan como `YYYY-MM-DD` en hora local colombiana (UTC-5), sin componente de hora.
* No se requiere persistencia distribuida ni escalabilidad horizontal.
* Una póliza siempre tiene una `expiration_date` válida (NOT NULL).

---

## 6. Lógica de negocio principal

La lógica más importante del sistema es la clasificación de pólizas según su posición temporal relativa a la fecha actual y a la ventana regulatoria de 30 días.

### 6.1 Estado temporal (calculado en runtime)

> **Decisión clave:** El estado temporal **nunca se almacena en la base de datos**. Se calcula en cada consulta a partir de `expiration_date` y la fecha actual (`today`). Esto garantiza que la clasificación siempre sea correcta sin necesidad de jobs programados ni actualizaciones manuales.

Se define `days_until_expiration = expiration_date - today` (positivo si aún no vence, negativo si ya venció).

| Estado                  | Condición                   | Significado                                                  |
|-------------------------|-----------------------------|--------------------------------------------------------------|
| `ACTIVE`                | `days_until_expiration > 30`        | Póliza vigente sin acción requerida.                         |
| `EXPIRING_SOON`         | `0 < days_until_expiration <= 30`   | Póliza próxima a vencer. Requiere gestión proactiva.         |
| `EXPIRED_RECOVERABLE`   | `-30 <= days_until_expiration <= 0` | Póliza vencida dentro de la ventana de 30 días. **Aún puede renovarse con continuidad.** Urgencia máxima. |
| `LOST`                  | `days_until_expiration < -30`       | Póliza vencida hace más de 30 días. El cliente potencialmente se perdió frente a otros intermediarios. |

#### Boundaries explícitos

* Una póliza que vence **hoy** (`days_until_expiration = 0`): se clasifica como `EXPIRED_RECOVERABLE` — ya venció y empieza a correr la ventana de 30 días.
* Una póliza vencida exactamente hace **30 días** (`days_until_expiration = -30`): se clasifica como `EXPIRED_RECOVERABLE` — todavía está dentro de la ventana (inclusive).
* Una póliza vencida hace **31 días** (`days_until_expiration = -31`): se clasifica como `LOST`.

### 6.2 Estado de gestión (almacenado en DB)

El campo `management_status` en la tabla `policies` representa el estado de la gestión realizada por el asesor. Este estado **sí se almacena** y cambia solo por acciones explícitas del asesor.

| Estado      | Significado                                              |
|-------------|----------------------------------------------------------|
| `pending`   | Póliza sin gestionar. Estado inicial.                   |
| `contacted` | El asesor ha realizado al menos un intento de contacto. |
| `renewed`   | Póliza renovada exitosamente.                           |

### 6.3 Priorización en la pantalla principal

Las pólizas se muestran ordenadas por urgencia descendente:

1. **`EXPIRED_RECOVERABLE`** — ordenadas por días desde el vencimiento (las más cercanas al límite de 30 días primero, porque son las que más riesgo tienen de perderse).
2. **`EXPIRING_SOON`** — ordenadas por fecha de vencimiento ascendente (las que vencen antes, primero).
3. **`ACTIVE`** — ordenadas por fecha de vencimiento ascendente.
4. **`LOST`** — al final, como referencia. No requieren acción.

Dentro de cada grupo, las pólizas con `management_status = pending` se muestran antes que las ya gestionadas (`contacted`).

---

## 7. Modelo de datos

### clients

| Campo | Tipo | Restricción | Descripción |
|-------------------|---------|-------------------|---------------------------------|
| `id`    | INTEGER | PK, autoincrement           | Identificador interno           |
| `name`  | TEXT    | NOT NULL                    | Nombre completo del cliente     |
| `phone` | TEXT    | NOT NULL                    | Teléfono de contacto            |
| `email` | TEXT    |                             | Correo electrónico (opcional)   |

### policies

| Campo | Tipo | Restricción | Descripción |
|-----------------------|---------|-----------------------------|-------------------------------------------------------|
| `id`                  | INTEGER | PK, autoincrement           | Identificador interno                                 |
| `policy_number`       | TEXT    | NOT NULL, UNIQUE            | Número de la póliza (identificador de negocio)        |
| `client_id`           | INTEGER | FK → clients.id, NOT NULL   | Cliente titular                                       |
| `type`                | TEXT    | NOT NULL                    | Tipo de seguro: `auto`, `hogar`, `vida`, etc.         |
| `insurer`             | TEXT    | NOT NULL                    | Nombre de la aseguradora                              |
| `expiration_date`     | TEXT    | NOT NULL                    | Fecha de vencimiento (`YYYY-MM-DD`)                   |
| `management_status`   | TEXT    | NOT NULL, DEFAULT 'pending' | Estado de gestión: `pending`, `contacted`, `renewed`  |
| `created_at`          | TEXT    | NOT NULL                    | Fecha de creación del registro                        |

> **Nota:** No se almacena un campo de estado temporal. Los estados `ACTIVE`, `EXPIRING_SOON`, `EXPIRED_RECOVERABLE` y `LOST` se derivan en cada consulta comparando `expiration_date` con la fecha actual.

### contact_attempts

| Campo         | Tipo    | Restricción                 | Descripción                                                               |
|---------------|---------|-----------------------------|---------------------------------------------------------------------------|
| `id`          | INTEGER | PK, autoincrement           | Identificador interno                                                     |
| `policy_id`   | INTEGER | FK → policies.id, NOT NULL  | Póliza gestionada                                                         |
| `outcome`     | TEXT    | NOT NULL                    | Resultado: `successful`, `no_answer`, `callback_requested`, `wrong_number`|
| `notes`       | TEXT    |                             | Notas del asesor (ej: "pidió llamar el viernes")                          |
| `created_at`  | TEXT    | NOT NULL                    | Timestamp del intento (`YYYY-MM-DD HH:MM:SS`)                             |

---

## 8. Endpoints propuestos

### `GET /policies`

Lista pólizas con su estado temporal calculado y datos del cliente.

**Query params:**

| Param               | Tipo   | Default | Descripción                                                                   |
|---------------------|--------|---------|-------------------------------------------------------------------------------|
| `temporal_status`   | string | (todos) | Filtrar por estado(s) temporal(es). Valores: `active`, `expiring_soon`, `expired_recoverable`, `lost`. Múltiples separados por coma. |
| `management_status` | string | (todos) | Filtrar por estado de gestión: `pending`, `contacted`, `renewed`.              |
| `search`            | string |         | Búsqueda por nombre de cliente o número de póliza.                            |
| `sort`              | string | `priority` | Ordenamiento: `priority` (default), `expiration_date`, `client_name`.             |

**Response (200):**

```json
[
  {
    "id": 1,
    "policy_number": "POL-2024-001",
    "client": {
      "id": 1,
      "name": "Carlos Martínez",
      "phone": "3001234567"
    },
    "type": "auto",
    "insurer": "Sura",
    "expiration_date": "2026-05-25",
    "temporal_status": "expired_recoverable",
    "days_until_expiration": -3,
    "management_status": "pending",
    "contact_attempts_count": 0
  }
]
```

### `GET /policies/{id}`

Retorna detalle de una póliza con datos del cliente y lista de intentos de contacto.

**Response (200):**

```json
{
  "id": 1,
  "policy_number": "POL-2024-001",
  "client": {
    "id": 1,
    "name": "Carlos Martínez",
    "phone": "3001234567",
    "email": "carlos@email.com"
  },
  "type": "auto",
  "insurer": "Sura",
  "expiration_date": "2026-05-25",
  "temporal_status": "expired_recoverable",
  "days_until_expiration": -3,
  "management_status": "contacted",
  "contact_attempts": [
    {
      "id": 1,
      "outcome": "no_answer",
      "notes": "No contestó, intentar en la tarde",
      "created_at": "2026-05-26 10:30:00"
    }
  ]
}
```

### `POST /policies/{id}/contact-attempts`

Registra un intento de contacto para una póliza. Actualiza automáticamente `management_status` a `contacted` si estaba en `pending`.

**Request body:**

```json
{
  "outcome": "no_answer",
  "notes": "No contestó, intentar en la tarde"
}
```

**Validaciones:**
* `outcome` debe ser uno de: `successful`, `no_answer`, `callback_requested`, `wrong_number`.
* La póliza debe existir.

**Response (201):** El intento de contacto creado.

### `POST /policies/{id}/renew`

Renueva una póliza actualizando su fecha de vencimiento y su estado de gestión.

**Request body:**

```json
{
  "new_expiration_date": "2027-05-25"
}
```

**Validaciones:**
* `new_expiration_date` debe ser una fecha futura (`> today`).
* Solo pólizas con estado temporal `ACTIVE`, `EXPIRING_SOON` o `EXPIRED_RECOVERABLE` pueden renovarse.
* Una póliza con estado temporal `LOST` **no puede renovarse** (la ventana regulatoria ya cerró).
* Una póliza con `management_status = renewed` no puede renovarse nuevamente.

**Response (200):** La póliza actualizada con `management_status = renewed` y nuevo `expiration_date`.

**Response (400):** Si la validación falla, con mensaje descriptivo.

---

## 9. Flujos principales

### Flujo de gestión diaria

1. El asesor ingresa a la pantalla principal.
2. Ve las pólizas ordenadas por prioridad: primero las `EXPIRED_RECOVERABLE` (rojo), luego `EXPIRING_SOON` (amarillo), luego `ACTIVE` (verde).
3. Identifica rápidamente cuántas pólizas requieren atención inmediata mediante contadores o badges por estado.
4. Para cada póliza que requiere atención:
   * Hace clic en **"Registrar contacto"** → se abre un formulario donde ingresa el resultado del contacto y notas opcionales.
   * Si el contacto fue exitoso y el cliente desea renovar → hace clic en **"Renovar"** → ingresa la nueva fecha de vencimiento.
5. Las pólizas gestionadas se actualizan visualmente (el `management_status` cambia).
6. El asesor puede filtrar por estado temporal o buscar por nombre de cliente para enfocarse en segmentos específicos.

### Flujo de renovación

1. El asesor selecciona una póliza (debe ser `ACTIVE`, `EXPIRING_SOON` o `EXPIRED_RECOVERABLE`).
2. Hace clic en "Renovar" e ingresa la nueva fecha de vencimiento.
3. El sistema valida que la fecha sea futura.
4. Se actualiza `expiration_date` con la nueva fecha y `management_status` a `renewed`.
5. El estado temporal se recalcula automáticamente en la siguiente consulta.
6. La póliza aparece ahora como `ACTIVE` en la lista.

### Flujo de póliza perdida

1. Una póliza supera los 30 días de vencida sin ser renovada.
2. El sistema la clasifica automáticamente como `LOST` (calculado en runtime).
3. La póliza aparece al final de la lista como referencia, pero no requiere acción.
4. El asesor puede filtrar para ocultar pólizas `LOST` y enfocarse en las accionables.

---

## 10. Caso crítico identificado y estrategia de tests

### Caso crítico

La **clasificación correcta de pólizas según su posición temporal** es la lógica más importante del sistema. Una clasificación incorrecta puede provocar:

* **pérdida de clientes** — si una póliza `EXPIRED_RECOVERABLE` no se muestra con urgencia, el asesor no actúa a tiempo.
* **pérdida de comisiones** — cada cliente perdido es ingreso recurrente que se va.
* **gestión incorrecta de prioridades** — si una póliza `ACTIVE` se muestra como urgente, el asesor pierde tiempo en lo que no importa.

### Tests planificados

Los tests se enfocan en validar la lógica temporal con los boundaries críticos:

1. **Test de clasificación temporal completa:** Dado un conjunto de pólizas con diferentes fechas de vencimiento (futura lejana, próxima 30 días, hoy, vencida ayer, vencida 30 días, vencida 31 días), validar que cada una recibe el estado temporal correcto.

2. **Test de boundaries exactos:** Validar específicamente los casos borde:
   * `expiration_date = today` → `EXPIRED_RECOVERABLE`
   * `expiration_date = today - 30 days` → `EXPIRED_RECOVERABLE`
   * `expiration_date = today - 31 days` → `LOST`
   * `expiration_date = today + 1 day` → `EXPIRING_SOON`
   * `expiration_date = today + 30 days` → `EXPIRING_SOON`
   * `expiration_date = today + 31 days` → `ACTIVE`

3. **Test de renovación con validación:** Validar que una póliza `EXPIRED_RECOVERABLE` se puede renovar y que una póliza `LOST` es rechazada.

---

## 11. Trade-offs y decisiones técnicas

### Renovación in-place vs. registro histórico

**Decisión:** La renovación actualiza `expiration_date` directamente sobre la póliza existente.

**Trade-off aceptado:** Se pierde el historial de renovaciones previas. En producción, se crearía un nuevo registro de póliza vinculado al anterior para mantener trazabilidad completa.

**Justificación para el MVP:** Simplifica significativamente el modelo de datos y el flujo de UI. El asesor no necesita consultar renovaciones anteriores para resolver su problema inmediato: gestionar la renovación actual.

### Estado temporal calculado vs. almacenado

**Decisión:** Los estados temporales se calculan en runtime en cada consulta.

**Trade-off aceptado:** Ligeramente más costoso computacionalmente que leer un campo almacenado.

**Justificación:** Elimina la posibilidad de datos inconsistentes. Un estado almacenado se vuelve stale automáticamente con el paso del tiempo y requeriría un job programado para actualizarlo — complejidad innecesaria para 280 clientes.

### Mono-asesor vs. multiusuario

**Decisión:** El sistema asume un solo asesor y no implementa autenticación.

**Trade-off aceptado:** No es escalable a múltiples asesores sin agregar `advisor_id` y un sistema de autenticación.

**Justificación:** Autenticación y multiusuario no aportan valor para demostrar la resolución del problema de negocio en esta prueba técnica.

### SQLite vs. base de datos relacional

**Decisión:** SQLite como motor de persistencia.

**Trade-off aceptado:** No soporta concurrencia de escritura ni escalabilidad horizontal.

**Justificación:** Cero configuración, facilidad de evaluación (un solo archivo), y suficiente para el volumen de datos del MVP (~280 clientes, ~500 pólizas).

### Frontend mínimo viable vs. dashboard completo

**Decisión:** Una sola pantalla con tabla funcional, filtros básicos y acciones inline.

**Trade-off aceptado:** No hay visualizaciones gráficas, métricas agregadas ni vistas por cliente.

**Justificación:** El valor del MVP está en la gestión operativa diaria, no en el análisis. Una tabla funcional con la priorización correcta resuelve el 80% del problema de María.
