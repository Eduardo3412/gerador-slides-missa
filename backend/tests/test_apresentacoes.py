import io

from pptx import Presentation

from conftest import cadastrar, entrar, novo_client


APRESENTACAO = {
    "nome": "Missa Domingo 20-09-2026",
    "slide_preto": True,
    "momentos": [
        {"momento": "Entrada", "conteudo": "Linha 1\nLinha 2\nLinha 3\nLinha 4\nLinha 5"},
        {"momento": "Comunhão", "conteudo": "Primeira música"},
        {"momento": "Comunhão", "conteudo": "Bloco A\n\nBloco B"},
    ],
}


def criar(client, dados=APRESENTACAO):
    return client.post("/apresentacoes", json=dados)


def test_criar_apresentacao(usuario_logado):
    resposta = criar(usuario_logado)

    assert resposta.status_code == 201
    corpo = resposta.json()
    assert corpo["nome"] == APRESENTACAO["nome"]
    assert corpo["slide_preto"] is True
    assert corpo["criado_em"] and corpo["atualizado_em"]
    # Momentos repetidos (duas Comunhões) e ordem preservada.
    assert [m["momento"] for m in corpo["momentos"]] == ["Entrada", "Comunhão", "Comunhão"]
    assert [m["ordem"] for m in corpo["momentos"]] == [0, 1, 2]


def test_criar_exige_csrf(usuario_logado):
    del usuario_logado.headers["X-CSRF-Token"]
    assert criar(usuario_logado).status_code == 403


def test_criar_com_csrf_incorreto(usuario_logado):
    usuario_logado.headers["X-CSRF-Token"] = "token-falso"
    assert criar(usuario_logado).status_code == 403


def test_criar_sem_login(client):
    assert criar(client).status_code == 401


def test_validacao_de_dados(usuario_logado):
    assert criar(usuario_logado, {"nome": "   ", "momentos": []}).status_code == 422
    assert criar(
        usuario_logado, {"nome": "X", "momentos": [{"momento": "Entrada", "conteudo": ""}]}
    ).status_code == 422
    assert criar(usuario_logado, {"nome": "X" * 151}).status_code == 422


def test_listar_apresentacoes(usuario_logado):
    criar(usuario_logado)
    criar(usuario_logado, {"nome": "Outra", "slide_preto": False, "momentos": []})

    resposta = usuario_logado.get("/apresentacoes")

    assert resposta.status_code == 200
    lista = resposta.json()
    assert len(lista) == 2
    por_nome = {item["nome"]: item for item in lista}
    assert por_nome[APRESENTACAO["nome"]]["quantidade_momentos"] == 3
    assert por_nome["Outra"]["quantidade_momentos"] == 0


def test_consultar_apresentacao(usuario_logado):
    id_ = criar(usuario_logado).json()["id"]

    resposta = usuario_logado.get(f"/apresentacoes/{id_}")

    assert resposta.status_code == 200
    assert resposta.json()["momentos"][2]["conteudo"] == "Bloco A\n\nBloco B"


def test_atualizar_apresentacao(usuario_logado):
    criada = criar(usuario_logado).json()

    novos_dados = {
        "nome": "Nome novo",
        "slide_preto": False,
        "momentos": [
            {"momento": "Final", "conteudo": "Canto final"},
            {"momento": "Entrada", "conteudo": "Linha 1"},
        ],
    }
    resposta = usuario_logado.put(f"/apresentacoes/{criada['id']}", json=novos_dados)

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["nome"] == "Nome novo"
    assert corpo["slide_preto"] is False
    assert [m["momento"] for m in corpo["momentos"]] == ["Final", "Entrada"]
    assert corpo["atualizado_em"] >= criada["atualizado_em"]

    recarregada = usuario_logado.get(f"/apresentacoes/{criada['id']}").json()
    assert recarregada["momentos"] == corpo["momentos"]


def test_excluir_apresentacao(usuario_logado):
    id_ = criar(usuario_logado).json()["id"]

    assert usuario_logado.delete(f"/apresentacoes/{id_}").status_code == 204
    assert usuario_logado.get(f"/apresentacoes/{id_}").status_code == 404
    assert usuario_logado.get("/apresentacoes").json() == []


def test_inexistente_retorna_404(usuario_logado):
    assert usuario_logado.get("/apresentacoes/999").status_code == 404
    assert usuario_logado.put("/apresentacoes/999", json=APRESENTACAO).status_code == 404
    assert usuario_logado.delete("/apresentacoes/999").status_code == 404


