"""
Esquemas Pydantic para la entidad Policy.

Tabla: policies
- id: INTEGER PK
- policy_number: TEXT NOT NULL UNIQUE
- client_id: INTEGER FK → clients.id
- type: TEXT NOT NULL
- insurer: TEXT NOT NULL
- expiration_date: TEXT NOT NULL (YYYY-MM-DD)
- management_status: TEXT NOT NULL DEFAULT 'pending'
- created_at: TEXT NOT NULL

Estado temporal (calculado en runtime, nunca almacenado):
- ACTIVE: days_until_expiration > 30
- EXPIRING_SOON: 0 < days_until_expiration <= 30
- EXPIRED_RECOVERABLE: -30 <= days_until_expiration <= 0
- LOST: days_until_expiration < -30
"""

from enum import Enum
from datetime import date
from pydantic import BaseModel, field_validator
from typing import Optional, List

from models.client import ClientBase, ClientResponse
from models.contact_attempt import ContactAttemptResponse


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class TemporalStatus(str, Enum):
    """
    Estado temporal de una póliza, calculado en runtime.
    Nunca se almacena en la base de datos.
    """

    ACTIVE = "active"
    EXPIRING_SOON = "expiring_soon"
    EXPIRED_RECOVERABLE = "expired_recoverable"
    LOST = "lost"

    @staticmethod
    def from_days(days_until_expiration: int) -> "TemporalStatus":
        """
        Clasifica una póliza según los días hasta su vencimiento.

        Regla de negocio (ventana de 30 días):
        - > 30 días: ACTIVE
        - 1–30 días: EXPIRING_SOON
        - 0 a -30 días: EXPIRED_RECOVERABLE (dentro de ventana regulatoria)
        - < -30 días: LOST (fuera de ventana, cliente potencialmente perdido)

        Boundaries:
        - Vence hoy (0): EXPIRED_RECOVERABLE
        - Vencida hace 30 días (-30): EXPIRED_RECOVERABLE (inclusive)
        - Vencida hace 31 días (-31): LOST
        """
        if days_until_expiration > 30:
            return TemporalStatus.ACTIVE
        elif days_until_expiration > 0:
            return TemporalStatus.EXPIRING_SOON
        elif days_until_expiration >= -30:
            return TemporalStatus.EXPIRED_RECOVERABLE
        else:
            return TemporalStatus.LOST


class ManagementStatus(str, Enum):
    """
    Estado de gestión de una póliza, almacenado en la base de datos.
    Cambia solo por acciones explícitas del asesor.
    """

    PENDING = "pending"
    CONTACTED = "contacted"
    RENEWED = "renewed"


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class PolicyRenewRequest(BaseModel):
    """Datos para renovar una póliza."""

    new_expiration_date: date

    @field_validator("new_expiration_date")
    @classmethod
    def must_be_future(cls, v: date) -> date:
        if v <= date.today():
            raise ValueError("La nueva fecha de vencimiento debe ser futura.")
        return v


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class PolicyResponse(BaseModel):
    """Póliza en listado (GET /policies)."""

    id: int
    policy_number: str
    client: ClientBase
    type: str
    insurer: str
    expiration_date: str
    temporal_status: TemporalStatus
    days_until_expiration: int
    management_status: ManagementStatus
    contact_attempts_count: int


class PolicyDetailResponse(BaseModel):
    """Detalle de póliza (GET /policies/{id})."""

    id: int
    policy_number: str
    client: ClientResponse
    type: str
    insurer: str
    expiration_date: str
    temporal_status: TemporalStatus
    days_until_expiration: int
    management_status: ManagementStatus
    contact_attempts: List[ContactAttemptResponse]
