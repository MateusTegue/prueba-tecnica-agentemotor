"""
Esquemas Pydantic para la entidad Client.

Tabla: clients
- id: INTEGER PK
- name: TEXT NOT NULL
- phone: TEXT NOT NULL
- email: TEXT (opcional)
"""

from pydantic import BaseModel
from typing import Optional


class ClientBase(BaseModel):
    """Datos básicos de un cliente (usado en listados de pólizas)."""

    id: int
    name: str
    phone: str


class ClientResponse(ClientBase):
    """Datos completos de un cliente (usado en detalle de póliza)."""

    email: Optional[str] = None