def test_usuario_nao_acessa_apresentacao_de_outro(usuario_logado):
    id_maria = criar(usuario_logado).json()["id"]

    with novo_client() as joao:
        cadastrar(joao, email="joao@example.com", nome="João")
        entrar(joao, email="joao@example.com")

        assert joao.get(f"/apresentacoes/{id_maria}").status_code == 404
        assert joao.put(
            f"/apresentacoes/{id_maria}", json={**APRESENTACAO, "nome": "Invadido"}
        ).status_code == 404
        assert joao.delete(f"/apresentacoes/{id_maria}").status_code == 404
        assert joao.get("/apresentacoes").json() == []

    intacta = usuario_logado.get(f"/apresentacoes/{id_maria}").json()
    assert intacta["nome"] == APRESENTACAO["nome"]
    assert len(intacta["momentos"]) == 3


def test_gerar_powerpoint_apos_carregar_apresentacao_salva(usuario_logado):
    id_ = criar(usuario_logado).json()["id"]
    salva = usuario_logado.get(f"/apresentacoes/{id_}").json()

    resposta = usuario_logado.post(
        "/gerar-apresentacao",
        json={
            "nome_arquivo": salva["nome"],
            "slide_preto": salva["slide_preto"],
            "momentos": [
                {"momento": m["momento"], "conteudo": m["conteudo"], "caixa_alta": m["caixa_alta"]}
                for m in salva["momentos"]
            ],
        },
    )

    assert resposta.status_code == 200
    assert 'filename="Missa_Domingo_20-09-2026.pptx"' in resposta.headers["content-disposition"]

    slides = Presentation(io.BytesIO(resposta.content)).slides
    textos = [
        "\n".join(s.shapes[0].text_frame.text.splitlines()) if len(s.shapes) else ""
        for s in slides
    ]
    # Entrada: 5 linhas -> 2 slides (máx. 4 linhas) + preto
    # Comunhão 1: 1 slide + preto; Comunhão 2: 2 blocos -> 2 slides + preto
    # Cantos (Entrada, Comunhão) saem em CAIXA ALTA
    assert textos == [
        "LINHA 1\nLINHA 2\nLINHA 3\nLINHA 4", "LINHA 5", "",
        "PRIMEIRA MÚSICA", "",
        "BLOCO A", "BLOCO B", "",
    ]


def test_gerar_powerpoint_exige_login(client):
    resposta = client.post(
        "/gerar-apresentacao",
        json={"nome_arquivo": "x", "slide_preto": False, "momentos": [{"momento": "a", "conteudo": "b"}]},
    )
    assert resposta.status_code == 401


def test_conteudo_com_html_e_armazenado_como_texto(usuario_logado):
    malicioso = '<img src=x onerror="alert(1)">'
    id_ = criar(
        usuario_logado,
        {"nome": malicioso, "momentos": [{"momento": malicioso, "conteudo": malicioso}]},
    ).json()["id"]

    resposta = usuario_logado.get(f"/apresentacoes/{id_}")

    # A API devolve JSON (não HTML); o escape é responsabilidade do frontend,
    # que renderiza com textContent / escaparHtml.
    assert resposta.headers["content-type"].startswith("application/json")
    assert resposta.headers["x-content-type-options"] == "nosniff"
    assert resposta.json()["momentos"][0]["conteudo"] == malicioso


def test_caixa_alta_padrao_por_momento_e_editavel(usuario_logado):
    criada = criar(
        usuario_logado,
        {
            "nome": "Caixa alta",
            "momentos": [
                {"momento": "Entrada", "conteudo": "Canto"},
                {"momento": "Salmo", "conteudo": "Enviai o vosso Espírito Santo!"},
                {"momento": "Salmo", "conteudo": "Salmo cantado", "caixa_alta": True},
            ],
        },
    ).json()

    assert [m["caixa_alta"] for m in criada["momentos"]] == [True, False, True]
    # O texto é guardado como foi digitado
    assert criada["momentos"][1]["conteudo"] == "Enviai o vosso Espírito Santo!"

    atualizada = usuario_logado.put(
        f"/apresentacoes/{criada['id']}",
        json={"nome": "Caixa alta", "momentos": [{"momento": "Entrada", "conteudo": "Recitado", "caixa_alta": False}]},
    ).json()
    assert atualizada["momentos"][0]["caixa_alta"] is False
