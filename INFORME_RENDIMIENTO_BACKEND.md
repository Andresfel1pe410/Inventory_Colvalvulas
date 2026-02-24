# Informe de Rendimiento - Backend Inventario_Colvalvulas

**Fecha:** 23 de febrero de 2025  
**Alcance:** Directorio `app/` (Repositories, Services, Routers, Database, Config)

---

## Resumen Ejecutivo

Se identificaron **18 problemas** de rendimiento clasificados por prioridad. Los más críticos son patrones N+1 en usuarios, queries redundantes en routers de pedidos, y uso inconsistente de sesiones.

---

## 1. REPOSITORIES

### 1.1 Patrón N+1 en `listar_con_roles` (usuario_repository + usuario_service)

| Campo | Detalle |
|-------|---------|
| **Archivo** | `app/services/usuario_service.py` |
| **Líneas** | 17-35 |
| **Problema** | En un bucle sobre cada usuario se llama `get_roles(u.id)` y `get_listas_by_usuario(u.id)`, generando **2N queries adicionales** (N usuarios × 2 llamadas). |
| **Sugerencia** | Crear `UsuarioRepository.get_all_with_roles_and_listas(skip, limit)` que use `selectinload(Usuario.roles)` y una subconsulta o CTE para cargar roles y listas en batch. Alternativamente: `get_roles_bulk(usuario_ids)` y `get_listas_by_usuarios_bulk(usuario_ids)` con una sola query cada una. |
| **Prioridad** | **Alta** |

### 1.2 `get_by_codigo_lista` sin eager loading (producto_repository)

| Campo | Detalle |
|-------|---------|
| **Archivo** | `app/repositories/producto_repository.py` |
| **Líneas** | 19-28 |
| **Problema** | Devuelve `plp.producto`; al acceder a `producto` se dispara lazy load. Además, el servicio hace `refresh` + `get_with_listas` después, sumando 3 queries extra. |
| **Sugerencia** | Añadir `joinedload(ProductoListaPrecio.producto).joinedload(Producto.listas_precio)` en la query, o crear `get_by_codigo_lista_with_listas(codigo, lista)` que devuelva el producto con listas en una sola query. |
| **Prioridad** | **Alta** |

### 1.3 `exists_codigo_en_lista` en bucle (producto_repository + producto_service)

| Campo | Detalle |
|-------|---------|
| **Archivo** | `app/services/producto_service.py` |
| **Líneas** | 50-53 (crear), 81-86 (actualizar) |
| **Problema** | Se valida cada `(codigo, lista)` con una query individual. Con 10 listas = 10 queries. |
| **Sugerencia** | Crear `exists_codigos_en_lista_batch(lista_codigos: list[tuple])` que use `IN` o `EXISTS` para validar todos en una sola query. |
| **Prioridad** | **Media** |

### 1.4 `get_precio_lista` en bucle (pedido_service)

| Campo | Detalle |
|-------|---------|
| **Archivo** | `app/services/pedido_service.py` |
| **Líneas** | 88, 135 (en crear/actualizar) |
| **Problema** | `_precio_desde_lista()` llama a `get_precio_lista()` por cada detalle. Con 20 detalles = 20 queries extra. |
| **Sugerencia** | Crear `ProductoRepository.get_precios_por_lista(producto_ids: list[int], lista: str)` que devuelva un dict `{producto_id: precio}` en una sola query. |
| **Prioridad** | **Media** |

### 1.5 `_recalcular_totales` hace query redundante (pedido_repository)

| Campo | Detalle |
|-------|---------|
| **Archivo** | `app/services/pedido_service.py` |
| **Líneas** | 284-291 |
| **Problema** | Usa `self.repo.get(pedido_id)` cuando el pedido ya está en memoria con detalles cargados. Genera un SELECT innecesario. |
| **Sugerencia** | Cambiar firma a `_recalcular_totales(pedido: Pedido)` y pasar el objeto ya cargado. Evitar el `get()` redundante. |
| **Prioridad** | **Baja** |

---

## 2. SERVICES

### 2.1 `obtener_por_codigo_lista` — 4 queries cuando podría ser 1 (producto_service)

| Campo | Detalle |
|-------|---------|
| **Archivo** | `app/services/producto_service.py` |
| **Líneas** | 39-45 |
| **Problema** | 1) `get_by_codigo_lista` (query ProductoListaPrecio + lazy load producto), 2) `refresh(p)`, 3) `get_with_listas(p.id)`. Total 4 round-trips. |
| **Sugerencia** | Usar un único método del repositorio que devuelva Producto con listas en una query. Eliminar `refresh` y la segunda llamada a `get_with_listas`. |
| **Prioridad** | **Alta** |

### 2.2 `crear` y `actualizar` — query final redundante (producto_service)

