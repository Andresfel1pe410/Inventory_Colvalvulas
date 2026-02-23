from app.repositories.cliente_repository import ClienteRepository
from app.repositories.producto_repository import ProductoRepository
from app.repositories.inventario_repository import InventarioRepository
from app.repositories.pedido_repository import PedidoRepository
from app.repositories.remision_repository import RemisionRepository
from app.repositories.usuario_repository import UsuarioRepository

__all__ = [
    "ClienteRepository",
    "ProductoRepository",
    "InventarioRepository",
    "PedidoRepository",
    "RemisionRepository",
    "UsuarioRepository",
]
