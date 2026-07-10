"""CRUD básico de clientes vía TestClient — plantilla para sumar tests de otros módulos."""


def test_crear_listar_actualizar_cliente(client, admin_user, autenticar):
    autenticar(admin_user)

    resp = client.post(
        "/api/v1/clientes",
        json={
            "razon_social": "Cliente Test",
            "tipo_documento": "CC",
            "numero_identificacion": "999888777",
        },
    )
    assert resp.status_code == 201
    cliente_id = resp.json()["id"]

    resp = client.get("/api/v1/clientes")
    assert resp.status_code == 200
    assert any(c["id"] == cliente_id for c in resp.json())

    resp = client.put(f"/api/v1/clientes/{cliente_id}", json={"razon_social": "Cliente Actualizado"})
    assert resp.status_code == 200
    assert resp.json()["razon_social"] == "Cliente Actualizado"


def test_crear_cliente_rechaza_documento_duplicado(client, admin_user, autenticar):
    autenticar(admin_user)
    payload = {
        "razon_social": "Cliente Uno",
        "tipo_documento": "CC",
        "numero_identificacion": "111222333",
    }
    resp = client.post("/api/v1/clientes", json=payload)
    assert resp.status_code == 201

    resp = client.post("/api/v1/clientes", json={**payload, "razon_social": "Cliente Dos"})
    assert resp.status_code == 400


def test_crear_cliente_rechaza_sin_admin(client, vendedor_user, autenticar):
    autenticar(vendedor_user)
    resp = client.post(
        "/api/v1/clientes",
        json={"razon_social": "X", "tipo_documento": "CC", "numero_identificacion": "1"},
    )
    assert resp.status_code == 403
