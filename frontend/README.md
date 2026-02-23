# ERP Logístico - Frontend

React + Vite + TypeScript. Conectado al backend FastAPI en `http://localhost:8000`.

## Stack

- React 18
- TypeScript
- Vite
- React Router v6
- Zustand
- Axios
- TailwindCSS
- Supabase Auth (JWT en memoria)

## Configuración

1. Copiar `.env.example` a `.env`
2. Configurar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (mismo proyecto que el backend)

## Ejecutar

```bash
npm install
npm run dev
```

La app corre en http://localhost:5173. El proxy envía `/api` al backend en localhost:8000.

## Estructura

```
src/
├── app/           # Layout, rutas
├── modules/       # Módulos por dominio
│   ├── auth/
│   ├── clientes/
│   ├── productos/
│   ├── inventario/
│   ├── pedidos/
│   ├── control-pedidos/
│   ├── remisiones/
│   └── usuarios/
└── shared/        # Componentes y servicios compartidos
```

## Backend requerido

El backend FastAPI debe estar corriendo en el puerto 8000 con los endpoints:
- `/api/v1/clientes`
- `/api/v1/productos`
- `/api/v1/inventario`
- `/api/v1/pedidos`
- `/api/v1/remisiones`
- `/api/v1/usuarios`
