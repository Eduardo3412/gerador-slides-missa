from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from config import CABECALHO_CSRF, COOKIE_SECURE, CORS_ORIGINS
from gerador_pptx import gerar_apresentacao_completa
from routers.apresentacoes import router as apresentacoes_router
from routers.usuarios import router as usuarios_router
from seguranca import get_usuario_atual

import io
import os
import re
import unicodedata
from urllib.parse import quote


app = FastAPI()

app.include_router(usuarios_router)
app.include_router(apresentacoes_router)

# Com cookies (allow_credentials=True) as origens precisam ser explícitas:
# "*" não é aceito pelos navegadores e permitiria qualquer site.
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", CABECALHO_CSRF],
    expose_headers=["Content-Disposition"],
)


# Mude este valor sempre que publicar um frontend com HTML/CSS incompatível
# com o anterior: cada navegador limpa o cache antigo do site uma única vez.
VERSAO_FRONTEND = "20261114-react"
COOKIE_VERSAO_FRONTEND = "versao_frontend"


@app.middleware("http")
async def cabecalhos_seguranca(request: Request, call_next):
    # Primeira página carregada por um navegador com versão antiga (ou sem
    # versão): ignora a validação condicional (força 200 em vez de 304) para
    # que a resposta leve o Clear-Site-Data abaixo.
    precisa_limpar_cache = (
        request.method == "GET"
        and request.cookies.get(COOKIE_VERSAO_FRONTEND) != VERSAO_FRONTEND
    )
    if precisa_limpar_cache:
        request.scope["headers"] = [
            (nome, valor)
            for nome, valor in request.scope["headers"]
            if nome not in (b"if-none-match", b"if-modified-since")
        ]

    resposta = await call_next(request)
    resposta.headers.setdefault("X-Content-Type-Options", "nosniff")
    resposta.headers.setdefault("X-Frame-Options", "DENY")
    resposta.headers.setdefault("Referrer-Policy", "same-origin")

    # Páginas, CSS e JS do frontend: o navegador sempre confere (via ETag)
    # se há versão nova. Sem isso ele podia usar um style.css antigo do
    # cache junto com o HTML novo, deixando a página desformatada.
    # Os arquivos de /assets têm o hash do conteúdo no nome (build do Vite):
    # nunca mudam, então podem ficar em cache por tempo indeterminado.
    tipo = resposta.headers.get("content-type", "")
    if request.url.path.startswith("/assets/") and resposta.status_code == 200:
        resposta.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    elif tipo.startswith(("text/html", "text/css", "text/javascript", "application/javascript")):
        resposta.headers["Cache-Control"] = "no-cache"

    # Apaga do navegador as páginas antigas guardadas em cache (ex.: uma
    # versão anterior de "Minhas apresentações"), uma vez por versão.
    # Vale para qualquer resposta: até a chamada /usuarios/me feita por uma
    # página antiga vinda do cache já dispara a limpeza.
    if precisa_limpar_cache:
        resposta.headers["Clear-Site-Data"] = '"cache"'
        resposta.set_cookie(
            COOKIE_VERSAO_FRONTEND,
            VERSAO_FRONTEND,
            max_age=60 * 60 * 24 * 365,
            httponly=True,
            samesite="lax",
            secure=COOKIE_SECURE,
            path="/",
        )

    return resposta


class Momento(BaseModel):
    momento: str
    conteudo: str
    # None = padrão do momento (cantos em CAIXA ALTA, respostas em caixa normal)
    caixa_alta: bool | None = None


class Apresentacao(BaseModel):
    nome_arquivo: str
    slide_preto: bool
    momentos: list[Momento] = Field(min_length=1)


# TRATAMENTO DO NOME DO ARQUIVO
def criar_nome_arquivo(nome):

    # Remove acentos
    nome = unicodedata.normalize(
        "NFKD",
        nome
    ).encode(
        "ASCII",
        "ignore"
    ).decode("ASCII")

    # Remove caracteres inválidos
    nome = re.sub(
        r"[^a-zA-Z0-9\s_-]",
        "",
        nome
    )

    # Troca espaços por _
    nome = re.sub(
        r"\s+",
        "_",
        nome.strip()
    )

    if not nome:
        nome = "apresentacao"

    return f"{nome}.pptx"


# ======================================================
# GERAR APRESENTAÇÃO
# ======================================================

@app.post("/gerar-apresentacao", dependencies=[Depends(get_usuario_atual)])
def gerar_apresentacao(dados: Apresentacao):

    nome_arquivo = criar_nome_arquivo(
        dados.nome_arquivo
    )

    # O arquivo é gerado em memória: com vários usuários, gravar em uma
    # pasta compartilhada fazia apresentações com o mesmo nome se
    # sobrescreverem. A lógica de geração (gerador_pptx) não foi alterada.
    buffer = io.BytesIO()

    gerar_apresentacao_completa(
        dados.momentos,
        dados.slide_preto,
        buffer
    )

    return Response(
        content=buffer.getvalue(),
        media_type=(
            "application/vnd.openxmlformats-officedocument."
            "presentationml.presentation"
        ),
        headers={
            "Content-Disposition": (
                f"attachment; filename=\"{nome_arquivo}\"; "
                f"filename*=UTF-8''{quote(nome_arquivo)}"
            )
        }
    )


# ======================================================
# FRONTEND (mesma origem da API: cookies e CSRF sem depender de CORS)
# Serve o build do React (frontend/dist, gerado com "npm run build").
# Em desenvolvimento use o servidor do Vite (npm run dev), que repassa
# as chamadas da API para este backend.
# ======================================================

PASTA_FRONTEND = os.path.realpath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "dist")
)
INDEX_FRONTEND = os.path.join(PASTA_FRONTEND, "index.html")

if os.path.isfile(INDEX_FRONTEND):
    PASTA_ASSETS = os.path.join(PASTA_FRONTEND, "assets")
    if os.path.isdir(PASTA_ASSETS):
        app.mount("/assets", StaticFiles(directory=PASTA_ASSETS), name="assets")

    # Rotas da tela (/editor, /conta...) são resolvidas pelo React Router:
    # qualquer GET que não seja da API nem um arquivo do build devolve o
    # index.html. Fica por último para não encobrir as rotas da API.
    @app.get("/{caminho:path}", include_in_schema=False)
    def frontend(caminho: str):
        arquivo = os.path.realpath(os.path.join(PASTA_FRONTEND, caminho))
        if (
            caminho
            and arquivo.startswith(PASTA_FRONTEND + os.sep)
            and os.path.isfile(arquivo)
        ):
            return FileResponse(arquivo)
        return FileResponse(INDEX_FRONTEND)
