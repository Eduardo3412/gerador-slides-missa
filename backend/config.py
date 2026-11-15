"""Configurações da aplicação lidas de variáveis de ambiente (.env).

Variáveis opcionais (todas têm valor padrão seguro para desenvolvimento):

- AMBIENTE: "development" (padrão) ou "production".
- COOKIE_SECURE: "true"/"false". Padrão: true em produção, false em desenvolvimento.
- COOKIE_SAMESITE: "lax" (padrão), "strict" ou "none" (exige COOKIE_SECURE=true).
- CORS_ORIGINS: origens permitidas separadas por vírgula.
"""

import os

from dotenv import load_dotenv

load_dotenv()


def _bool_env(nome: str, padrao: bool) -> bool:
    valor = os.getenv(nome)
    if valor is None or valor.strip() == "":
        return padrao
    return valor.strip().lower() in {"1", "true", "sim", "yes", "on"}


AMBIENTE = os.getenv("AMBIENTE", "development").strip().lower()
EM_PRODUCAO = AMBIENTE == "production"

COOKIE_ACESSO = "access_token"
COOKIE_CSRF = "csrf_token"
CABECALHO_CSRF = "X-CSRF-Token"

COOKIE_SECURE = _bool_env("COOKIE_SECURE", EM_PRODUCAO)
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax").strip().lower()

if COOKIE_SAMESITE not in {"lax", "strict", "none"}:
    raise RuntimeError("COOKIE_SAMESITE deve ser 'lax', 'strict' ou 'none'.")

if COOKIE_SAMESITE == "none" and not COOKIE_SECURE:
    raise RuntimeError("COOKIE_SAMESITE=none exige COOKIE_SECURE=true.")

_ORIGENS_PADRAO = (
    "http://127.0.0.1:8000,http://localhost:8000,"
    "http://127.0.0.1:5500,http://localhost:5500"
)

CORS_ORIGINS = [
    origem.strip().rstrip("/")
    for origem in os.getenv("CORS_ORIGINS", _ORIGENS_PADRAO).split(",")
    if origem.strip()
]

if "*" in CORS_ORIGINS:
    raise RuntimeError(
        "CORS_ORIGINS não pode conter '*' quando a autenticação usa cookies."
    )
