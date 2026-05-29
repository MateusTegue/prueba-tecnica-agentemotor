"""
Esquemas Pydantic para la entidad ContactAttempt.

Tabla: contact_attempts
- id: INTEGER PK
- policy_id: INTEGER FK → policies.id
- outcome: TEXT NOT NULL (CHECK constraint)
- notes: TEXT (opcional)
- created_at: TEXT NOT NULL (YYYY-MM-DD HH:MM:SS)
"""

from enum import Enum
from pydantic import BaseModel
from typing import Optional


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class ContactOutcome(str, Enum):
    """Resultados posibles de un intento de contacto."""

    SUCCESSFUL = "successful"
    NO_ANSWER = "no_answer"
    CALLBACK_REQUESTED = "callback_requested"
    WRONG_NUMBER = "wrong_number"


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class ContactAttemptCreate(BaseModel):
    """Datos para registrar un intento de contacto."""

    outcome: ContactOutcome
    notes: Optional[str] = None
    created_at: Optional[str] = None  # Formato: YYYY-MM-DD HH:MM:SS (opcional, por defecto fecha/hora actual)


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class ContactAttemptResponse(BaseModel):
    """Intento de contacto en respuestas de la API."""

    id: int
    policy_id: int
    outcome: ContactOutcome
    notes: Optional[str] = None
    created_at: str
