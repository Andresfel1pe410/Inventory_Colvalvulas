"""Router del dispositivo (ESP32 + AS608). Sin autenticación todavía (a propósito:
el firmware no la implementa aún). Únicas rutas públicas del proyecto."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas import DeviceEventRequest, DeviceEventResponse, DeviceEmployeeSync
from app.services.asistencia_service import AsistenciaService

router = APIRouter(prefix="/device", tags=["device"])


@router.post("/event", response_model=DeviceEventResponse)
def registrar_evento(data: DeviceEventRequest, db: Session = Depends(get_db)):
    resultado = AsistenciaService(db).registrar_evento_dispositivo(data.fingerprint_id, data.device_id)
    return resultado


@router.get("/employees", response_model=list[DeviceEmployeeSync])
def sync_empleados(db: Session = Depends(get_db)):
    return AsistenciaService(db).sync_dispositivo()
