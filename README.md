# Agentemotor — MVP de Gestión y Renovación de Pólizas

Última actualización: 2026-05-29

## 1. Descripción general
Agentemotor es un MVP orientado a asesores que automatiza y prioriza la gestión de renovaciones de pólizas de seguros. Sustituye procesos manuales en hojas de cálculo y permite a una asesora como María identificar rápidamente oportunidades de recuperación y pólizas próximas a vencer.

Beneficios clave:
- Visibilidad inmediata del volumen y estado de la cartera.
- Priorización de acciones con foco en impacto comercial (recuperables).
- Registro operativo de intentos de contacto y renovaciones.

Enfoque: entregar valor operativo mínimo (MVP) con la menor complejidad técnica necesaria para resolución del problema real de negocio.

## 2. Lógica principal de negocio
- Ventana crítica: una póliza se considera "recuperable" si su vencimiento está dentro de los próximos 30 días o ha expirado recientemente pero aún es recuperable según las reglas de negocio.
- Importancia: la ventana de 30 días concentra la mayor probabilidad de conversión/recuperación y define la prioridad operativa para el equipo comercial.
- Priorización: las pólizas se ordenan por una heurística que mezcla prioridad de negocio y proximidad al vencimiento; las recuperables reciben mayor destaque visual porque representan mayor impacto en ingresos.

Resumen técnico:
- `temporal_status` contiene el estado temporal (`ACTIVE`, `EXPIRING_SOON`, `EXPIRED_RECOVERABLE`, `LOST`).
- El frontend deriva métricas desde el mismo array `policies` obtenido por `/policies` (sin endpoints adicionales).

## 3. Stack tecnológico
Backend
- FastAPI (API REST ligera y testeable)
- SQLite (almacenamiento simple y reproducible para pruebas)
- SQLAlchemy (mapeo ORM)
- Pytest (tests de lógica crítica)

Frontend
- React (Vite) — SPA ligera orientada a operaciones
- Estructura: componentes por responsabilidad (`Header`, `pages/Dashboard`, `components/*`)
- Consumo: llamadas REST a los endpoints del backend (`/policies`, endpoints de gestión y renovación)

## 4. Cómo ejecutar el proyecto (rápido)
Sigue estos pasos en PowerShell desde la raíz del repo.

Backend (comandos):
```powershell
1. navegar a la carpeta del backend
cd src/Backend

2. crear el ambiente virtual
python -m venv .venv

3. activar el ambiente virtual
.venv\Scripts\Activate.ps1; 

4. instalar las dependecias 
pip install -r requirements.txt

5. levantar el servidor de backend
uvicorn main:app --reload --port 8000
```

Frontend (3 comandos):
```powershell

1. navegar a la carpeta del frontend
cd src/Frontend

2 instalar las dependencias 
npm install

3. levantar el servidor cliente
npm run dev
```

Notas:
- El `requirements.txt` del backend está en `src/Backend/requirements.txt`.
- El frontend usa Vite; `npm run dev` levanta un servidor local (por defecto en :5173).

## 5. Estructura del proyecto
- `src/Backend/` — código FastAPI, modelos, conexión SQLite, seed de datos y lógica de negocio.
- `src/Frontend/` — aplicación React + Vite; componentes y páginas organizadas por responsabilidad.
- `tests/` — pruebas unitarias/funcionales del negocio (Pytest).
- `ai_history/` — historial de decisiones, prompts y análisis asistido por IA.
- `spec.md` — especificación funcional y criterios del ejercicio.

## 6. Decisiones de diseño tomadas
- Prioricé simplicidad y trazabilidad: una API REST mínima con lógica de negocio en backend y visualización en frontend.
- Evité introducir autenticación o arquitecturas distribuidas para centrar la evaluación en la lógica del negocio.
- Evité librerías adicionales salvo las esenciales (FastAPI, SQLAlchemy, React) para mantener el proyecto reproducible y fácil de evaluar.
- UI: diseño limpio y orientado a la tarea (cards + tabla operativa). El componente `Header` resume las métricas calculadas client-side.

## 7. Qué decidí NO construir y por qué
- Autenticación/Autorización: fuera del alcance MVP; añadiría complejidad al entregar la idea del flujo operativo.
- Notificaciones automáticas y envío de correos: requieren infra y configuraciones externas (SMTP, colas), fuera del alcance inmediato.
- Dashboards analíticos y visualizaciones complejas: no aportan al objetivo de dar a María herramientas operativas para el día a día.
- Carga masiva y gestión multi-tenant: casos de escala que exceden el alcance del ejercicio.

Cada exclusión se decidió por coste/beneficio y prioridad para resolver la necesidad operativa inmediata.

## 8. Qué le faltaría para producción
- Autenticación y autorización robusta (JWT / OAuth).
- Paginación y filtros server-side para grandes volúmenes.
- Auditoría y logging estructurado (ej. ELK / Loki).
- Notificaciones (email / SMS) y tareas programadas (cron / Celery / RQ) para automatizar seguimientos.
- Métricas y observabilidad (Prometheus / Grafana).
- Despliegue containerizado y pipeline CI/CD.

## 9. Tests implementados
- Tests cubren la lógica crítica de negocio: identificación de pólizas recuperables, cómputo de ventana de 30 días, reglas de priorización y cambios de estado tras acciones (contacto/renovación).
- Los tests buscan proteger el núcleo del dominio, permitiendo refactorizaciones seguras.

## 10. Tiempo aproximado invertido
Estimación honesta: ~10–14 horas de trabajo alineado a un MVP (diseño, implementación backend + frontend básico, pruebas críticas y documentación).

## 11. Qué mejoraría de esta prueba técnica
- Añadir integración de notificaciones (opcional, con feature flag) y colas para offload de trabajos.
- Refactorizar criterios de priorización para permitir reglas configurables por negocio.
- Añadir tests E2E mínimos que cubran el flujo crítico desde la interfaz.

## 12. Video
https://drive.google.com/file/d/1sjur3zofz0FbFklcpM5driasHeLZnWf3/view?usp=sharing

---

Si quieres, puedo:
- añadir instrucciones de `docker-compose` para ejecución reproducible,
- incluir comandos de tests y cobertura,
- generar un changelog resumido para entrega.

Archivos relacionados: [src/Frontend/src/components/Header.jsx](src/Frontend/src/components/Header.jsx), [src/Frontend/src/pages/Dashboard.jsx](src/Frontend/src/pages/Dashboard.jsx), [ai_history/07_dashboard_summary.md](ai_history/07_dashboard_summary.md)
