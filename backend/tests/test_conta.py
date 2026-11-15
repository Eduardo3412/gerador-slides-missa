from conftest import cadastrar, entrar, novo_client


def test_atualizar_perfil(usuario_logado):
    resposta = usuario_logado.put(
        "/usuarios/me", json={"nome": "  Maria Silva ", "email": "Nova@Example.com"}
    )

    assert resposta.status_code == 200
    assert resposta.json() == {"id": 1, "nome": "Maria Silva", "email": "nova@example.com"}
    assert usuario_logado.get("/usuarios/me").json()["email"] == "nova@example.com"


def test_atualizar_perfil_email_de_outro_usuario(usuario_logado):
    cadastrar(usuario_logado, email="joao@example.com", nome="João")

    resposta = usuario_logado.put("/usuarios/me", json={"nome": "Maria", "email": "joao@example.com"})

    assert resposta.status_code == 409


def test_atualizar_perfil_mantendo_mesmo_email(usuario_logado):
    resposta = usuario_logado.put("/usuarios/me", json={"nome": "Maria", "email": "maria@example.com"})
    assert resposta.status_code == 200


def test_atualizar_perfil_exige_csrf_e_login(client, usuario_logado):
    del usuario_logado.headers["X-CSRF-Token"]
    assert usuario_logado.put("/usuarios/me", json={"nome": "X Y", "email": "x@example.com"}).status_code == 403

    with novo_client() as anonimo:
        assert anonimo.put("/usuarios/me", json={"nome": "X Y", "email": "x@example.com"}).status_code == 401


def test_alterar_senha(usuario_logado):
    resposta = usuario_logado.put(
        "/usuarios/me/senha", json={"senha_atual": "senhaForte123", "nova_senha": "outraSenha456"}
    )
    assert resposta.status_code == 204

    with novo_client() as outro:
        assert entrar(outro, senha="senhaForte123").status_code == 401
        assert entrar(outro, senha="outraSenha456").status_code == 200


def test_alterar_senha_com_senha_atual_errada(usuario_logado):
    resposta = usuario_logado.put(
        "/usuarios/me/senha", json={"senha_atual": "errada000", "nova_senha": "outraSenha456"}
    )

    # 400 e não 401: a sessão continua válida.
    assert resposta.status_code == 400
    assert usuario_logado.get("/usuarios/me").status_code == 200


def test_alterar_senha_validacoes(usuario_logado):
    curta = usuario_logado.put("/usuarios/me/senha", json={"senha_atual": "senhaForte123", "nova_senha": "curta"})
    igual = usuario_logado.put(
        "/usuarios/me/senha", json={"senha_atual": "senhaForte123", "nova_senha": "senhaForte123"}
    )

    assert curta.status_code == 422
    assert igual.status_code == 400


def test_excluir_conta_remove_usuario_e_apresentacoes(usuario_logado):
    usuario_logado.post(
        "/apresentacoes",
        json={"nome": "Missa", "momentos": [{"momento": "Entrada", "conteudo": "Texto"}]},
    )

    errada = usuario_logado.request("DELETE", "/usuarios/me", json={"senha": "errada000"})
    assert errada.status_code == 400
    assert usuario_logado.get("/apresentacoes").status_code == 200

    resposta = usuario_logado.request("DELETE", "/usuarios/me", json={"senha": "senhaForte123"})

    assert resposta.status_code == 204
    assert any(c.startswith("access_token=") and "Max-Age=0" in c for c in resposta.headers.get_list("set-cookie"))

    with novo_client() as outro:
        assert entrar(outro).status_code == 401
        # O e-mail volta a ficar disponível e a nova conta começa vazia.
        cadastrar(outro)
        entrar(outro)
        assert outro.get("/apresentacoes").json() == []
