# Code Review — Agentemotor

Fecha: 2026-05-29
Revisor: IA asistente

Contexto

Se revisa la función expuesta en el snippet Flask responsable de listar pólizas vencidas por asesor. El objetivo del análisis es identificar problemas relevantes para producción, escalabilidad, lógica de negocio y operación del asesor.

Resumen ejecutivo

El fragmento presenta múltiples problemas críticos: errores sintácticos, mezcla de responsabilidades, consultas ineficientes (N+1), ausencia de manejo de errores, conexión a la base de datos mal gestionada y lógica de prioridad simplista que no refleja la ventana de 30 días. Estos fallos producen riesgos reales en producción (datos erróneos, mala experiencia para María, cargas innecesarias en DB y dificultades de mantenimiento).

Hallazgos y recomendaciones (priorizados)

1) Ruta y firma del endpoint incorrecta / inconsistencia del framework

### Ubicación
La definición del endpoint y la firma de la función:
```py
@app.route('/advisors//expired-policies', methods=['GET'])
def list_expired_policies(advisor_id):
```

### Qué está mal
- La ruta tiene `//` y no define un parámetro `advisor_id` en la URL (ej. `/advisors/<int:advisor_id>/expired-policies`).
- La firma de la función espera `advisor_id` como argumento posicional, que Flask no proveerá con la ruta actual.

### Por qué importa
- El endpoint no funcionará en ejecución real; producirá errores 404 o TypeError.
- Indica falta de pruebas y revisión básica antes de desplegar.

### Impacto de negocio
- María no podrá acceder a la lista filtrada por asesor; la funcionalidad operativa falla.

### Cómo lo arreglaría
- Corregir la ruta a `/advisors/<int:advisor_id>/expired-policies` y/o leer `advisor_id` desde query params.
- Añadir pruebas unitarias/integración que validen la resolución del endpoint.

2) Código SQL roto y vulnerabilidad en la construcción de la consulta

### Ubicación
La sentencia SQL en `cursor.execute(...)` aparece truncada y mal formada:
```py
"FROM policies WHERE advisor_id = ? AND expiration_date  7 else 'normal'
```

### Qué está mal
- Sintaxis inválida; la condición sobre `expiration_date` no existe.
- No hay demostración de parámetros correctamente usados (aunque hay `?`, el SQL está incompleto).

### Por qué importa
- Código no ejecutable y alto riesgo de comportamientos impredecibles.

### Impacto de negocio
- Datos incorrectos o indisponibilidad del endpoint impiden la operativa.

### Cómo lo arreglaría
- Reescribir la consulta completa y probada. Preferible: usar consultas parametrizadas con JOIN para evitar N+1.
- Ejemplo de consulta para evitar N+1 (fetch con JOIN y cálculo de días):
```sql
SELECT p.id, p.client_id, c.name, c.phone, p.insurer, p.expiration_date,
       julianday('now') - julianday(p.expiration_date) AS days_overdue
FROM policies p
JOIN clients c ON c.id = p.client_id
WHERE p.advisor_id = ?
  AND p.expiration_date <= date('now')
ORDER BY days_overdue ASC
LIMIT ? OFFSET ?;
```
- Mejor aún: usar SQLAlchemy o un DAO con conexión segura.

3) N+1 queries (consultas por cada póliza dentro del loop)

### Ubicación
Dentro del bucle se ejecutan consultas para obtener `client` y `attempts` por cada `policy`.

### Qué está mal
- Cada iteración hace nuevas consultas a la BD (obtener cliente, contar intentos), generando O(n) consultas adicionales.

### Por qué importa
- Escala mal: con 1.000 pólizas, se ejecutan 2.000+ consultas adicionales. Latencia y carga en DB se disparan.

### Impacto de negocio
- Respuesta lenta para María; peor experiencia y coste operativo mayor en infra.

### Cómo lo arreglaría
- Hacer un único JOIN para traer cliente y contar intentos en la consulta inicial (agregación/LEFT JOIN).
- Usar batching o consultas con IN(...) para obtener datos relacionados en grupo.

4) Conexión a la base de datos no cerrada / manejo de recursos

### Ubicación
Se abre `conn = sqlite3.connect(DB)` y no hay `conn.close()` ni context manager.

### Qué está mal
- Si ocurre una excepción no se cierra la conexión; fuga de recursos.
- En multihilo o deployment WSGI esto puede causar bloqueos o límites alcanzados.

### Por qué importa
- Fugas de conexiones, corrupción potencial de la base SQLite y problemas en producción.

### Impacto de negocio
- Interrupciones en la disponibilidad periódica y pérdida de confianza del usuario.

### Cómo lo arreglaría
- Usar context manager (`with sqlite3.connect(DB) as conn:`) o un pool de conexiones (migrar a Postgres para producción y usar pool) y manejar excepciones.

5) Uso de `debug=True` en `app.run(debug=True)`

### Ubicación
Al final del archivo

### Qué está mal
- `debug=True` habilita el debugger interactivo y recarga automática, y puede exponer información sensible.

### Por qué importa
- Riesgo de ejecución de código remoto y divulgación de variables de entorno en entornos no seguros.

### Impacto de negocio
- Riesgo de fuga de datos de clientes o credenciales; no apto para staging/producción.

### Cómo lo arreglaría
- No ejecutar con `debug=True` en entornos reales; usar variables de entorno para controlar modo y un servidor WSGI (gunicorn/uvicorn).

6) Falta de manejo de errores y validación de datos

### Ubicación
En el cuerpo del endpoint no hay try/except ni validación de tipos/fechas.

### Qué está mal
- Si la DB contiene fechas en formatos inesperados o valores nulos, el código fallará.
- No hay respuesta consistente para errores (500 vs 400 con mensajes claros).

