from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from auth import criar_token_acesso, gerar_hash_senha, gerar_token_csrf, verificar_senha
from database import get_db
from models import Usuario
from schemas import (ContaExclusao, SenhaAlteracao, UsuarioAtualizacao, UsuarioCadastro, UsuarioLogin, UsuarioResposta)
from seguranca import (definir_cookies_sessao, get_usuario_atual, obter_sessao, remover_cookies_sessao, verificar_csrf)

router = APIRouter(
    prefix="/usuarios",
    tags=["Usuários"]
)

@router.post("/cadastro", response_model=UsuarioResposta, status_code=status.HTTP_201_CREATED)

def cadastrar_usuario(dados: UsuarioCadastro, db: Session = Depends(get_db)):
    email =  dados.email.lower()
    usuario_existente = db.scalar(select(Usuario).where(Usuario.email == email))

    if usuario_existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email já cadastrado."
        )

    novo_usuario = Usuario(
        nome=dados.nome.strip(),
        email=email,
        senha_hash=gerar_hash_senha(dados.senha)
    )

    db.add(novo_usuario)

    try:
        db.commit()
    except IntegrityError:
        # Dois cadastros simultâneos com o mesmo e-mail: a constraint UNIQUE
        # do banco garante a unicidade.
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email já cadastrado."
        )

    db.refresh(novo_usuario)

    return novo_usuario

@router.post(
    "/login",
    response_model=UsuarioResposta
)
def login(dados: UsuarioLogin, response: Response, db: Session = Depends(get_db)):
    email = dados.email.lower()
    usuario = db.scalar(
        select(Usuario).where(Usuario.email == email))

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha inválidos."
        )

    if not verificar_senha(
        dados.senha,
        usuario.senha_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha inválidos."
        )

    csrf_token = gerar_token_csrf()
    token = criar_token_acesso(usuario.id, csrf_token)

    definir_cookies_sessao(response, token, csrf_token)

    return usuario

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, response: Response):
    # Sessão válida: exige CSRF (impede que outro site force o logout).
    # Sessão ausente/expirada: apenas remove os cookies restantes.
    try:
        sessao = obter_sessao(request)
    except HTTPException:
        sessao = None

    if sessao is not None:
        verificar_csrf(request, sessao)

    remover_cookies_sessao(response)
    return None

@router.get("/me",response_model=UsuarioResposta)

def obter_usuario_logado(usuario: Usuario = Depends(get_usuario_atual)):
    return usuario


# ======================================================
# CONFIGURAÇÕES DA CONTA
# Erros de senha usam 400 (e não 401): 401 significa "sessão inválida"
# e faria o frontend mandar o usuário para a tela de login.
# ======================================================

def _exigir_senha_correta(senha: str, usuario: Usuario, mensagem: str) -> None:
    if not verificar_senha(senha, usuario.senha_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=mensagem)


@router.put("/me", response_model=UsuarioResposta, dependencies=[Depends(verificar_csrf)])
def atualizar_perfil(
    dados: UsuarioAtualizacao,
    usuario: Usuario = Depends(get_usuario_atual),
    db: Session = Depends(get_db)
):
    email = dados.email.lower()

    outro = db.scalar(select(Usuario).where(Usuario.email == email, Usuario.id != usuario.id))
    if outro:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email já cadastrado.")

    usuario.nome = dados.nome.strip()
    usuario.email = email

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email já cadastrado.")

    db.refresh(usuario)
    return usuario


@router.put("/me/senha", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(verificar_csrf)])
def alterar_senha(
    dados: SenhaAlteracao,
    usuario: Usuario = Depends(get_usuario_atual),
    db: Session = Depends(get_db)
):
    _exigir_senha_correta(dados.senha_atual, usuario, "Senha atual incorreta.")

    if dados.nova_senha == dados.senha_atual:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A nova senha deve ser diferente da atual."
        )

    usuario.senha_hash = gerar_hash_senha(dados.nova_senha)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(verificar_csrf)])
def excluir_conta(
    dados: ContaExclusao,
    response: Response,
    usuario: Usuario = Depends(get_usuario_atual),
    db: Session = Depends(get_db)
):
    _exigir_senha_correta(dados.senha, usuario, "Senha incorreta. A conta não foi excluída.")

    # As apresentações são removidas junto (ON DELETE CASCADE).
    db.delete(usuario)
    db.commit()

    remover_cookies_sessao(response)
    return None
