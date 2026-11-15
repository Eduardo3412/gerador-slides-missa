import os
import secrets
import jwt

from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from pwdlib import PasswordHash

load_dotenv()

password_hash = PasswordHash.recommended()


SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
TEMPO_EXPIRACAO_MINUTOS = 60 * 24


if not SECRET_KEY:
    raise RuntimeError("Secret key não encontrada.")


def gerar_hash_senha(senha: str) -> str:
    return password_hash.hash(senha)

def verificar_senha(senha: str, senha_hash: str) -> bool:
    return password_hash.verify(senha, senha_hash)

def gerar_token_csrf() -> str:
    return secrets.token_urlsafe(32)

def criar_token_acesso(usuario_id: int, csrf_token: str | None = None) -> str:

    expiracao = datetime.now(timezone.utc) + timedelta(
        minutes=TEMPO_EXPIRACAO_MINUTOS
    )

    dados_token = {
        "sub": str(usuario_id),
        "exp": expiracao
    }

    # O token CSRF fica assinado dentro do JWT: um atacante não consegue
    # forjar um par cookie/cabeçalho válido sem conhecer a SECRET_KEY.
    if csrf_token:
        dados_token["csrf"] = csrf_token

    return jwt.encode(
        dados_token,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

def obter_dados_token(token: str) -> dict | None:
    """Retorna as claims do JWT, ou None se o token for inválido/expirado."""
    try:
        dados = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
            options={"require": ["exp", "sub"]}
        )
    except jwt.InvalidTokenError:
        return None

    try:
        dados["sub"] = int(dados["sub"])
    except (TypeError, ValueError):
        return None

    return dados

def decodificar_token(token: str):
    dados = obter_dados_token(token)

    if dados is None:
        return None

    return dados["sub"]
