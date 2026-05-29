# 04 — Implementación de Lógica de Negocio

> Documento cronológico del proceso de análisis, diseño e implementación de la lógica crítica de negocio en el backend (clasificación, priorización y ciclo de renovación).

---

## 1. Prompt original

Se solicitó mejorar y completar la lógica principal del backend basada en los endpoints y en el comportamiento esperado del negocio:

1. **Endpoint `GET /policies/priority`**:
   * Retornar pólizas ordenadas por prioridad real de negocio: `EXPIRED_RECOVERABLE` → `EXPIRING_SOON` → `ACTIVE` → `LOST`.
   * Dentro de `EXPIRED_RECOVERABLE`, las pólizas más cercanas a cumplir 30 días de vencidas deben aparecer primero.
   * Dentro de `EXPIRING_SOON`, las más próximas a vencer primero.
   * La prioridad debe reflejar impacto comercial real para el asesor.
2. **Endpoint `POST /policies/{id}/contact-attempt`**:
   * Permitir registrar gestión comercial sobre una póliza (crear intento de contacto, almacenar fecha y notas, actualizar automáticamente `management_status` de `pending` a `contacted`).
   * Manejar pólizas inexistentes, validaciones básicas y respuestas claras.
3. **Endpoint `POST /policies/{id}/renew`**:
   * Renovar póliza actualizando `expiration_date` in-place, recalcular automáticamente el estado temporal e iniciar/actualizar el estado de gestión a `renewed`.
4. **Requisitos**:
   * Mantener arquitectura simple, evitar sobreingeniería, reutilizar lógica centralizada de estados y ser consistente con `spec.md`.

---

## 2. Análisis y diseño de la lógica de prioridad

El ordenamiento de pólizas es el corazón comercial de la aplicación para María. La prioridad se estructura bajo las siguientes reglas:

### 2.1 Niveles de prioridad por estado temporal
1. **`EXPIRED_RECOVERABLE` (Prioridad 1 — Urgente)**: Pólizas vencidas hace menos de 30 días. Si no se actua de inmediato, el cliente se perderá de forma permanente al cerrarse la ventana regulatoria.
2. **`EXPIRING_SOON` (Prioridad 2 — Media-Alta)**: Pólizas que vencerán en los próximos 30 días. Permite contactar al cliente con antelación antes del vencimiento.
3. **`ACTIVE` (Prioridad 3 — Baja)**: Pólizas vigentes que tienen más de 30 días de vigencia restante. No requieren acción inmediata.
4. **`LOST` (Prioridad 4 — Sin Acción)**: Pólizas vencidas hace más de 30 días. Ya están perdidas regulatoria y comercialmente.

### 2.2 Sub-ordenamiento crítico
El sub-ordenamiento se define para optimizar la toma de decisiones:
* **En `EXPIRED_RECOVERABLE`**:
  * Si una póliza vence en `-28` días (vencida hace 28 días) y otra en `-3` días (vencida hace 3 días), la de `-28` es extremadamente crítica porque solo quedan 2 días antes de perderla permanentemente.
  * Por ende, el orden debe ser ascendente según el número de días (`-28` va antes de `-3`), colocando las más cercanas al límite de 30 días primero.
* **En `EXPIRING_SOON`**:
  * Si una póliza vence en `2` días y otra en `28` días, la de `2` días tiene mayor urgencia.
  * El orden debe ser ascendente según el número de días (`2` va antes de `28`), colocando las más próximas a vencer primero.
* **En `ACTIVE`**:
  * Orden de vencimiento ascendente para prever las que entrarán próximamente al ciclo de renovación.

### 2.3 Implementación de la clave de ordenamiento (Priority Key)
El algoritmo se implementó mediante la función `priority_key` que aprovecha el ordenamiento de tuplas en Python:

```python
def priority_key(p: PolicyResponse):
    return (
        status_order[p.temporal_status],  # EXPIRED_RECOVERABLE (0) -> EXPIRING_SOON (1) -> ACTIVE (2) -> LOST (3)
        p.days_until_expiration,          # Menor número de días primero (-30 antes de -1, 1 antes de 30)
        mgmt_order[p.management_status]    # pending (0) -> contacted (1) -> renewed (2)
    )
```

