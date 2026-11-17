"""
ERP Inventario - API principal.
Arquitectura limpia: Repository + Service.

Modelo de concurrencia (1 worker de uvicorn):
- Endpoints CRUD: `def` + SQLAlchemy síncrono -> corren en el threadpool
  (THREADPOOL_SIZE hilos), en paralelo, sin bloquear el event loop.
- Código que llama a servicios externos lentos (p. ej. el agente/LLM):
  `async def` + `app.core.http_client.get_http_client()`.
"""
import asyncio
import logging
from contextlib import asynccontextmanager

import anyio.to_thread
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.logging_config import setup_logging
from app.core.exceptions import AppException
from app.core.http_client import abrir_http_client, cerrar_http_client
from app.api.auth.jwt import precargar_jwks
from app.api.auth.auth_router import router as auth_router
from app.api.auth.debug_auth import router as debug_auth
from app.api.ventas import clientes, productos, inventario, pedidos, remisiones, usuarios, roles, reportes
from app.api.proceso import inventario_proceso, planeacion, mis_tareas
from app.api.rrhh import empleados, asistencia, device

setup_logging()
logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Iniciando aplicación ERP Inventario")
    # Tamaño del threadpool donde FastAPI ejecuta los endpoints/dependencias `def`.
    anyio.to_thread.current_default_thread_limiter().total_tokens = settings.THREADPOOL_SIZE
    await abrir_http_client()
    # Descarga del JWKS en segundo plano (en un hilo): no retrasa el arranque
    # y el primer login ya no tiene que pagarla.
    app.state.jwks_task = asyncio.create_task(asyncio.to_thread(precargar_jwks))
    yield
    await cerrar_http_client()
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
    # El detalle (SQL, trazas) queda solo en los logs del servidor; al cliente
    # no se le expone información interna.
    logger.exception("Error no controlado en %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Error interno del servidor"},
    )


auth_prefix = f"{settings.API_V1_PREFIX}/auth"
ventas_prefix = f"{settings.API_V1_PREFIX}/ventas"
proceso_prefix = f"{settings.API_V1_PREFIX}/proceso"
rrhh_prefix = f"{settings.API_V1_PREFIX}/rrhh"

app.include_router(auth_router, prefix=auth_prefix)
if settings.DEBUG_ENDPOINTS:
    app.include_router(debug_auth, prefix=auth_prefix)

for r in (clientes, productos, inventario, pedidos, remisiones, usuarios, roles, reportes):
    app.include_router(r, prefix=ventas_prefix)

for r in (inventario_proceso, planeacion, mis_tareas):
    app.include_router(r, prefix=proceso_prefix)

for r in (empleados, asistencia):
    app.include_router(r, prefix=rrhh_prefix)

# Rutas del dispositivo (ESP32): públicas, bajo el prefijo versionado.
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
