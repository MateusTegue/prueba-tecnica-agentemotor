import os
import sys
import sqlite3
import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient

# Agregar el directorio del backend al path del sistema para resolver las importaciones en el IDE y en ejecución
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src", "Backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from main import app
from database.connection import get_db, SCHEMA_SQL
from models.policy import TemporalStatus, ManagementStatus

TEST_DB_PATH = "test_agentemotor.db"


@pytest.fixture
def test_db():
    """
    Fixture que inicializa una base de datos SQLite temporal y ejecuta el script
    de creación del schema para cada test, garantizando un entorno aislado.
    """
    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except Exception:
            pass

    # Crear conexión y configurar llaves foráneas y row_factory
    conn = sqlite3.connect(TEST_DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    
    # Crear tablas
    conn.executescript(SCHEMA_SQL)
    conn.commit()

    yield conn

    # Cerrar conexión y remover archivo temporal al finalizar el test
    conn.close()
    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except Exception:
            pass


@pytest.fixture
def client(test_db):
    """
    Fixture que configura el TestClient de FastAPI y sobrescribe el get_db
    para redirigir todas las peticiones de los endpoints a la base de datos temporal.
    """
    def override_get_db():
        yield test_db

    # Inyectar dependencia temporal
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as c:
        yield c
        
    # Limpiar sobrescrituras
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def insert_client(db, name="Carlos Cliente", phone="3009999999", email="carlos@test.com"):
    """Inserta un cliente y retorna su ID."""
    cursor = db.execute(
        "INSERT INTO clients (name, phone, email) VALUES (?, ?, ?)",
        (name, phone, email)
    )
    db.commit()
    return cursor.lastrowid


def insert_policy(db, client_id, policy_number, expiration_date, management_status="pending"):
    """Inserta una póliza y retorna su ID."""
    cursor = db.execute(
        "INSERT INTO policies (policy_number, client_id, type, insurer, expiration_date, management_status) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        (policy_number, client_id, "auto", "Sura", expiration_date, management_status)
    )
    db.commit()
    return cursor.lastrowid


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_temporal_classification(client, test_db):
    """
    1. Clasificación temporal de pólizas
    Validar que:
    - una póliza vencida hace menos de 30 días sea clasificada como EXPIRED_RECOVERABLE,
    - una póliza vencida hace más de 30 días sea clasificada como LOST,
    - y que los boundaries exactos (hoy, 30 días vencidos, 31 días vencidos, expiring_soon, etc.)
      se clasifiquen correctamente.
    
    Importancia de negocio: Una clasificación errónea puede costar la pérdida de un cliente
    (si expira la ventana y no se le da prioridad) o pérdida de tiempo del asesor (gestionando
    lo que no es urgente).
    """
    client_id = insert_client(test_db)
    today = date.today()

    # Escenarios de prueba con desfases en días y sus estados esperados
    scenarios = [
        # (days_offset, expected_status)
        (-29, TemporalStatus.EXPIRED_RECOVERABLE),  # Vencida hace 29 días (dentro de ventana)
        (-30, TemporalStatus.EXPIRED_RECOVERABLE),  # Vencida hace 30 días (límite inclusivo de la ventana)
        (-31, TemporalStatus.LOST),                 # Vencida hace 31 días (fuera de la ventana)
        (0, TemporalStatus.EXPIRED_RECOVERABLE),    # Vence hoy (empieza a correr la ventana)
        (1, TemporalStatus.EXPIRING_SOON),          # Vence mañana (próxima a vencer)
        (30, TemporalStatus.EXPIRING_SOON),         # Vence en 30 días (límite inclusivo)
        (31, TemporalStatus.ACTIVE),                # Vence en 31 días (vigente sin acción inmediata)
    ]

    for idx, (offset, _) in enumerate(scenarios):
        exp_date = (today + timedelta(days=offset)).isoformat()
        pol_num = f"POL-TEST-{idx:03d}"
        insert_policy(test_db, client_id, pol_num, exp_date)

    # Invocar endpoint de listado
    response = client.get("/policies")
    assert response.status_code == 200
    policies = response.json()

    # Crear mapa por número de póliza para facilitar validaciones individuales
    policy_map = {p["policy_number"]: p for p in policies}

    for idx, (offset, expected_status) in enumerate(scenarios):
        pol_num = f"POL-TEST-{idx:03d}"
        policy = policy_map[pol_num]
        
        # Validaciones de clasificación
        assert policy["temporal_status"] == expected_status.value, \
            f"Fallo para offset {offset}. Esperado: {expected_status.value}, Obtendido: {policy['temporal_status']}"
        assert policy["days_until_expiration"] == offset, \
            f"Días restantes incorrectos para offset {offset}. Esperado: {offset}, Obtenido: {policy['days_until_expiration']}"


def test_business_priority_sorting(client, test_db):
    """
    2. Orden de prioridad de negocio
    Validar que:
    - las pólizas EXPIRED_RECOVERABLE aparezcan antes que EXPIRING_SOON,
    - y que dentro de las recuperables se prioricen las más cercanas a cumplir 30 días de vencidas.
    
    Importancia de negocio: El asesor tiene capacidad limitada de llamadas por día. Maximizar la prioridad
    de las pólizas a punto de perderse permanentemente optimiza el retorno comercial y retención de cartera.
    """
    client_id = insert_client(test_db)
    today = date.today()

    # Insertamos pólizas en orden no secuencial para validar el ordenamiento de la API
    # 1. Póliza activa (vence en +40 días) -> 4ta prioridad
    insert_policy(test_db, client_id, "POL-ACTIVE", (today + timedelta(days=40)).isoformat())
    # 2. Póliza próxima a vencer (vence en +10 días) -> 3ra prioridad
    insert_policy(test_db, client_id, "POL-EXPIRING", (today + timedelta(days=10)).isoformat())
    # 3. Póliza recuperable vencida hace 5 días (-5 días) -> 2da prioridad
    insert_policy(test_db, client_id, "POL-REC-5", (today - timedelta(days=5)).isoformat())
    # 4. Póliza recuperable vencida hace 28 días (-28 días) -> 1ra prioridad (más cercana a límite de 30 días)
    insert_policy(test_db, client_id, "POL-REC-28", (today - timedelta(days=28)).isoformat())
    # 5. Póliza perdida vencida hace 45 días (-45 días) -> 5ta prioridad (al final)
    insert_policy(test_db, client_id, "POL-LOST", (today - timedelta(days=45)).isoformat())

    # Invocar endpoint que por defecto ordena por prioridad
    response = client.get("/policies?sort=priority")
    assert response.status_code == 200
    policies = response.json()

    returned_order = [p["policy_number"] for p in policies]

    # Orden comercial esperado:
    # 1. Recuperable con mayor vencimiento (-28 días)
    # 2. Recuperable con menor vencimiento (-5 días)
    # 3. Próxima a vencer (+10 días)
    # 4. Activa (+40 días)
    # 5. Perdida (-45 días)
    expected_order = [
        "POL-REC-28",
        "POL-REC-5",
        "POL-EXPIRING",
        "POL-ACTIVE",
        "POL-LOST",
    ]

    assert returned_order == expected_order, f"El orden de priorización falló: {returned_order}"


def test_policy_renewal_flow(client, test_db):
    """
    3. Renovación de póliza
    Validar que:
    - al renovar una póliza, se actualice correctamente la fecha de vencimiento,
    - el estado temporal cambie automáticamente a ACTIVE.
    - una póliza LOST (vencida hace más de 30 días) NO pueda ser renovada por restricción comercial.
    
    Importancia de negocio: Asegura el ciclo de vida continuo de la póliza renovada e impide
    infringir la ventana regulatoria al bloquear la renovación de pólizas ya perdidas.
    """
    client_id = insert_client(test_db)
    today = date.today()

    # Caso exitoso: Póliza en ventana de renovación (vencida hace 10 días) en estado pending
    exp_date = (today - timedelta(days=10)).isoformat()
    policy_id = insert_policy(test_db, client_id, "POL-RENEW-OK", exp_date, "pending")

    new_expiration = today + timedelta(days=365)
    
    # Acción: Renovar
    response = client.post(
        f"/policies/{policy_id}/renew",
        json={"new_expiration_date": new_expiration.isoformat()}
    )
    
    assert response.status_code == 200, f"Error en la renovación: {response.json()}"
    updated_policy = response.json()

    # Validaciones de respuesta de API
    assert updated_policy["management_status"] == ManagementStatus.RENEWED.value
    assert updated_policy["expiration_date"] == new_expiration.isoformat()
    assert updated_policy["temporal_status"] == TemporalStatus.ACTIVE.value
    assert updated_policy["days_until_expiration"] == 365

    # Validaciones de persistencia en BD
    db_row = test_db.execute(
        "SELECT expiration_date, management_status FROM policies WHERE id = ?",
        (policy_id,)
    ).fetchone()
    assert db_row["expiration_date"] == new_expiration.isoformat()
    assert db_row["management_status"] == ManagementStatus.RENEWED.value

    # Caso fallido: Intentar renovar póliza LOST (vencida hace 40 días)
    lost_exp_date = (today - timedelta(days=40)).isoformat()
    lost_policy_id = insert_policy(test_db, client_id, "POL-RENEW-FAIL", lost_exp_date, "pending")

    fail_response = client.post(
        f"/policies/{lost_policy_id}/renew",
        json={"new_expiration_date": new_expiration.isoformat()}
    )
    
    # Debe denegar la renovación con 400 Bad Request
    assert fail_response.status_code == 400
    assert "LOST" in fail_response.json()["detail"]
