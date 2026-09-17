from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from gerador_pptx import gerar_apresentacao_completa

import os
import re
import unicodedata


app = FastAPI()


# ======================================================
# CORS
# ======================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ======================================================
# MODELOS DOS DADOS
# ======================================================

class Momento(BaseModel):
    momento: str
    conteudo: str


class Apresentacao(BaseModel):
    nome_arquivo: str
    slide_preto: bool
    momentos: list[Momento]


# ======================================================
# TRATAMENTO DO NOME DO ARQUIVO
# ======================================================

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

@app.post("/gerar-apresentacao")
def gerar_apresentacao(dados: Apresentacao):

    nome_arquivo = criar_nome_arquivo(
        dados.nome_arquivo
    )

    # Pasta do backend
    pasta_backend = os.path.dirname(
        os.path.abspath(__file__)
    )

    # Pasta slides_gerados
    pasta_slides = os.path.abspath(
        os.path.join(
            pasta_backend,
            "..",
            "slides_gerados"
        )
    )

    # Cria a pasta caso ela não exista
    os.makedirs(
        pasta_slides,
        exist_ok=True
    )

    caminho_arquivo = os.path.join(
        pasta_slides,
        nome_arquivo
    )

    gerar_apresentacao_completa(
        dados.momentos,
        dados.slide_preto,
        caminho_arquivo
    )

    return FileResponse(
        caminho_arquivo,
        media_type=(
            "application/vnd.openxmlformats-officedocument."
            "presentationml.presentation"
        ),
        filename=nome_arquivo
    )