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
from app.api.routers import (
    auth_router,
    clientes,
    productos,
    inventario,
    pedidos,
    remisiones,
    usuarios,
    roles,
    debug_auth,
)

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


app.include_router(auth_router.router, prefix=settings.API_V1_PREFIX)
app.include_router(clientes.router, prefix=settings.API_V1_PREFIX)
app.include_router(productos.router, prefix=settings.API_V1_PREFIX)
app.include_router(inventario.router, prefix=settings.API_V1_PREFIX)
app.include_router(pedidos.router, prefix=settings.API_V1_PREFIX)
app.include_router(remisiones.router, prefix=settings.API_V1_PREFIX)
app.include_router(usuarios.router, prefix=settings.API_V1_PREFIX)
app.include_router(roles.router, prefix=settings.API_V1_PREFIX)
app.include_router(debug_auth.router, prefix=settings.API_V1_PREFIX)


@app.get("/")
def root():
    return {"message": "ERP Inventario API", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}
