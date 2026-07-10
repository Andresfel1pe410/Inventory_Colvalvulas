"""
Fixtures compartidas. Las pruebas corren SIEMPRE contra SQLite en memoria —
nunca contra la base de datos real de Supabase. `db_session` crea un motor
nuevo y aislado por test; `client` sobreescribe `get_db` en la app de FastAPI
para usar esa sesión en vez de la real.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import BigInteger, create_engine
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.api.auth.jwt import get_current_user
import app.models as models  # noqa: F401  (registra todos los modelos en Base.metadata)
from app.models import Usuario, Rol, UsuarioRol
from app.main import app


@compiles(BigInteger, "sqlite")
def _bigint_como_integer_en_sqlite(type_, compiler, **kw):
    """SQLite solo trata la columna como alias de su rowid (con autoincrement)
    si el tipo declarado es exactamente INTEGER, no BIGINT. Sin esto, los ids
    autoincrementales de los modelos (BigInteger en Postgres) quedan NULL."""
    return "INTEGER"


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.fixture()
def client(db_session):
    def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def autenticar():
    """Devuelve una función que hace que el `client` de la prueba actúe como el
    usuario dado, sin necesitar un JWT real de Supabase."""

    def _fn(usuario: Usuario):
        app.dependency_overrides[get_current_user] = lambda: usuario

    yield _fn
    app.dependency_overrides.pop(get_current_user, None)


def _crear_usuario_con_rol(db_session, nombre_rol: str, email: str) -> Usuario:
    rol = db_session.query(Rol).filter_by(nombre=nombre_rol).first()
    if not rol:
        rol = Rol(nombre=nombre_rol, descripcion=nombre_rol)
        db_session.add(rol)
        db_session.flush()
    usuario = Usuario(auth_user_id=f"auth-{email}", email=email, nombre="Test", apellido=nombre_rol, activo=True)
    db_session.add(usuario)
    db_session.flush()
    db_session.add(UsuarioRol(usuario_id=usuario.id, rol_id=rol.id))
    db_session.commit()
    db_session.refresh(usuario)
    return usuario


@pytest.fixture()
def admin_user(db_session):
    return _crear_usuario_con_rol(db_session, "admin", "admin@test.com")


@pytest.fixture()
def vendedor_user(db_session):
    return _crear_usuario_con_rol(db_session, "vendedor", "vendedor@test.com")


@pytest.fixture()
def almacen_user(db_session):
    return _crear_usuario_con_rol(db_session, "almacen", "almacen@test.com")
