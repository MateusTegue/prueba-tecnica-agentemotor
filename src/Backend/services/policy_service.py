"""
Servicio para manejar la lógica de negocio y consultas SQL de pólizas y contactos.
"""

from datetime import date, datetime
import sqlite3
from typing import List, Optional, Tuple

from models.policy import (
    TemporalStatus,
    ManagementStatus,
    PolicyResponse,
    PolicyDetailResponse,
)
from models.client import ClientBase, ClientResponse
from models.contact_attempt import (
    ContactAttemptCreate,
    ContactAttemptResponse,
    ContactOutcome,
)


class PolicyService:
    @staticmethod
    def _calculate_days_and_status(expiration_date_str: str) -> Tuple[int, TemporalStatus]:
        """Calcula los días restantes y el estado temporal de una póliza."""
        try:
            exp_date = date.fromisoformat(expiration_date_str)
        except ValueError:
            # Fallback en caso de formato inválido (no debería ocurrir con validaciones)
            return 0, TemporalStatus.LOST
            
        today = date.today()
        days_until_expiration = (exp_date - today).days
        status = TemporalStatus.from_days(days_until_expiration)
        return days_until_expiration, status

    @classmethod
    def get_policies(
        cls,
        db: sqlite3.Connection,
        temporal_status: Optional[List[str]] = None,
        management_status: Optional[str] = None,
        search: Optional[str] = None,
        sort: str = "priority",
    ) -> List[PolicyResponse]:
        """
        Obtiene y filtra las pólizas según los criterios del asesor.
        """
        # Consulta base
        query = """
            SELECT 
                p.id,
                p.policy_number,
                p.type,
                p.insurer,
                p.expiration_date,
                p.management_status,
                c.id as client_id,
                c.name as client_name,
                c.phone as client_phone,
                (SELECT COUNT(*) FROM contact_attempts WHERE policy_id = p.id) as contact_attempts_count
            FROM policies p
            JOIN clients c ON p.client_id = c.id
            WHERE 1=1
        """
        params = []

        # Filtro por estado de gestión (se puede filtrar directo en SQL)
        if management_status:
            query += " AND p.management_status = ?"
            params.append(management_status)

        # Filtro de búsqueda (nombre de cliente o número de póliza)
        if search:
            query += " AND (c.name LIKE ? OR p.policy_number LIKE ?)"
            search_param = f"%{search}%"
            params.append(search_param)
            params.append(search_param)

        rows = db.execute(query, params).fetchall()

        # Convertir a objetos PolicyResponse y calcular estados temporales en Python
        policies: List[PolicyResponse] = []
        for row in rows:
            days, temp_status = cls._calculate_days_and_status(row["expiration_date"])
            
            # Filtro por estado temporal (se debe hacer en Python porque es calculado en runtime)
            if temporal_status and temp_status.value not in temporal_status:
                continue

            policies.append(
                PolicyResponse(
                    id=row["id"],
                    policy_number=row["policy_number"],
                    client=ClientBase(
                        id=row["client_id"],
                        name=row["client_name"],
                        phone=row["client_phone"]
                    ),
                    type=row["type"],
                    insurer=row["insurer"],
                    expiration_date=row["expiration_date"],
                    temporal_status=temp_status,
                    days_until_expiration=days,
                    management_status=ManagementStatus(row["management_status"]),
                    contact_attempts_count=row["contact_attempts_count"]
                )
            )

        # Ordenamiento
        if sort == "priority":
            # Ordenamiento por prioridad definida en spec.md 6.3:
            # 1. EXPIRED_RECOVERABLE (ordenadas por días desde vencimiento descendente -> días más negativos primero)
            # 2. EXPIRING_SOON (ordenadas por días restante ascendente)
            # 3. ACTIVE (ordenadas por días restante ascendente)
            # 4. LOST (al final)
            # Dentro de cada grupo, 'pending' va antes que 'contacted' y 'renewed'
            
            status_order = {
                TemporalStatus.EXPIRED_RECOVERABLE: 0,
                TemporalStatus.EXPIRING_SOON: 1,
                TemporalStatus.ACTIVE: 2,
                TemporalStatus.LOST: 3,
            }
            
            mgmt_order = {
                ManagementStatus.PENDING: 0,
                ManagementStatus.CONTACTED: 1,
                ManagementStatus.RENEWED: 2,
            }

            def priority_key(p: PolicyResponse):
                # Ordenar por:
                # 1. Estado temporal (EXPIRED_RECOVERABLE primero, etc.)
                # 2. Días hasta el vencimiento (menor valor numérico primero)
                #    - Para EXPIRED_RECOVERABLE: -30 es menor que -1 (los más cercanos a 30 días de vencidos van primero)
                #    - Para EXPIRING_SOON: 1 es menor que 30 (los más próximos a vencer van primero)
                # 3. Estado de gestión (pending antes que contacted, etc.)
                return (
                    status_order[p.temporal_status],
                    p.days_until_expiration,
                    mgmt_order[p.management_status]
                )

            policies.sort(key=priority_key)
            
        elif sort == "expiration_date":
            policies.sort(key=lambda p: p.expiration_date)
        elif sort == "client_name":
            policies.sort(key=lambda p: p.client.name.lower())

        return policies

    @classmethod
    def get_policy_by_id(cls, db: sqlite3.Connection, policy_id: int) -> Optional[PolicyDetailResponse]:
        """
        Retorna el detalle completo de una póliza específica.
        """
        # Consultar póliza y cliente
        query = """
            SELECT 
                p.id,
                p.policy_number,
                p.type,
                p.insurer,
                p.expiration_date,
                p.management_status,
                c.id as client_id,
                c.name as client_name,
                c.phone as client_phone,
                c.email as client_email
            FROM policies p
            JOIN clients c ON p.client_id = c.id
            WHERE p.id = ?
        """
        row = db.execute(query, (policy_id,)).fetchone()
        if not row:
            return None

        # Consultar intentos de contacto
        attempts_rows = db.execute(
            "SELECT id, outcome, notes, created_at FROM contact_attempts WHERE policy_id = ? ORDER BY created_at DESC",
            (policy_id,)
        ).fetchall()

        attempts = [
            ContactAttemptResponse(
                id=att["id"],
                policy_id=policy_id,
                outcome=ContactOutcome(att["outcome"]),
                notes=att["notes"],
                created_at=att["created_at"]
            )
            for att in attempts_rows
        ]

        days, temp_status = cls._calculate_days_and_status(row["expiration_date"])

        return PolicyDetailResponse(
            id=row["id"],
            policy_number=row["policy_number"],
            client=ClientResponse(
                id=row["client_id"],
                name=row["client_name"],
                phone=row["client_phone"],
                email=row["client_email"]
            ),
            type=row["type"],
            insurer=row["insurer"],
            expiration_date=row["expiration_date"],
            temporal_status=temp_status,
            days_until_expiration=days,
            management_status=ManagementStatus(row["management_status"]),
            contact_attempts=attempts
        )

    @classmethod
    def create_contact_attempt(
        cls, db: sqlite3.Connection, policy_id: int, attempt: ContactAttemptCreate
    ) -> Optional[ContactAttemptResponse]:
        """
        Registra un intento de contacto para una póliza.
        Actualiza el estado de gestión a 'contacted' si estaba en 'pending'.
        """
        # Verificar si la póliza existe
        policy = db.execute("SELECT id, management_status FROM policies WHERE id = ?", (policy_id,)).fetchone()
        if not policy:
            return None

        # Insertar intento
        created_at = attempt.created_at if attempt.created_at else datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor = db.execute(
            "INSERT INTO contact_attempts (policy_id, outcome, notes, created_at) VALUES (?, ?, ?, ?)",
            (policy_id, attempt.outcome.value, attempt.notes, created_at)
        )
        attempt_id = cursor.lastrowid

        # Actualizar estado de gestión de la póliza si está en pending
        if policy["management_status"] == ManagementStatus.PENDING.value:
            db.execute(
                "UPDATE policies SET management_status = ? WHERE id = ?",
                (ManagementStatus.CONTACTED.value, policy_id)
            )

        db.commit()

        return ContactAttemptResponse(
            id=attempt_id,
            policy_id=policy_id,
            outcome=attempt.outcome,
            notes=attempt.notes,
            created_at=created_at
        )

    @classmethod
    def renew_policy(
        cls, db: sqlite3.Connection, policy_id: int, new_expiration_date: date
    ) -> Tuple[bool, str, Optional[PolicyDetailResponse]]:
        """
        Renueva una póliza actualizando su fecha de vencimiento.
        Valida reglas de negocio regulatorias.
        
        Retorna (success, message, updated_policy)
        """
        # Consultar la póliza actual
        query = "SELECT id, expiration_date, management_status FROM policies WHERE id = ?"
        policy = db.execute(query, (policy_id,)).fetchone()
        if not policy:
            return False, "La póliza no existe.", None

        # Validar estado temporal antes de renovar
        days, temp_status = cls._calculate_days_and_status(policy["expiration_date"])
        
        if temp_status == TemporalStatus.LOST:
            return False, "No se puede renovar una póliza en estado LOST (ventana de 30 días superada).", None
            
        if policy["management_status"] == ManagementStatus.RENEWED.value:
            return False, "Esta póliza ya ha sido renovada.", None

        # Actualizar la póliza
        new_date_str = new_expiration_date.isoformat()
        db.execute(
            "UPDATE policies SET expiration_date = ?, management_status = ? WHERE id = ?",
            (new_date_str, ManagementStatus.RENEWED.value, policy_id)
        )
        db.commit()

        # Obtener detalle actualizado
        updated_policy = cls.get_policy_by_id(db, policy_id)
        return True, "Póliza renovada exitosamente.", updated_policy
