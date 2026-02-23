"""Repositorio de remisiones."""
from sqlalchemy import func
from sqlalchemy.orm import joinedload
from app.repositories.base_repository import BaseRepository
from app.models import Remision


class RemisionRepository(BaseRepository[Remision]):
    def __init__(self, db):
        super().__init__(Remision, db)

    def generar_numero(self) -> str:
        max_id = self.db.query(func.max(Remision.id)).scalar() or 0
        return f"REM-{max_id + 1:06d}"

    def get_by_pedido_id(self, pedido_id: int) -> Remision | None:
        """Obtiene la remisión asociada a un pedido (la más reciente si hay varias)."""
        return (
            self.db.query(Remision)
            .filter(Remision.pedido_id == pedido_id)
            .order_by(Remision.id.desc())
            .first()
        )

    def get_with_detalles(self, remision_id: int) -> Remision | None:
        """Obtiene remisión con sus detalles."""
        return (
            self.db.query(Remision)
            .options(joinedload(Remision.detalles))
            .filter(Remision.id == remision_id)
            .first()
        )

    def get_all_with_pedido(self, skip: int = 0, limit: int = 100):
        return (
            self.db.query(Remision)
            .options(joinedload(Remision.pedido))
            .order_by(Remision.id.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
