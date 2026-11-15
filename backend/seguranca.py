"""Sessão por cookie: emissão/remoção de cookies, usuário atual e CSRF."""

import secrets

from fastapi import Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from auth import TEMPO_EXPIRACAO_MINUTOS, obter_dados_token
from config import (
    CABECALHO_CSRF,
    COOKIE_ACESSO,
    COOKIE_CSRF,
    COOKIE_SAMESITE,
    COOKIE_SECURE,
)
from database import get_db
from models import Usuario


METODOS_SEGUROS = {"GET", "HEAD", "OPTIONS"}


def definir_cookies_sessao(response: Response, token: str, csrf_token: str) -> None:
    max_age = TEMPO_EXPIRACAO_MINUTOS * 60

    response.set_cookie(
        key=COOKIE_ACESSO,
        value=token,
        httponly=True,
        max_age=max_age,
        samesite=COOKIE_SAMESITE,
        secure=COOKIE_SECURE,
        path="/",
    )

    # Legível pelo JavaScript (não é HttpOnly) para ser reenviado no
    # cabeçalho X-CSRF-Token (padrão "double submit" assinado no JWT).
    response.set_cookie(
        key=COOKIE_CSRF,
        value=csrf_token,
        httponly=False,
        max_age=max_age,
        samesite=COOKIE_SAMESITE,
        secure=COOKIE_SECURE,
        path="/",
    )


def remover_cookies_sessao(response: Response) -> None:
    for nome, httponly in ((COOKIE_ACESSO, True), (COOKIE_CSRF, False)):
        response.delete_cookie(
            key=nome,
            path="/",
            secure=COOKIE_SECURE,
            httponly=httponly,
            samesite=COOKIE_SAMESITE,
        )


def _nao_autenticado(detalhe: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detalhe,
    )


def obter_sessao(request: Request) -> dict:
    """Valida o cookie de acesso e retorna as claims do JWT."""
    token = request.cookies.get(COOKIE_ACESSO)

    if not token:
        raise _nao_autenticado("Usuário não autenticado.")

    dados = obter_dados_token(token)

    if dados is None:
        raise _nao_autenticado("Sessão inválida ou expirada.")

    return dados


def get_usuario_atual(
    sessao: dict = Depends(obter_sessao),
    db: Session = Depends(get_db),
) -> Usuario:
    usuario = db.get(Usuario, sessao["sub"])

    if not usuario:
        raise _nao_autenticado("Usuário não encontrado.")

    return usuario


def verificar_csrf(
    request: Request,
    sessao: dict = Depends(obter_sessao),
) -> None:
    """Exige o cabeçalho X-CSRF-Token em métodos que alteram dados."""
    if request.method in METODOS_SEGUROS:
        return

    esperado = sessao.get("csrf")
    recebido = request.headers.get(CABECALHO_CSRF)

    if not esperado or not recebido or not secrets.compare_digest(
        str(esperado), recebido
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Token CSRF ausente ou inválido. Entre novamente.",
        )
