"""
Modelos Pydantic para el sistema de gestión de renovación de pólizas.

Estructura:
- client.py: Esquemas de cliente
- policy.py: Esquemas de póliza + enums de estado temporal y de gestión
- contact_attempt.py: Esquemas de intentos de contacto
"""

from models.client import ClientBase, ClientResponse
from models.policy import (
    PolicyResponse,
    PolicyDetailResponse,
    PolicyRenewRequest,
    TemporalStatus,
    ManagementStatus,
)
from models.contact_attempt import (
    ContactAttemptCreate,
    ContactAttemptResponse,
    ContactOutcome,
)
