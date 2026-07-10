"""Pruebas de las dependencias centralizadas de permisos (app/api/deps.py)."""


def test_admin_only_rechaza_sin_rol_admin(client, vendedor_user, autenticar):
    autenticar(vendedor_user)
    resp = client.get("/api/v1/usuarios")
    assert resp.status_code == 403


def test_admin_only_permite_admin(client, admin_user, autenticar):
    autenticar(admin_user)
    resp = client.get("/api/v1/usuarios")
    assert resp.status_code == 200


def test_admin_only_rechaza_sin_autenticar(client):
    resp = client.get("/api/v1/usuarios")
    assert resp.status_code == 401


def test_admin_o_almacen_permite_almacen(client, almacen_user, autenticar):
    autenticar(almacen_user)
    resp = client.get("/api/v1/inventario")
    assert resp.status_code == 200


def test_admin_o_almacen_rechaza_vendedor(client, vendedor_user, autenticar):
    autenticar(vendedor_user)
    resp = client.get("/api/v1/inventario")
    assert resp.status_code == 403


def test_admin_o_almacen_permite_admin(client, admin_user, autenticar):
    autenticar(admin_user)
    resp = client.get("/api/v1/inventario")
    assert resp.status_code == 200
