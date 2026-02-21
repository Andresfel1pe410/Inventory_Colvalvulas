"""Servicio de clientes."""
from app.core.exceptions import NotFoundError, ValidationError
from app.models import Cliente
from app.repositories.cliente_repository import ClienteRepository
from app.schemas import ClienteCreate, ClienteUpdate


class ClienteService:
    def __init__(self, db):
        self.db = db
        self.repo = ClienteRepository(db)

    def listar(self, skip: int = 0, limit: int = 100, activos_only: bool = True) -> list[Cliente]:
        q = self.db.query(Cliente)
        if activos_only:
            q = q.filter(Cliente.activo == True)
        return q.offset(skip).limit(limit).all()

    def obtener(self, id: int) -> Cliente:
        c = self.repo.get(id)
        if not c:
            raise NotFoundError("Cliente no encontrado")
        return c

    def crear(self, data: ClienteCreate) -> Cliente:
        if self.repo.exists_codigo(data.codigo):
            raise ValidationError("Ya existe un cliente con ese código")
        d = data.model_dump()
        if not d.get("razon_social") and d.get("nombre"):
            d["razon_social"] = d["nombre"]
        cliente = Cliente(**d)
        self.db.add(cliente)
        self.db.commit()
        self.db.refresh(cliente)
        return cliente

    def actualizar(self, id: int, data: ClienteUpdate) -> Cliente:
        cliente = self.obtener(id)
        attrs = data.model_dump(exclude_unset=True)
        if "codigo" in attrs and attrs["codigo"] != cliente.codigo:
            if self.repo.exists_codigo(attrs["codigo"], exclude_id=id):
                raise ValidationError("Ya existe un cliente con ese código")
        for k, v in attrs.items():
            setattr(cliente, k, v)
        self.db.commit()
        self.db.refresh(cliente)
        return cliente

    def eliminar(self, id: int) -> None:
        cliente = self.obtener(id)
        self.db.delete(cliente)
        self.db.commit()
