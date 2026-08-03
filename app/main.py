"""
ERP Inventario - API principal.
Arquitectura limpia: Repository + Service.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.logging_config import setup_logging
from app.core.exceptions import AppException
from app.api.auth.auth_router import router as auth_router
from app.api.auth.debug_auth import router as debug_auth
from app.api.ventas import clientes, productos, inventario, pedidos, remisiones, usuarios, roles, reportes
from app.api.proceso import inventario_proceso, planeacion
from app.api.rrhh import empleados, asistencia, device

setup_logging()
logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Iniciando aplicación ERP Inventario")
    yield
    logger.info("Cerrando aplicación")


app = FastAPI(
    title="ERP Inventario",
    description="Sistema ERP: inventario, pedidos, remisiones",
    version="1.0.0",
    lifespan=lifespan,
)

origins = [o.strip() for o in settings.CORS_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    logger.warning("AppException: %s", exc.message)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message},
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception("Error no controlado: %s", exc)
    # Incluir mensaje del error para facilitar diagnóstico (evitar exponer stack traces)
    msg = str(exc) if str(exc) else "Error interno del servidor"
    return JSONResponse(
        status_code=500,
        content={"detail": msg},
    )


ventas_prefix = f"{settings.API_V1_PREFIX}/ventas"
proceso_prefix = f"{settings.API_V1_PREFIX}/proceso"
rrhh_prefix = f"{settings.API_V1_PREFIX}/rrhh"
auth_prefix = f"{settings.API_V1_PREFIX}/auth"

app.include_router(auth_router, prefix=auth_prefix)
app.include_router(debug_auth, prefix=auth_prefix)
app.include_router(debug_auth, prefix=settings.API_V1_PREFIX)

for api_prefix in (settings.API_V1_PREFIX, ventas_prefix):
    app.include_router(clientes, prefix=api_prefix)
    app.include_router(productos, prefix=api_prefix)
    app.include_router(inventario, prefix=api_prefix)
    app.include_router(pedidos, prefix=api_prefix)
    app.include_router(remisiones, prefix=api_prefix)
    app.include_router(usuarios, prefix=api_prefix)
    app.include_router(roles, prefix=api_prefix)
    app.include_router(reportes, prefix=api_prefix)

for api_prefix in (settings.API_V1_PREFIX, proceso_prefix):
    app.include_router(inventario_proceso, prefix=api_prefix)
    app.include_router(planeacion, prefix=api_prefix)

for api_prefix in (settings.API_V1_PREFIX, rrhh_prefix):
    app.include_router(empleados, prefix=api_prefix)
    app.include_router(asistencia, prefix=api_prefix)

# Rutas del dispositivo (ESP32): públicas, un solo mount bajo el prefijo versionado.
app.include_router(device, prefix=settings.API_V1_PREFIX)


@app.get("/")
def root():
    return {
        "message": "ERP Inventario API",
        "docs": "/docs",
        "apis": {
            "auth": auth_prefix,
            "ventas": ventas_prefix,
            "proceso": proceso_prefix,
            "rrhh": rrhh_prefix,
        },
    }


@app.get("/health")
def health():
    return {"status": "ok"}
