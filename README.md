# Inventory ERP — Colombiana de Válvulas y Rejillas

Full-stack ERP system for inventory, order, and delivery management,
built and deployed for a Colombian industrial manufacturer.

🔗 **Live app:** https://inventory-colvalvulas.vercel.app  
*(Production system — login required)*

---

## Overview

End-to-end freelance project (2022–2026) replacing a manual 
spreadsheet-based process with a real-time inventory and order 
management platform. The system handles the full operations cycle: 
stock control → order creation → shipment → automatic delivery note 
(remisión) generation.

## Architecture
```
React + Vite (Vercel)
↕ REST API
FastAPI / Python (Railway)
↕ ORM + connection pooling
PostgreSQL (Supabase) + Row Level Security
↕
Supabase Auth (JWT)
```
## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TypeScript |
| Backend | Python, FastAPI, SQLAlchemy |
| Database | PostgreSQL on Supabase (18 versioned migrations) |
| Auth | Supabase Auth — email/password, JWT, role-based access |
| Deployment | Railway (backend), Vercel (frontend) |
| Hardware | ESP32 — attendance control module (integrated) |
| Testing | pytest |
| AI tooling | Cursor AI, Windsurf |

## Key Features

- **Real-time inventory control** — stock entries, exits, and 
  adjustments with negative-stock protection
- **Order management** — full order lifecycle with automatic 
  subtotal/total calculation
- **Shipment workflow** — marking an order as shipped automatically 
  generates a delivery note (remisión) and updates stock
- **Role-based access control** — admin vs. standard user permissions 
  enforced at API and database level (RLS)
- **ESP32 integration** — attendance control hardware module 
  connected to the same backend
- **Versioned schema** — 18 SQL migrations in order, fully 
  reproducible database setup

## Project Structure
```
├── app/
│ ├── main.py # FastAPI entry point
│ ├── models.py # ORM models
│ ├── schemas.py # Pydantic schemas
│ ├── core/ # Config, DB, logging, exceptions
│ ├── api/
│ │ ├── auth.py # JWT verification
│ │ └── routers/ # productos, clientes, pedidos,
│ │ # inventario, remisiones, usuarios, roles
│ ├── repositories/ # Data access layer
│ └── services/ # Business logic layer
├── frontend/ # React + Vite
├── supabase/migrations/ # 18 versioned SQL migrations
├── esp32/ # Attendance control firmware
└── tests/ # pytest test suite
```

## Security

- RLS enabled on all tables
- Authenticated users: read access
- Admin only: insert/delete on master tables
- Order creators: modify their own orders
- `service_role_key` server-side only, never exposed to frontend

## Local Setup

```bash
# Backend
cp .env.example .env
python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# API docs → http://localhost:8000/docs
```

## Main API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/productos` | List products |
| POST | `/api/v1/pedidos` | Create order |
| POST | `/api/v1/pedidos/{id}/marcar-enviado` | Ship order → auto-generates delivery note + stock exit |
| GET | `/api/v1/inventario` | Live inventory |
| POST | `/api/v1/inventario/movimientos` | Register movement (entry/exit/adjustment) |

---

Built by [Andrés Felipe Nieto Gutiérrez](https://linkedin.com/in/andresfnietog)

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
