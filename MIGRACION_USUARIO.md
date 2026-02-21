# Crear usuario manualmente en la base de datos

Si obtienes **401 Unauthorized** después de iniciar sesión, probablemente tu usuario existe en Supabase Auth pero **no en la tabla `usuario`**.

## Diagnóstico rápido

1. Inicia sesión en el frontend.
2. Abre en el navegador: `http://localhost:5173/api/v1/debug/auth` (o la URL de tu frontend + `/api/v1/debug/auth`).
3. La respuesta indica exactamente dónde falla:
   - `no_token` → El frontend no envía el token (revisa que iniciaste sesión).
   - `token_invalid` → JWT inválido o expirado (revisa `SUPABASE_JWT_SECRET` en `.env`).
   - `usuario_not_found` → Tu usuario no está en la tabla `usuario` (ejecuta el SQL abajo).

## Solución: ejecutar en Supabase SQL Editor

### Opción 1: Crear usuario desde auth.users (recomendado)

Reemplaza `tu-email@ejemplo.com` con tu email de Supabase:

```sql
INSERT INTO public.usuario (auth_user_id, email, nombre, apellido, activo)
SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data->>'nombre', split_part(email, '@', 1)),
    raw_user_meta_data->>'apellido',
    true
FROM auth.users
WHERE email = 'tu-email@ejemplo.com'
ON CONFLICT (auth_user_id) DO NOTHING;
```

### Opción 2: Verificar si tu usuario existe

```sql
-- Ver usuarios en auth (Supabase)
SELECT id, email FROM auth.users;

-- Ver usuarios en nuestra tabla
SELECT id, auth_user_id, email FROM public.usuario;
```

Si tu email está en `auth.users` pero NO en `usuario`, usa la Opción 1.

### Opción 3: Asignar rol admin (opcional)

```sql
-- Después de crear el usuario, asignar rol admin
INSERT INTO public.usuario_rol (usuario_id, rol_id)
SELECT u.id, r.id 
FROM public.usuario u, public.rol r 
WHERE u.email = 'tu-email@ejemplo.com' AND r.nombre = 'admin'
ON CONFLICT DO NOTHING;
```