| Campo | Detalle |
|-------|---------|
| **Archivo** | `app/services/producto_service.py` |
| **Líneas** | 71, 102 |
| **Problema** | Tras `commit` + `refresh(producto)` se llama `return self.obtener(producto.id)`, generando una query extra. El objeto ya está actualizado. |
| **Sugerencia** | Devolver `producto` directamente tras `refresh`, o asegurar que `refresh` cargue `listas_precio` si hace falta. |
| **Prioridad** | **Media** |

### 2.3 `actualizar_intencion_envio` — `obtener` redundante en router (pedido_service + pedidos router)

| Campo | Detalle |
|-------|---------|
| **Archivo** | `app/api/routers/pedidos.py` |
| **Líneas** | 139-150 |
| **Problema** | Se llama `obtener()` para validar existencia, luego `actualizar_intencion_envio()`, y de nuevo `obtener()` para la respuesta. El servicio ya retorna el pedido actualizado. |
| **Sugerencia** | Usar el valor retornado por `actualizar_intencion_envio()` en lugar de llamar a `obtener()` de nuevo. El servicio devuelve `Pedido` pero sin detalles; si la API requiere `PedidoConDetalles`, hacer un solo `obtener` al final y eliminar el primero. |
| **Prioridad** | **Alta** |

### 2.4 `marcar_enviado` y `desmarcar_enviado` — queries redundantes (pedidos router)

| Campo | Detalle |
|-------|---------|
| **Archivo** | `app/api/routers/pedidos.py` |
| **Líneas** | 180-196, 208-218 |
| **Problema** | Se llama `obtener()` antes de la acción (validación) y después para la respuesta. `marcar_enviado` y `desmarcar_enviado` ya retornan el pedido. |
| **Sugerencia** | Usar el pedido retornado por el servicio. Si se necesita `PedidoConDetalles`, el servicio debería devolverlo (con `get_with_detalles` al final) para evitar un `obtener()` extra en el router. |
| **Prioridad** | **Alta** |

### 2.5 `actualizar` — query redundante (pedidos router)

| Campo | Detalle |
|-------|---------|
| **Archivo** | `app/api/routers/pedidos.py` |
| **Líneas** | 114-118 |
| **Problema** | `PedidoService(db).actualizar()` ya retorna el pedido actualizado. Se ignora el retorno y se llama `obtener()` de nuevo. |
| **Sugerencia** | `return PedidoService(db).actualizar(...)` en lugar de hacer un `obtener()` adicional. |
| **Prioridad** | **Alta** |

### 2.6 `registrar_movimiento` en bucle — múltiples round-trips (remision_service + inventario_service)

| Campo | Detalle |
|-------|---------|
| **Archivo** | `app/services/remision_service.py` |
| **Líneas** | 95-104 |
| **Problema** | Por cada detalle se llama `registrar_movimiento(..., commit=False)`. Cada llamada hace `get_by_producto()`, `flush`, etc. Aunque no hay commit por llamada, hay múltiples accesos a BD. |
| **Sugerencia** | Crear `registrar_movimientos_batch(movimientos: list[dict])` que procese todos en una transacción, con un solo `get_by_producto` por producto_id (cache en memoria durante el batch). |
| **Prioridad** | **Media** |

### 2.7 Operaciones sin transacción explícita (pedido_service, remision_service)

| Campo | Detalle |
|-------|---------|
| **Archivo** | `app/services/pedido_service.py` (241-282), `app/services/remision_service.py` (53-109) |
| **Líneas** | Varias |
| **Problema** | `desmarcar_enviado` y `generar_desde_pedido` realizan varias operaciones (remisión, movimientos, actualizaciones). Si falla a mitad, puede quedar inconsistencia. |
| **Sugerencia** | Envolver en transacción explícita con `with db.begin()` o `try/commit/except rollback` para garantizar atomicidad. |
| **Prioridad** | **Media** |

---

## 3. ROUTERS / API

### 3.1 Uso de `SessionLocal()` en lugar de `get_db` (6 routers)

| Campo | Detalle |
|-------|---------|
| **Archivos** | `productos.py` (24-33), `clientes.py` (23-31), `pedidos.py` (37-50), `remisiones.py`, `inventario.py`, `usuarios.py` |
| **Problema** | Las funciones `_listar_*_sync` crean `db = SessionLocal()` manualmente y la cierran en `finally`. No usan el ciclo de vida de FastAPI ni el pool de dependencias. |
| **Sugerencia** | Refactorizar para usar `get_db` como dependencia. Si se necesita async, pasar `db` desde un endpoint que use `Depends(get_db)` y ejecutar la lógica síncrona con `asyncio.to_thread(service.listar, db, ...)`. |
| **Prioridad** | **Media** |

