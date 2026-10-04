from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth import gerar_hash_senha
from database import get_db
from models import Usuario
from schemas import UsuarioCadastro, UsuarioResposta

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
    db.commit()
    db.refresh(novo_usuario)

    return novo_usuario