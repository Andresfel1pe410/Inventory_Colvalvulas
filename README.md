# ERP Inventario - Colvalvulas

Sistema ERP básico enfocado en **inventario**, **pedidos** y **órdenes de empaque**.

- **Backend:** Python + FastAPI
- **Base de datos:** PostgreSQL (Supabase)
- **Auth:** Supabase Auth (email + password, JWT)

## Estructura del proyecto

```
Inventario_Colvalvulas/
├── app/
│   ├── main.py          # Punto de entrada FastAPI
│   ├── config.py        # Variables de entorno
│   ├── database.py      # Conexión SQLAlchemy
│   ├── models.py        # Modelos ORM
│   ├── schemas.py       # Schemas Pydantic
│   ├── crud.py          # Lógica de negocio
│   ├── auth.py          # JWT verification, get_current_user
│   ├── dependencies.py  # Dependencias compartidas
│   └── routers/
│       ├── productos.py
│       ├── clientes.py
│       ├── pedidos.py
│       ├── inventario.py
│       └── orden_empaque.py
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql   # Tablas + RLS
│       └── 002_sync_usuario_on_signup.sql  # Trigger auth → usuario
├── .env.example
├── requirements.txt
└── README.md
```

## Configuración

### 1. Supabase

1. Crear proyecto en [Supabase](https://supabase.com)
2. En **SQL Editor**, ejecutar `supabase/migrations/001_initial_schema.sql`
3. Ejecutar `supabase/migrations/002_sync_usuario_on_signup.sql` (crea usuario al registrarse)
4. Asignar rol `admin` al primer usuario (en `usuario_rol`)

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
| POST | `/api/v1/pedidos/{id}/detalles` | Agregar detalle a pedido |
| POST | `/api/v1/orden-empaque` | Crear orden de empaque |
| POST | `/api/v1/orden-empaque/{id}/cerrar` | Cerrar orden (genera salidas de inventario) |
| POST | `/api/v1/inventario/movimientos` | Registrar movimiento (entrada/salida/ajuste) |

## Reglas de negocio

- **Stock negativo:** No permitido. Las salidas validan stock disponible.
- **Cierre orden empaque:** Inserta `movimiento_inventario` tipo `salida` y actualiza `inventario.stock_actual`.
- **Totales:** Subtotal y total del pedido se calculan automáticamente.

## Seguridad

- **RLS** habilitado en todas las tablas
- Usuarios autenticados pueden leer
- Solo admin puede insertar/eliminar en tablas maestras
- Solo el creador puede modificar sus pedidos
- `service_role_key` solo en servidor, nunca en frontend
