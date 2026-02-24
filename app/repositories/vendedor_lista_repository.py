"""Repositorio de asignación listas a vendedores."""
from app.repositories.base_repository import BaseRepository
from app.models import VendedorListaPrecio


class VendedorListaRepository(BaseRepository[VendedorListaPrecio]):
    def __init__(self, db):
        super().__init__(VendedorListaPrecio, db)

    def get_listas_by_usuario(self, usuario_id: int) -> list[str]:
        rows = (
            self.db.query(VendedorListaPrecio.lista)
            .filter(VendedorListaPrecio.usuario_id == usuario_id)
            .all()
        )
        return [r[0] for r in rows]

    def get_listas_by_usuarios_bulk(self, usuario_ids: list[int]) -> dict[int, list[str]]:
        """Listas de varios usuarios en una sola consulta. {usuario_id: [lista1, lista2]}."""
        if not usuario_ids:
            return {}
        rows = (
            self.db.query(VendedorListaPrecio.usuario_id, VendedorListaPrecio.lista)
            .filter(VendedorListaPrecio.usuario_id.in_(usuario_ids))
            .all()
        )
        result: dict[int, list[str]] = {uid: [] for uid in usuario_ids}
        for usuario_id, lista in rows:
            result[usuario_id].append(lista)
        return result

    def set_listas(self, usuario_id: int, listas: list[str]) -> None:
        self.db.query(VendedorListaPrecio).filter(
            VendedorListaPrecio.usuario_id == usuario_id
        ).delete()
        for lista in listas:
            self.db.add(VendedorListaPrecio(usuario_id=usuario_id, lista=lista))
        self.db.commit()
