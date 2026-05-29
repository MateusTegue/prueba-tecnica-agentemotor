"""
Conexión a SQLite y creación del schema.

Usa sqlite3 de la librería estándar por simplicidad.
El schema implementa CHECK constraints para management_status y outcome,
índices para las queries más frecuentes, y PRAGMA foreign_keys=ON.
"""

import sqlite3
import os
from contextlib import contextmanager

DATABASE_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "agentemotor.db")

SCHEMA_SQL = """
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- ------------------------------------------------------------
-- Tabla: clients
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clients (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    name    TEXT    NOT NULL,
    phone   TEXT    NOT NULL,
    email   TEXT
);

-- ------------------------------------------------------------
-- Tabla: policies
-- El estado temporal (ACTIVE, EXPIRING_SOON, EXPIRED_RECOVERABLE,
-- LOST) se calcula en runtime a partir de expiration_date.
-- Solo management_status se almacena como estado de gestión.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS policies (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    policy_number       TEXT    NOT NULL UNIQUE,
    client_id           INTEGER NOT NULL,
    type                TEXT    NOT NULL,
    insurer             TEXT    NOT NULL,
    expiration_date     TEXT    NOT NULL,
    management_status   TEXT    NOT NULL DEFAULT 'pending'
                        CHECK (management_status IN ('pending', 'contacted', 'renewed')),
    created_at          TEXT    NOT NULL DEFAULT (date('now')),
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE INDEX IF NOT EXISTS idx_policies_expiration ON policies(expiration_date);
CREATE INDEX IF NOT EXISTS idx_policies_client ON policies(client_id);
CREATE INDEX IF NOT EXISTS idx_policies_status ON policies(management_status);

-- ------------------------------------------------------------
-- Tabla: contact_attempts
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contact_attempts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    policy_id   INTEGER NOT NULL,
    outcome     TEXT    NOT NULL
                CHECK (outcome IN ('successful', 'no_answer', 'callback_requested', 'wrong_number')),
    notes       TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (policy_id) REFERENCES policies(id)
);

CREATE INDEX IF NOT EXISTS idx_contact_attempts_policy ON contact_attempts(policy_id);
"""


def get_connection() -> sqlite3.Connection:
    """Crea una conexión a SQLite con row_factory para acceso por nombre de columna."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


@contextmanager
def db_session():
    """
    Context manager para obtener una conexión a la base de datos (uso interno en scripts).

    Uso:
        with db_session() as db:
            db.execute("SELECT ...")
            db.commit()
    """
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()


def get_db():
    """
    Dependencia de FastAPI para inyectar la conexión de base de datos en las rutas.
    Se limpia automáticamente al terminar la petición HTTP.
    """
    with db_session() as session:
        yield session


def init_db() -> None:
    """
    Inicializa la base de datos: crea las tablas si no existen.
    Se ejecuta una sola vez al iniciar la aplicación.
    """
    with db_session() as db:
        db.executescript(SCHEMA_SQL)
    print(f"Base de datos inicializada en: {DATABASE_PATH}")
