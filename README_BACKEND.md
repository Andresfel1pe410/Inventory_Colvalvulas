# ERP Inventario - Backend

Arquitectura limpia con Repository + Service.

## Estructura

```
app/
├── core/                 # Capa de infraestructura
│   ├── config.py        # Variables de entorno
│   ├── database.py      # SQLAlchemy
│   ├── exceptions.py    # Errores centralizados
│   └── logging_config.py
├── models.py            # ORM SQLAlchemy
├── schemas.py           # Pydantic v2
├── repositories/        # Patrón Repository
├── services/            # Lógica de negocio
├── api/
│   ├── auth.py         # JWT Supabase
│   └── routers/        # Endpoints REST
└── main.py
```

## Reglas de negocio

- **Remisión**: Al generar crea `movimiento_inventario` tipo salida y actualiza inventario
- **Sin eliminación**: No hay endpoints DELETE para registros críticos
- **Transacciones**: Operaciones atómicas con commit explícito

## Ejecutar

```bash
uvicorn app.main:app --reload
```

API: http://localhost:8000  
Docs: http://localhost:8000/docs
