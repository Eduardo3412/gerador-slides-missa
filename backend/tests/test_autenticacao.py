from datetime import datetime, timedelta, timezone

import jwt

from auth import ALGORITHM, SECRET_KEY
from conftest import cadastrar, entrar


def test_cadastro_usuario(client):
    resposta = cadastrar(client, email="Maria@Example.com")

    assert resposta.status_code == 201
    corpo = resposta.json()
    assert corpo["email"] == "maria@example.com"
    assert "senha" not in corpo and "senha_hash" not in corpo


def test_cadastro_email_duplicado(client):
    cadastrar(client)
    resposta = cadastrar(client, email="MARIA@example.com")

    assert resposta.status_code == 409


def test_cadastro_dados_invalidos(client):
    resposta = cadastrar(client, email="nao-e-email", senha="curta")
    assert resposta.status_code == 422


def test_login_valido_define_cookies(client):
    cadastrar(client)
    resposta = entrar(client)

    assert resposta.status_code == 200
    assert resposta.json()["nome"] == "Maria"

    cookies = resposta.headers.get_list("set-cookie")
    acesso = next(c for c in cookies if c.startswith("access_token="))
    csrf = next(c for c in cookies if c.startswith("csrf_token="))

    assert "HttpOnly" in acesso
    assert "samesite=lax" in acesso.lower()
    assert "HttpOnly" not in csrf
    # O token não vai no corpo (nada para o frontend guardar em localStorage).
    assert "token" not in resposta.json()


def test_login_senha_errada(client):
    cadastrar(client)
    resposta = entrar(client, senha="senhaErrada999")

    assert resposta.status_code == 401
    assert "access_token" not in client.cookies


def test_login_email_inexistente(client):
    resposta = entrar(client, email="ninguem@example.com")
    assert resposta.status_code == 401


def test_rota_protegida_sem_login(client):
    assert client.get("/usuarios/me").status_code == 401
    assert client.get("/apresentacoes").status_code == 401


def test_rota_protegida_com_login(usuario_logado):
    resposta = usuario_logado.get("/usuarios/me")

    assert resposta.status_code == 200
    assert resposta.json()["email"] == "maria@example.com"


def test_token_expirado(client):
    cadastrar(client)
    token = jwt.encode(
        {"sub": "1", "exp": datetime.now(timezone.utc) - timedelta(minutes=1)},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )
    client.cookies.set("access_token", token)

    resposta = client.get("/usuarios/me")
    assert resposta.status_code == 401
    assert "expirada" in resposta.json()["detail"]


def test_token_adulterado(client):
    cadastrar(client)
    token = jwt.encode(
        {"sub": "1", "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
        "outra-chave-qualquer-com-tamanho-suficiente",
        algorithm=ALGORITHM,
    )
    client.cookies.set("access_token", token)

    assert client.get("/usuarios/me").status_code == 401


def test_logout(usuario_logado):
    resposta = usuario_logado.post("/usuarios/logout")

    assert resposta.status_code == 204
    cookies = resposta.headers.get_list("set-cookie")
    assert any(c.startswith("access_token=") and "Max-Age=0" in c for c in cookies)
    assert any(c.startswith("csrf_token=") and "Max-Age=0" in c for c in cookies)

    assert usuario_logado.get("/usuarios/me").status_code == 401


def test_logout_exige_csrf_com_sessao_valida(usuario_logado):
    del usuario_logado.headers["X-CSRF-Token"]

    resposta = usuario_logado.post("/usuarios/logout")

    assert resposta.status_code == 403
    assert usuario_logado.get("/usuarios/me").status_code == 200


def test_logout_sem_sessao_apenas_limpa_cookies(client):
    assert client.post("/usuarios/logout").status_code == 204


def test_cors_permite_origem_configurada_e_bloqueia_outras(client):
    permitida = client.options(
        "/apresentacoes",
        headers={
            "Origin": "http://127.0.0.1:5500",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,x-csrf-token",
        },
    )
    assert permitida.headers.get("access-control-allow-origin") == "http://127.0.0.1:5500"
    assert permitida.headers.get("access-control-allow-credentials") == "true"

    bloqueada = client.options(
        "/apresentacoes",
        headers={"Origin": "https://site-malicioso.example", "Access-Control-Request-Method": "POST"},
    )
    assert "access-control-allow-origin" not in bloqueada.headers
