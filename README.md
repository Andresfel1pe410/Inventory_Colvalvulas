# ERP Inventario - Colvalvulas

Sistema ERP enfocado en **inventario**, **pedidos** y **remisiones**.

- **Backend:** Python + FastAPI
- **Base de datos:** PostgreSQL (Supabase)
- **Auth:** Supabase Auth (email + password, JWT)

## Estructura del proyecto

```
Inventario_Colvalvulas/
├── app/
│   ├── main.py              # Punto de entrada FastAPI
│   ├── models.py            # Modelos ORM
│   ├── schemas.py           # Schemas Pydantic
│   ├── core/                # Config, DB, logging, excepciones
│   ├── api/
│   │   ├── auth.py          # JWT verification, get_current_user
│   │   └── routers/
│   │       ├── productos.py
│   │       ├── clientes.py
│   │       ├── pedidos.py
│   │       ├── inventario.py
│   │       ├── remisiones.py
│   │       ├── usuarios.py
│   │       └── roles.py
│   ├── repositories/        # Acceso a datos
│   └── services/            # Lógica de negocio
├── supabase/
│   └── migrations/          # Migraciones SQL
├── frontend/                # React + Vite
├── .env.example
├── requirements.txt
└── README.md
```

## Configuración

### 1. Supabase

1. Crear proyecto en [Supabase](https://supabase.com)
2. Ejecutar migraciones en orden (001 a 018)
3. Asignar rol `admin` al primer usuario (en `usuario_rol`)

### 2. Variables de entorno

Copiar `.env.example` a `.env`:

```bash
cp .env.example .env
```

Configurar:

- `DATABASE_URL`: Connection string de Supabase (Settings → Database)
- `SUPABASE_URL`: URL del proyecto
- `SUPABASE_ANON_KEY`: Clave anónima (segura para frontend)
- `SUPABASE_SERVICE_ROLE_KEY`: Clave de servicio (solo backend, nunca en frontend)

### 3. Instalación

```bash
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt
```

### 4. Ejecutar

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API disponible en: http://localhost:8000  
Documentación: http://localhost:8000/docs

## Autenticación

1. **Registro:** Supabase Auth (`/auth/v1/signup`) con email + password
2. El trigger crea automáticamente el registro en `usuario`
3. **Login:** Supabase Auth retorna JWT
4. **API:** Enviar header `Authorization: Bearer <token>`

## Endpoints principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/productos` | Listar productos |
| POST | `/api/v1/productos` | Crear producto |
| GET | `/api/v1/clientes` | Listar clientes |
| POST | `/api/v1/pedidos` | Crear pedido |
| GET | `/api/v1/pedidos` | Listar pedidos |
| POST | `/api/v1/pedidos/{id}/marcar-enviado` | Marcar pedido enviado (genera remisión y salidas) |
| POST | `/api/v1/pedidos/{id}/desmarcar-enviado` | Revertir envío |
| GET | `/api/v1/inventario` | Listar inventario |
| POST | `/api/v1/inventario/movimientos` | Registrar movimiento (entrada/salida/ajuste) |
| GET | `/api/v1/remisiones` | Listar remisiones |

## Reglas de negocio

- **Stock negativo:** No permitido. Las salidas validan stock disponible.
- **Marcar enviado:** Genera remisión automática, registra salidas de inventario y actualiza stock.
- **Totales:** Subtotal y total del pedido se calculan automáticamente.

## Seguridad

- **RLS** habilitado en todas las tablas
- Usuarios autenticados pueden leer
- Solo admin puede insertar/eliminar en tablas maestras
- Solo el creador puede modificar sus pedidos
- `service_role_key` solo en servidor, nunca en frontend
