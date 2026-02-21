"""Servicio de clientes."""
from app.core.exceptions import NotFoundError, ValidationError
from app.models import Cliente
from app.repositories.cliente_repository import ClienteRepository
from app.schemas import ClienteCreate, ClienteUpdate


class ClienteService:
    def __init__(self, db):
        self.db = db
        self.repo = ClienteRepository(db)

    def listar(self, skip: int = 0, limit: int = 100) -> list[Cliente]:
        return self.db.query(Cliente).offset(skip).limit(limit).all()

    def obtener(self, id: int) -> Cliente:
        c = self.repo.get(id)
        if not c:
            raise NotFoundError("Cliente no encontrado")
        return c

    def crear(self, data: ClienteCreate) -> Cliente:
        if self.repo.exists_documento(data.tipo_documento, data.numero_identificacion):
            raise ValidationError(
                f"Ya existe un cliente con {data.tipo_documento} {data.numero_identificacion}"
            )
        cliente = Cliente(**data.model_dump())
        self.db.add(cliente)
        self.db.commit()
        self.db.refresh(cliente)
        return cliente

    def actualizar(self, id: int, data: ClienteUpdate) -> Cliente:
        cliente = self.obtener(id)
        attrs = data.model_dump(exclude_unset=True)
        tipo = attrs.get("tipo_documento", cliente.tipo_documento)
        num = attrs.get("numero_identificacion", cliente.numero_identificacion)
        if (tipo, num) != (cliente.tipo_documento, cliente.numero_identificacion):
            if self.repo.exists_documento(tipo, num, exclude_id=id):
                raise ValidationError(f"Ya existe un cliente con {tipo} {num}")
        for k, v in attrs.items():
            setattr(cliente, k, v)
        self.db.commit()
        self.db.refresh(cliente)
        return cliente

    def eliminar(self, id: int) -> None:
        cliente = self.obtener(id)
        self.db.delete(cliente)
        self.db.commit()