### Por qué importa
- Robustez deficiente; dificulta diagnóstico en producción.

### Impacto de negocio
- María puede ver fallos o datos inconsistentes; soporte requerirá reproducir y resolver incidencias.

### Cómo lo arreglaría
- Añadir validaciones de entrada (advisor_id), manejo de excepciones y logging estructurado.
- Devolver códigos HTTP apropiados y mensajes mínimos y útiles.

7) Lógica de prioridad y "recommended_action" simplista y no parametrizable

### Ubicación
El código asigna `priority` y `recommended_action` de forma arbitraria (ejemplo: siempre "Contactar urgentemente...").

### Qué está mal
- No distingue entre 2 días y 29 días; no incorpora reglas ponderadas ni configuración por negocio.

### Por qué importa
- Priorizar mal puede llevar a desperdiciar esfuerzos comerciales o perder clientes.

### Impacto de negocio
- María puede gastar tiempo contactando casos de bajo valor y perder oportunidades claves.

### Cómo lo arreglaría
- Definir una función de prioridad basada en días respecto a la fecha de vencimiento, estado del cliente, historial de intentos y valor comercial (suma asegurada o score).
- Ejemplo de regla:
  - days_overdue <= 30 && days_overdue >= -30 → `HIGH`
  - 31–90 → `MEDIUM`
  - >90 → `LOW`
- Permitir parametrización (config en DB o variables env).

8) Ausencia de paginación, filtros y límites

### Ubicación
El endpoint devuelve potencialmente todas las pólizas sin `LIMIT` ni paginado.

### Qué está mal
- Las consultas sin límites pueden devolver miles de filas, generando grandes respuestas JSON.

### Por qué importa
- Ancho de banda, tiempo de respuesta y uso de memoria en el servidor aumentan.

### Impacto de negocio
- Interfaz lenta, mala experiencia para María en redes lentas o con grandes carteras.

### Cómo lo arreglaría
- Implementar parámetros `limit` y `offset` (o `page`), filtros por estado, rango de fechas y búsqueda por cliente.
- Documentar defaults razonables (ej. limit=50).

9) Escalabilidad y elección de SQLite para producción

### Ubicación
Uso de archivo SQLite (`agentemotor.db`).

### Qué está mal
- SQLite es excelente para pruebas y prototipos, pero tiene limitaciones de concurrencia y escalado.

### Por qué importa
- En múltiples procesos/threads o con concurrencia alta, SQLite puede bloquearse o corromperse.

### Impacto de negocio
- Riesgo de downtime en picos de uso; operaciones comerciales interrumpidas.

### Cómo lo arreglaría
- Migrar a una base de datos cliente/servidor (Postgres o MySQL) para producción, con pool de conexiones.

10) Separación de responsabilidades y estructura del código

### Ubicación
Todo en un solo endpoint: acceso a BD, transformación, reglas de prioridad y serialización.

### Qué está mal
- Mezcla de I/O, lógica de dominio y presentación en una función monolítica.

### Por qué importa
- Difícil de probar, mantener y evolucionar sin introducir regresiones.

### Impacto de negocio
- Tiempo de mantenimiento alto; cambios en reglas de negocio arriesgan romper endpoints.

### Cómo lo arreglaría
- Introducir capas: repositorio/DAO para acceso a datos, servicio de dominio para reglas y un controlador/handler para validación y serialización.
- Añadir pruebas unitarias a cada capa.

11) Índices y consultas optimizadas

### Ubicación
Query no muestra uso de índices.

### Qué está mal
- Sin índices en `advisor_id` y `expiration_date`, la búsqueda será full-table scan.

### Por qué importa
- Con crecimiento de la tabla, latencias y carga aumentarán linealmente.

### Impacto de negocio
- Mala experiencia para María y costes operacionales crecientes.

### Cómo lo arreglaría
- Añadir índices compuestos adecuados: e.g. `(advisor_id, expiration_date)` y un índice para `client_id`.

12) Logging y observabilidad ausentes

### Ubicación
No hay `logging` ni métricas.

### Qué está mal
- Sin logs estructurados ni métricas, diagnóstico en producción será costoso.

### Por qué importa
- Incidentes demorarán más en resolverse; SLOs imposibles de medir.

### Impacto de negocio
- Mayor tiempo de inactividad y costes de soporte.

### Cómo lo arreglaría
- Añadir `logging` estructurado (JSON), métricas básicas (latencia, errores, counts) y traces si es posible.

Resumen y roadmap de mitigación

Prioridad inmediata (short-term)
- Corregir la ruta y el SQL roto para que el endpoint funcione.
- Eliminar `debug=True` en producción.
- Usar context manager para la conexión a la DB y cerrar recursos.
- Reemplazar N+1 con JOINs y limitar resultados (pagination).
- Añadir validación de inputs y manejo de errores básicos.

Mediano plazo
- Mover lógica de prioridad a una capa de dominio con pruebas unitarias.
- Añadir índices y optimizar consultas.
- Añadir paginación y filtros avanzados.

Largo plazo (producción)
- Migrar a Postgres y deploy con WSGI (gunicorn) detrás de reverse-proxy.
- Añadir observabilidad (logs, métricas), autenticación y testing E2E.
- Implementar background jobs para tareas pesadas (conteos, notificaciones).

Conclusión

El snippet actual no está listo para producción. Los problemas detectados van más allá de bugs sintácticos: hay decisiones de arquitectura y diseño que, de no corregirse, impactarán directamente la operación y la capacidad de María y su equipo para usar la herramienta eficazmente. La corrección requiere aplicar buenas prácticas de ingeniería: separación de capas, consultas eficientes, manejo de recursos, pruebas y observabilidad.
