# 08_readme

## Prompt original

El usuario solicitó: crear un `README.md` profesional, claro y bien estructurado para la entrega final de la prueba técnica. El README debe incluir descripción general, lógica de negocio, stack, cómo ejecutar, estructura de proyecto, decisiones de diseño, exclusiones, mejoras para producción, tests implementados, tiempo invertido, mejoras sugeridas y una sección para vídeo. Además pidió un historial `ai_history/08_readme.md` con prompt, análisis y decisiones.

## Análisis realizado

- Objetivo: producir un README que comunique criterio técnico y enfoque al negocio, no un documento genérico o publicitario.
- Público: evaluadores técnicos y stakeholders (ej. María), por tanto debe ser preciso, conciso y justificar trade-offs.
- Requisitos: máximo 3 comandos por entorno, coherencia con `spec.md`, mantener lenguaje técnico pero claro.
- Áreas a cubrir: arquitectura mínima, cómo correr localmente, qué se decidió y porqué, y qué no se implementó.

## Estructura propuesta del README

1. Descripción general
2. Lógica principal de negocio
3. Stack tecnológico
4. Cómo ejecutar el proyecto (rápido)
5. Estructura del proyecto
6. Decisiones de diseño tomadas
7. Qué se decidió NO construir y por qué
8. Qué falta para producción
9. Tests implementados
10. Tiempo invertido
11. Qué mejoraría
12. Video (placeholder)

## Decisiones tomadas en el README

- Mantener tono profesional y directo; evitar marketing.
- Proveer comandos reproducibles en PowerShell (usuario en Windows).
- Incluir links a archivos relevantes para trazabilidad.
- Ser honesto sobre tiempos y limitaciones.

## Simplificaciones aplicadas

- Comandos de ejecución proporcionados en 3 pasos por entorno (combinando comandos donde es necesario para mantener límite de 3).
- No se incluyeron instrucciones Docker por defecto para no incrementar la superficie de revisión; se ofrece como opción en el README.

## Cómo el README comunica decisiones técnicas y de negocio

- El README sitúa el problema (reemplazar Excel) y cómo el MVP lo aborda, lo que ayuda al evaluador a entender prioridades.
- Documenta trade-offs (p. ej. no autenticación) y la justificación, demostrando criterio para priorizar alcance sobre alcance técnico innecesario.

---

Fecha: 2026-05-29
Autor: IA asistente (documentación añadida al repo)
