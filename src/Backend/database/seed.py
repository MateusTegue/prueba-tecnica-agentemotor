"""
Datos semilla para demostración del sistema.

Incluye 8 clientes, 11 pólizas cubriendo los 4 estados temporales,
y 5 intentos de contacto con diferentes outcomes.

Las fechas de las pólizas se calculan dinámicamente a partir de la
fecha actual para garantizar que los estados temporales sean correctos
independientemente de cuándo se ejecute el seed.
"""

from datetime import date, timedelta
from database.connection import db_session


def seed_data() -> None:
    """
    Inserta datos de demostración si la base de datos está vacía.
    Solo se ejecuta si no hay clientes existentes (idempotente).
    """
    with db_session() as db:
        # Verificar si ya existen datos
        count = db.execute("SELECT COUNT(*) FROM clients").fetchone()[0]
        if count > 0:
            return

        today = date.today()

        # ---------------------------------------------------------------
        # Clientes
        # ---------------------------------------------------------------
        clients = [
            (1, "Carlos Martínez",     "3001234567", "carlos.martinez@email.com"),
            (2, "Ana Gómez",           "3109876543", "ana.gomez@email.com"),
            (3, "Luis Rodríguez",      "3205551234", None),
            (4, "María Fernanda López","3154567890", "mf.lopez@email.com"),
            (5, "Jorge Hernández",     "3008765432", "jorge.h@email.com"),
            (6, "Patricia Díaz",       "3112223344", "patricia.diaz@email.com"),
            (7, "Ricardo Torres",      "3009991111", None),
            (8, "Camila Vargas",       "3167778899", "camila.v@email.com"),
        ]

        db.executemany(
            "INSERT INTO clients (id, name, phone, email) VALUES (?, ?, ?, ?)",
            clients,
        )

        # ---------------------------------------------------------------
        # Pólizas — fechas relativas a hoy para estados temporales correctos
        # ---------------------------------------------------------------
        policies = [
            # ACTIVE: vencen en más de 30 días
            (1,  "POL-2024-001", 1, "auto",  "Sura",      str(today + timedelta(days=200)), "pending",   "2025-12-15"),
            (2,  "POL-2024-002", 2, "hogar", "Bolívar",   str(today + timedelta(days=115)), "pending",   "2025-09-20"),
            (3,  "POL-2024-003", 3, "vida",  "Allianz",   str(today + timedelta(days=230)), "pending",   "2026-01-10"),

            # EXPIRING_SOON: vencen en los próximos 1-30 días
            (4,  "POL-2024-004", 4, "auto",  "Mapfre",    str(today + timedelta(days=8)),   "pending",   "2025-06-05"),
            (5,  "POL-2024-005", 1, "hogar", "Sura",      str(today + timedelta(days=18)),  "pending",   "2025-06-15"),
            (6,  "POL-2024-006", 5, "auto",  "Liberty",   str(today + timedelta(days=28)),  "contacted", "2025-06-25"),

            # EXPIRED_RECOVERABLE: vencidas hace 1-30 días (dentro de ventana)
            (7,  "POL-2024-007", 6, "auto",  "Previsora", str(today - timedelta(days=3)),   "pending",   "2025-05-25"),
            (8,  "POL-2024-008", 7, "auto",  "Bolívar",   str(today - timedelta(days=18)),  "contacted", "2025-05-10"),
            (9,  "POL-2024-009", 2, "vida",  "Sura",      str(today - timedelta(days=8)),   "pending",   "2025-05-20"),

            # LOST: vencidas hace más de 30 días
            (10, "POL-2024-010", 8, "auto",  "Mapfre",    str(today - timedelta(days=43)),  "pending",   "2025-04-15"),
            (11, "POL-2024-011", 3, "hogar", "Allianz",   str(today - timedelta(days=88)),  "contacted", "2025-03-01"),
        ]

        db.executemany(
            "INSERT INTO policies (id, policy_number, client_id, type, insurer, expiration_date, management_status, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            policies,
        )

        # ---------------------------------------------------------------
        # Intentos de contacto
        # ---------------------------------------------------------------
        contact_attempts = [
            (6,  "no_answer",          "No contestó, intentar en la tarde",              str(today - timedelta(days=1)) + " 09:30:00"),
            (6,  "callback_requested", "Pidió que lo llamaran el viernes",               str(today - timedelta(days=1)) + " 14:15:00"),
            (8,  "no_answer",          "Teléfono apagado",                               str(today - timedelta(days=13)) + " 10:00:00"),
            (8,  "successful",         "Confirmó interés en renovar, pide cotización",   str(today - timedelta(days=10)) + " 11:30:00"),
            (11, "wrong_number",       "Número equivocado, verificar datos del cliente", str(today - timedelta(days=53)) + " 08:45:00"),
        ]

        db.executemany(
            "INSERT INTO contact_attempts (policy_id, outcome, notes, created_at) "
            "VALUES (?, ?, ?, ?)",
            contact_attempts,
        )

        db.commit()
        print(f"Datos semilla insertados: {len(clients)} clientes, {len(policies)} pólizas, {len(contact_attempts)} intentos de contacto")
