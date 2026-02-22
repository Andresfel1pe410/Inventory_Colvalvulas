-- =============================================
-- Sincronización: crear usuario en public.usuario y asignar rol
-- cuando se registra en auth.users
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    nuevo_usuario_id BIGINT;
BEGIN
    -- 1. Insertar en public.usuario (evitar duplicados por auth_user_id)
    INSERT INTO public.usuario (auth_user_id, email, nombre, apellido, activo)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'apellido', ''),
        TRUE
    )
    ON CONFLICT (auth_user_id) DO NOTHING;

    -- 2. Obtener el id del usuario (ya existía o acaba de crearse)
    SELECT id INTO nuevo_usuario_id
    FROM public.usuario
    WHERE auth_user_id = NEW.id;

    -- 3. Asignar rol "vendedor" por defecto en usuario_rol
    IF nuevo_usuario_id IS NOT NULL THEN
        INSERT INTO public.usuario_rol (usuario_id, rol_id)
        SELECT nuevo_usuario_id, r.id
        FROM public.rol r
        WHERE r.nombre = 'vendedor'
        ON CONFLICT (usuario_id, rol_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger en auth.users (Supabase permite esto)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
