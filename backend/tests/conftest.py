"""Configuração dos testes.

Os testes NUNCA usam o banco do .env. Por padrão usam SQLite em memória;
para rodar contra um PostgreSQL de testes defina TEST_DATABASE_URL
(precisa ser diferente de DATABASE_URL).
"""

import os
import sys

from dotenv import dotenv_values

PASTA_BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PASTA_BACKEND)

_url_producao = dotenv_values(os.path.join(PASTA_BACKEND, ".env")).get("DATABASE_URL")
URL_TESTES = os.getenv("TEST_DATABASE_URL", "sqlite://")

if _url_producao and URL_TESTES == _url_producao:
    raise RuntimeError("TEST_DATABASE_URL não pode ser o banco do .env.")

# Definidos antes de importar a aplicação: load_dotenv() não sobrescreve
# variáveis já existentes, então database.py nunca recebe a URL real.
os.environ["DATABASE_URL"] = URL_TESTES
os.environ.setdefault("SECRET_KEY", "chave-somente-para-testes-0123456789abcdef")
os.environ["AMBIENTE"] = "test"
os.environ["COOKIE_SECURE"] = "false"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base, get_db
from main import app

if URL_TESTES.startswith("sqlite"):
    engine_testes = create_engine(
        URL_TESTES,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine_testes, "connect")
    def _ativar_fk(conexao, _):
        conexao.execute("PRAGMA foreign_keys=ON")
else:
    engine_testes = create_engine(URL_TESTES)

SessaoTestes = sessionmaker(bind=engine_testes, autoflush=False, autocommit=False)


def _get_db_testes():
    db = SessaoTestes()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def banco_limpo():
    Base.metadata.create_all(bind=engine_testes)
    app.dependency_overrides[get_db] = _get_db_testes
    yield
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine_testes)


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def novo_client():
    return TestClient(app)


def cadastrar(client, email="maria@example.com", senha="senhaForte123", nome="Maria"):
    return client.post(
        "/usuarios/cadastro", json={"nome": nome, "email": email, "senha": senha}
    )


def entrar(client, email="maria@example.com", senha="senhaForte123"):
    resposta = client.post("/usuarios/login", json={"email": email, "senha": senha})
    csrf = client.cookies.get("csrf_token")
    if csrf:
        client.headers["X-CSRF-Token"] = csrf
    return resposta


@pytest.fixture
def usuario_logado(client):
    cadastrar(client)
    assert entrar(client).status_code == 200
    return client
