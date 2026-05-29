"""
Punto de entrada del servidor FastAPI.

Sistema de Gestión de Renovación de Pólizas — MVP
Agentemotor — Prueba Técnica

Ejecutar:
    uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from database import init_db, seed_data
from routes.policy_routes import router as policy_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Inicializa la base de datos y carga datos semilla al arrancar."""
    init_db()
    seed_data()
    yield


app = FastAPI(
    title="Gestión de Renovación de Pólizas",
    description="API para gestión y renovación de pólizas de seguros. MVP — Prueba técnica Agentemotor.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — permitir frontend local
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar rutas
app.include_router(policy_router)


@app.get("/health")
def health_check():
    """Endpoint de salud para verificar que el servidor está corriendo."""
    return {"status": "ok"}
