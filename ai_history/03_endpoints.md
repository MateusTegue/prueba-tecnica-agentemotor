# 03 — Implementación de Endpoints del Backend

> Documento cronológico del proceso de análisis, diseño e implementación de los endpoints de la API REST para el MVP del sistema de gestión y renovación de pólizas.

---

## 1. Prompt original

Se solicitó implementar los endpoints principales del backend basados en el `spec.md`:

1. `GET /policies`: Debe retornar información básica de la póliza, cliente asociado, días para vencimiento o días vencidos, estado calculado y prioridad.
2. `GET /policies/priority`: Debe listar pólizas ordenadas por prioridad de negocio:
   * `EXPIRED_RECOVERABLE` primero.
   * Luego `EXPIRING_SOON`.
   * Luego `ACTIVE`.
   * Finalmente `LOST`.
3. `POST /policies/{id}/contact-attempt`: Debe permitir registrar la fecha (u opcionalmente usar la fecha/hora actual), notas y resultado (outcome) de un intento de contacto asociado a una póliza.
4. `POST /policies/{id}/renew`: Debe actualizar la fecha de vencimiento y recalcular automáticamente el estado de la póliza.

**Requisitos importantes:**
* Mantener código limpio y mantenible.
* Separar rutas, servicios y lógica de negocio.
* Centralizar el cálculo de estados en una función reutilizable.
* Usar validaciones simples con Pydantic.
* Evitar complejidad innecesaria.
* Implementar manejo básico de errores y comentarios aclaratorios.

---

## 2. Análisis y diseño técnico

### 2.1 Centralización del cálculo de estados
La lógica temporal se centralizó en dos lugares coordinados:
1. **Pydantic Enum (`TemporalStatus.from_days`)**:
   Implementa el mapeo matemático directo de `days_until_expiration` a los estados definidos por la regulación colombiana de 30 días.
2. **Método de Servicio (`PolicyService._calculate_days_and_status`)**:
   Calcula la diferencia de días entre `expiration_date` y `today` (con `date.today()`), y retorna tanto los días transcurridos como el objeto `TemporalStatus` correspondiente.

### 2.2 Ordenamiento por prioridad
Para ordenar las pólizas según el criterio de negocio de manera consistente:
1. Definimos un mapeo de peso de estados:
   * `EXPIRED_RECOVERABLE` = 0 (máxima urgencia)
   * `EXPIRING_SOON` = 1
   * `ACTIVE` = 2
   * `LOST` = 3 (mínima prioridad)
2. Definimos un mapeo de peso de gestión:
   * `pending` = 0 (lo no gestionado va primero)
   * `contacted` = 1
   * `renewed` = 2
3. La clave de ordenamiento en Python (`priority_key`) ordena tupla por tupla:
   `(status_weight, management_weight, days_until_expiration)`
   * El orden natural ascendente de `days_until_expiration` funciona perfectamente para todos:
     * Para `EXPIRED_RECOVERABLE`, los días más negativos van primero (ej: -30 antes de -1, ya que queda menos tiempo para que venza la ventana).
     * Para `EXPIRING_SOON` y `ACTIVE`, las fechas de vencimiento más próximas van primero.

---

## 3. Endpoints implementados

### 3.1 `GET /policies`
Retorna el listado completo de pólizas con soporte para query params de filtrado y ordenamiento.

* **Filtros**:
  * `temporal_status`: Filtrar por estados temporales calculados (ej: `active,expiring_soon`).
  * `management_status`: Filtrar por estado de gestión (`pending`, `contacted`, `renewed`).
  * `search`: Filtrar por nombre de cliente o número de póliza.
* **Ordenamiento**:
  * `sort`: `priority` (por prioridad), `expiration_date` (por fecha), `client_name` (por cliente).

### 3.2 `GET /policies/priority`
Ruta dedicada y optimizada que lista las pólizas con el ordenamiento por prioridad preestablecido de forma automática.

### 3.3 `POST /policies/{id}/contact-attempt`
Registra un intento de contacto.
* **Request Body**:
  ```json
  {
    "outcome": "no_answer",
    "notes": "No contestó, llamar mañana",
    "created_at": "2026-05-28 09:30:00" // Opcional, por defecto usa la fecha/hora actual del servidor
  }
  ```
* **Lógica asociada**:
  Si el estado de gestión de la póliza es `pending`, al registrar un contacto cambia automáticamente a `contacted`.

### 3.4 `POST /policies/{id}/renew`
Renueva una póliza.
* **Request Body**:
  ```json
  {
    "new_expiration_date": "2027-05-25"
  }
  ```
* **Validaciones**:
  * La nueva fecha de vencimiento debe ser futura.
  * No se puede renovar una póliza que ya está en estado `LOST` (superó la ventana regulatoria de 30 días).
  * No se puede renovar una póliza que ya tenga `management_status = renewed`.

---

## 4. Decisiones y simplificaciones

1. **Uso de sqlite3 estándar**: Evita sobreingeniería y configuración de ORMs pesados. La consulta usa `sqlite3.Row` para mapear directamente a modelos Pydantic de forma limpia.
2. **Validación de fechas en Pydantic**: El modelo `PolicyRenewRequest` valida que `new_expiration_date > date.today()` usando `@field_validator`. Esto rechaza peticiones incorrectas en la capa de entrada del servidor.
3. **Paso opcional de `created_at`**: En los intentos de contacto se permite proveer un campo `created_at` en el body para facilitar testing o carga de datos históricos, pero si se omite, el backend genera el timestamp actual.
4. **Mapeo de errores en HTTPExceptions**:
   * Si la póliza no existe: `404 Not Found`.
   * Si la validación de renovación falla (póliza ya es `LOST` o ya fue renovada): `400 Bad Request` con mensaje explicativo.
   * Cualquier otro fallo de base de datos o inesperado: `500 Internal Server Error`.

---

## 5. Estructura de archivos

La implementación está distribuida siguiendo una arquitectura limpia y desacoplada:

```
src/Backend/
├── models/
│   ├── client.py
│   ├── policy.py
│   └── contact_attempt.py
├── database/
│   ├── connection.py
│   └── seed.py
├── services/
│   └── policy_service.py     # Contiene toda la lógica SQL y algoritmos de clasificación
├── routes/
│   └── policy_routes.py      # Define los endpoints y parsea query params / bodies
└── main.py                   # Inicializa la app y registra los routers
```

---

*Documento generado durante la fase de desarrollo e implementación de endpoints.*  
*Herramienta utilizada: Gemini (Antigravity — Google DeepMind)*  
*Fecha: 2026-05-28*