### 3.2 `get_roles` y `get_listas_by_usuario` en cada request (auth_router, productos, clientes, pedidos)

| Campo | Detalle |
|-------|---------|
| **Archivos** | `auth_router.py` (31-34), `productos.py` (17-21, 80, 93, 105), `clientes.py` (17-19), `pedidos.py` (26-33) |
| **Problema** | En cada endpoint se llama `UsuarioRepository(db).get_roles(usuario.id)` y a veces `get_listas_by_usuario`. Con `get_current_user` ya se carga el usuario; roles y listas requieren 1-2 queries extra por request. |
| **Sugerencia** | Crear un dependency `get_current_user_with_roles` que devuelva usuario + roles + listas en una sola carga (eager loading o query combinada). Cachear en el request si se usa en varios lugares del mismo endpoint. |
| **Prioridad** | **Media** |

### 3.3 `obtener` redundante en `cambiar_estado` (pedidos router)

| Campo | Detalle |
|-------|---------|
| **Archivo** | `app/api/routers/pedidos.py` |
| **Líneas** | 164-168 |
| **Problema** | Se llama `obtener()` para validar y luego `cambiar_estado()`. `cambiar_estado` ya hace `obtener()` internamente y retorna el pedido. El primer `obtener()` es redundante. |
| **Sugerencia** | Eliminar el primer `obtener()` y dejar que `cambiar_estado` valide y retorne. |
| **Prioridad** | **Media** |

---

## 4. DATABASE

### 4.1 `get_db` — implementación correcta

| Campo | Detalle |
|-------|---------|
| **Archivo** | `app/core/database.py` |
| **Líneas** | 43-49 |
| **Estado** | Uso correcto de generator con `yield` y `finally` para cerrar la sesión. |

### 4.2 Pool sin pooler — configuración conservadora

| Campo | Detalle |
|-------|---------|
| **Archivo** | `app/core/database.py` |
| **Líneas** | 28-37 |
| **Problema** | `pool_size=3`, `max_overflow=2` = 5 conexiones máximas por proceso. Con 4 workers en Railway = 20 conexiones. Puede ser limitante bajo carga. |
| **Sugerencia** | Revisar si se usa pooler de Supabase (puerto 6543). Si no, valorar aumentar `pool_size` según límites de Supabase (~60). Documentar la configuración recomendada. |
| **Prioridad** | **Baja** |

### 4.3 `flush` y `commit` — uso adecuado

| Campo | Detalle |
|-------|---------|
| **Archivos** | Varios services |
| **Estado** | El uso de `flush()` antes de crear relaciones (para obtener IDs) es correcto. No se detectó abuso. |

---

## 5. CONFIG

### 5.1 Workers y timeouts (main.py, railway.json)

| Campo | Detalle |
|-------|---------|
| **Archivos** | `railway.json` (workers: 4), `app/main.py` |
| **Problema** | No hay timeout de request, límite de body size ni rate limiting. Con 4 workers y operaciones síncronas, requests largos pueden bloquear workers. |
| **Sugerencia** | Considerar timeout en uvicorn (`--timeout-keep-alive`). Añadir límite de request body si aplica. Para operaciones pesadas, evaluar colas (Celery, etc.). |
| **Prioridad** | **Baja** |

### 5.2 Config — sin parámetros de rendimiento

| Campo | Detalle |
|-------|---------|
| **Archivo** | `app/core/config.py` |
| **Problema** | No hay configuración para pool size, timeouts de query, o límites de paginación. |
| **Sugerencia** | Añadir opciones como `DB_POOL_SIZE`, `DB_POOL_TIMEOUT`, `API_MAX_LIMIT` para ajustar sin cambiar código. |
| **Prioridad** | **Baja** |

---

## Matriz de Prioridades

| Prioridad | Cantidad | Acción recomendada |
|-----------|----------|--------------------|
| **Alta** | 7 | Corregir en la siguiente iteración |
| **Media** | 8 | Planificar para sprint próximo |
| **Baja** | 3 | Incluir en backlog técnico |

---

## Orden de Implementación Sugerido

1. **Usuario N+1** — Impacto alto en listado de usuarios.
2. **Queries redundantes en pedidos router** — Cambios simples, menos round-trips.
3. **`obtener_por_codigo_lista`** — Muy usado en búsqueda por código.
4. **`get_by_codigo_lista` con eager loading** — Complemento del punto anterior.
5. **Dependency `get_current_user_with_roles`** — Reduce queries en todos los endpoints protegidos.
6. **Validación batch de códigos** — En creación/actualización de productos.
7. **`get_precios_por_lista` batch** — En creación/actualización de pedidos.
8. **Refactor `_listar_*_sync`** — Estandarizar uso de `get_db`.
