"""
Mapeo de rutas de API para pólizas y gestión de contactos.
"""

from fastapi import APIRouter, Depends, Query, HTTPException, status
from typing import List, Optional
import sqlite3

from database.connection import get_db
from models.policy import (
    PolicyResponse,
    PolicyDetailResponse,
    PolicyRenewRequest,
    TemporalStatus,
    ManagementStatus,
)
from models.contact_attempt import ContactAttemptCreate, ContactAttemptResponse
from services.policy_service import PolicyService

router = APIRouter(prefix="/policies", tags=["Policies"])


@router.get("", response_model=List[PolicyResponse])
def get_policies(
    temporal_status: Optional[str] = Query(
        None,
        description="Filtrar por estado temporal (valores separados por coma: active, expiring_soon, expired_recoverable, lost)",
    ),
    management_status: Optional[ManagementStatus] = Query(
        None,
        description="Filtrar por estado de gestión",
    ),
    search: Optional[str] = Query(
        None,
        description="Buscar por nombre de cliente o número de póliza",
    ),
    sort: str = Query(
        "priority",
        description="Criterio de ordenamiento (priority, expiration_date, client_name)",
    ),
    db: sqlite3.Connection = Depends(get_db),
):
    """
    Obtiene la lista de pólizas aplicando filtros y ordenamiento especificados.
    """
    temp_statuses = None
    if temporal_status:
        temp_statuses = [s.strip().lower() for s in temporal_status.split(",")]
        # Validar valores válidos
        valid_statuses = {s.value for s in TemporalStatus}
        for s in temp_statuses:
            if s not in valid_statuses:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Estado temporal '{s}' no es válido. Valores permitidos: {', '.join(valid_statuses)}",
                )

    try:
        policies = PolicyService.get_policies(
            db,
            temporal_status=temp_statuses,
            management_status=management_status.value if management_status else None,
            search=search,
            sort=sort,
        )
        return policies
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener pólizas: {str(e)}",
        )


@router.get("/priority", response_model=List[PolicyResponse])
def get_policies_by_priority(
    temporal_status: Optional[str] = Query(
        None,
        description="Filtrar por estado temporal (valores separados por coma: active, expiring_soon, expired_recoverable, lost)",
    ),
    management_status: Optional[ManagementStatus] = Query(
        None,
        description="Filtrar por estado de gestión",
    ),
    search: Optional[str] = Query(
        None,
        description="Buscar por nombre de cliente o número de póliza",
    ),
    db: sqlite3.Connection = Depends(get_db),
):
    """
    Obtiene la lista de pólizas ordenada específicamente por prioridad de negocio:
    1. EXPIRED_RECOVERABLE primero.
    2. Luego EXPIRING_SOON.
    3. Luego ACTIVE.
    4. Finalmente LOST.
    """
    temp_statuses = None
    if temporal_status:
        temp_statuses = [s.strip().lower() for s in temporal_status.split(",")]
        valid_statuses = {s.value for s in TemporalStatus}
        for s in temp_statuses:
            if s not in valid_statuses:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Estado temporal '{s}' no es válido. Valores permitidos: {', '.join(valid_statuses)}",
                )

    try:
        policies = PolicyService.get_policies(
            db,
            temporal_status=temp_statuses,
            management_status=management_status.value if management_status else None,
            search=search,
            sort="priority",
        )
        return policies
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener pólizas por prioridad: {str(e)}",
        )


@router.get("/{policy_id}", response_model=PolicyDetailResponse)
def get_policy_detail(policy_id: int, db: sqlite3.Connection = Depends(get_db)):
    """
    Obtiene los detalles completos de una póliza, incluyendo su historial de intentos de contacto.
    """
    policy = PolicyService.get_policy_by_id(db, policy_id)
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La póliza no existe.",
        )
    return policy


@router.post("/{policy_id}/contact-attempt", response_model=ContactAttemptResponse, status_code=status.HTTP_201_CREATED)
def create_contact_attempt(
    policy_id: int,
    attempt: ContactAttemptCreate,
    db: sqlite3.Connection = Depends(get_db),
):
    """
    Registra un intento de contacto (fecha, notas, resultado) para una póliza y
    actualiza automáticamente su estado de gestión a 'contacted' si estaba en 'pending'.
    """
    result = PolicyService.create_contact_attempt(db, policy_id, attempt)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La póliza no existe.",
        )
    return result


@router.post("/{policy_id}/renew", response_model=PolicyDetailResponse)
def renew_policy(
    policy_id: int,
    request: PolicyRenewRequest,
    db: sqlite3.Connection = Depends(get_db),
):
    """
    Renueva una póliza estableciendo una nueva fecha de vencimiento.
    Valida las reglas de negocio de la ventana regulatoria de 30 días.
    """
    success, message, updated_policy = PolicyService.renew_policy(
        db, policy_id, request.new_expiration_date
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message,
        )
    return updated_policy
