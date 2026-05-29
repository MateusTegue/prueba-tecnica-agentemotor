# Historial de Desarrollo - Frontend MVP

## 1. Prompt Original

El usuario solicitó la implementación del frontend del MVP basándose en el archivo `spec.md`, la lógica de negocio del backend y los endpoints existentes. Las reglas clave incluyen:
- Estructura: `frontend/` conteniendo `src/`, `components/`, `pages/` y `services/`.
- Pantalla única principal (Dashboard) para visualizar pólizas priorizadas, registrar contactos, renovar pólizas y ver resúmenes.
- Destacar estados visuales (`EXPIRED_RECOVERABLE`, `EXPIRING_SOON`, `ACTIVE`, `LOST`).
- Priorización comercial (pólizas recuperables arriba, perdidas abajo).
- Filtros simples (Todas, Recoverable, Expiring soon, Lost).
- Registro de contacto con notas y renovación con nueva fecha futura.
- Mantener una arquitectura simple sin sobreingeniería (cero Redux).

---

## 2. Análisis Realizado

1. **Alineación con el Backend**: El backend calcula de manera dinámica en runtime el estado temporal (`temporal_status`), el número de días restantes (`days_until_expiration`) y cuenta con endpoints específicos para registrar llamadas de contacto y realizar renovaciones.
2. **Priorización de la Cartera**: La consulta al backend a través del endpoint `/policies` (o `/policies/priority`) devuelve las pólizas ordenadas por la prioridad lógica comercial, donde:
   - `EXPIRED_RECOVERABLE` se sitúa en la parte superior porque representan clientes en riesgo crítico de pérdida dentro del límite de 30 días.
   - `EXPIRING_SOON` y `ACTIVE` se muestran a continuación.
   - `LOST` se relega al final.
3. **Flujo de Trabajo Operativo**: El diseño web debe ser ágil, permitiendo a María (la asesora) buscar clientes rápidamente, filtrar por urgencia, abrir un modal contextual para documentar una llamada y realizar renovaciones rápidas con un solo botón.

---

## 3. Estructura del Frontend

El frontend se configuró con la siguiente estructura limpia dentro de `src/Frontend`:

```
src/Frontend/
├── package.json
├── index.html
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css          # Diseño general y sistema de colores/variables
│   ├── App.css            # Estilos auxiliares (limpio para evitar colisiones)
│   ├── components/
│   │   ├── Header.jsx       # Métricas superiores del negocio
│   │   ├── ContactModal.jsx # Registro de llamadas e historial de contacto
│   │   └── RenewModal.jsx   # Formulario de renovación de fecha futura
│   ├── pages/
│   │   └── Dashboard.jsx    # Pantalla única principal con tabla, filtros y búsquedas
│   └── services/
│       └── api.js           # Centralización de peticiones HTTP
```

---

## 4. Decisiones de UI/UX Tomadas

- **Diseño Limpio y Premium**: Usamos la tipografía modernizada **Inter** desde Google Fonts.
- **Gradientes de Estado**: Cada estado temporal tiene un degradado cromático con alto contraste y legibilidad para guiar el ojo de María de manera inmediata:
  - `EXPIRED_RECOVERABLE`: Crimson/Rojo de advertencia crítica para alertar sobre la ventana regulatoria de 30 días que expira.
  - `EXPIRING_SOON`: Ámbar/Naranja que indica la necesidad de seguimiento preventivo.
  - `ACTIVE`: Esmeralda/Verde indicando pólizas seguras y sin acción requerida.
  - `LOST`: Gris/Slate apagado indicando pólizas descartadas.
- **Ventanas Emergentes Contextuales (Modals)**: En lugar de redirigir a María a otras pantallas y perder el contexto de su tabla de trabajo, el registro de contactos e historial y las renovaciones se ejecutan en modals con un fondo difuminado de estilo cristalizado (`backdrop-filter: blur`).
- **Iconografía Consistente**: Se utilizó `lucide-react` para complementar los textos con elementos visuales reconocibles.

---

## 5. Simplificaciones Aplicadas

- **Sin Manejo Complejo de Estado Global**: Toda la reactividad y transferencia de información se realiza mediante estados nativos de React (`useState`, `useEffect` y callbacks de actualización de datos).
- **Cálculo de Métricas al Vuelo**: El componente `Header` computa los totales de cada categoría agregando los datos que recibe el listado principal, evitando llamadas redundantes a la base de datos.
- **Acciones Inline**: Los botones para abrir el formulario de contacto y renovación se ubican directamente en la fila de cada póliza, maximizando la velocidad operativa.

---

## 6. Componentes Creados

1. **Header (`components/Header.jsx`)**: Renderiza el logotipo y la barra de indicadores agregados (Total Pólizas, Recuperables, Próximas a Vencer y Perdidas).
2. **ContactModal (`components/ContactModal.jsx`)**: Carga los detalles actualizados del cliente desde el endpoint `/policies/{id}`, muestra el historial cronológico de intentos de contacto anteriores y provee un formulario para registrar nuevos intentos de llamada.
3. **RenewModal (`components/RenewModal.jsx`)**: Permite establecer una nueva fecha de vencimiento. Por defecto autocompleta la fecha a exactamente un año en el futuro para agilizar la labor de la asesora.
4. **Dashboard (`pages/Dashboard.jsx`)**: Integra la barra de búsqueda reactiva por cliente/póliza, los filtros rápidos, el ordenamiento parametrizado y la tabla detallada de pólizas con accesos inline.

---

## 7. Servicios Implementados

Centralizados en `services/api.js`:
- `getPolicies(filters)`: Consume `GET /policies` con soporte para `search`, `temporal_status` y `sort`.
- `getPolicyDetail(id)`: Consume `GET /policies/{id}` para rellenar el historial del modal de contacto.
- `createContactAttempt(id, outcome, notes)`: Llama a `POST /policies/{id}/contact-attempt`.
- `renewPolicy(id, newExpirationDate)`: Envía la petición `POST /policies/{id}/renew`.

---

## 8. Reflejo de la Lógica Crítica de Negocio

- **Urgencia Temporal**: Las pólizas que se encuentran en el período de gracia de 30 días posteriores al vencimiento (`EXPIRED_RECOVERABLE`) aparecen resaltadas con la máxima prioridad visual y colocadas automáticamente al principio de la lista.
- **Ventana de 30 Días**: En la tabla, la columna "Vencimiento" calcula dinámicamente cuántos días han transcurrido del vencimiento del cliente y añade la leyenda explicativa `(Límite 30d)` si es recuperable.
- **Restricción de Negocio**: Para pólizas con estado `LOST` (más de 30 días vencidas), el botón de renovación se deshabilita visualmente e impide la acción, alineándose con la imposibilidad legal de renovación continua del intermediario.