Este diseño elegante resuelve el problema de ordenamiento comercial en una sola pasada $O(N \log N)$ sin consultas complejas en SQL.

---

## 3. Comportamientos y endpoints implementados

### 3.1 `GET /policies/priority`
Retorna la lista de pólizas ordenadas por la prioridad descrita arriba.
* **Manejo en código**: Llama al método `PolicyService.get_policies` pasando `sort="priority"`. El servicio realiza la query y luego ejecuta el ordenamiento de tuplas en memoria usando la `priority_key`.

### 3.2 `POST /policies/{id}/contact-attempt`
Permite registrar un intento de contacto y gestionar el estado.
* **Comportamiento**:
  * Crea un registro en `contact_attempts`.
  * Si la póliza tiene `management_status = 'pending'`, cambia automáticamente a `'contacted'` para reflejar que el asesor ya inició la gestión.
* **Manejo de errores**:
  * Si la póliza no existe, lanza un `HTTPException(404, "La póliza no existe.")`.
  * Valida que el `outcome` enviado sea uno de los valores definidos en el enum.

### 3.3 `POST /policies/{id}/renew`
Actualiza e inicia el nuevo ciclo de la póliza.
* **Comportamiento**:
  * Actualiza la fecha de vencimiento (`expiration_date`) en la DB.
  * Modifica `management_status` a `'renewed'`.
  * La próxima consulta calculará el nuevo estado temporal en runtime (que será `ACTIVE` o `EXPIRING_SOON` según la fecha ingresada), moviéndola de forma natural fuera del grupo de urgencia.
* **Validaciones y Edge Cases**:
  * No se permite renovar pólizas que ya estén en estado `LOST` (superaron la ventana regulatoria de 30 días).
  * No se permite renovar una póliza que ya tenga estado `renewed`.
  * La nueva fecha de vencimiento debe ser futura.

---

## 4. Decisiones y simplificaciones

1. **Fecha actual dinámica**: Para el cálculo del estado temporal y ordenamientos, se utiliza `date.today()` en runtime. Esto asegura la consistencia del sistema en cualquier momento del tiempo.
2. **Cálculo en runtime**: Al calcular el estado temporal y los días en memoria al obtener los datos, evitamos que la base de datos se desincronice. Esto elimina la necesidad de workers o cronjobs que actualicen estados diariamente.
3. **Persistencia simple**: La renovación in-place simplifica drásticamente el flujo del MVP, manteniendo la base de datos pequeña y eficiente para la evaluación.

---

## 5. Resumen técnico del código implementado

### Lógica de Clasificación (`models/policy.py`)
```python
@staticmethod
def from_days(days_until_expiration: int) -> "TemporalStatus":
    if days_until_expiration > 30:
        return TemporalStatus.ACTIVE
    elif days_until_expiration > 0:
        return TemporalStatus.EXPIRING_SOON
    elif days_until_expiration >= -30:
        return TemporalStatus.EXPIRED_RECOVERABLE
    else:
        return TemporalStatus.LOST
```

### Rutas (`routes/policy_routes.py`)
```python
@router.post("/{policy_id}/contact-attempt", response_model=ContactAttemptResponse, status_code=status.HTTP_201_CREATED)
def create_contact_attempt(policy_id: int, attempt: ContactAttemptCreate, db: sqlite3.Connection = Depends(get_db)):
    result = PolicyService.create_contact_attempt(db, policy_id, attempt)
    if not result:
        raise HTTPException(status_code=404, detail="La póliza no existe.")
    return result

@router.post("/{policy_id}/renew", response_model=PolicyDetailResponse)
def renew_policy(policy_id: int, request: PolicyRenewRequest, db: sqlite3.Connection = Depends(get_db)):
    success, message, updated_policy = PolicyService.renew_policy(db, policy_id, request.new_expiration_date)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return updated_policy
```

---

*Documento generado durante la fase de desarrollo e implementación de lógica de negocio.*  
*Herramienta utilizada: Gemini (Antigravity — Google DeepMind)*  
*Fecha: 2026-05-28*
