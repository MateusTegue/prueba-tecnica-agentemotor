"""
Módulo de base de datos para el sistema de gestión de pólizas.

- connection.py: Conexión SQLite, creación de schema, context manager
- seed.py: Datos semilla para demostración
"""

from database.connection import get_db, db_session, init_db, DATABASE_PATH
from database.seed import seed_data
