from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from database import get_db
from models import Apresentacao, MomentoApresentacao, Usuario, agora_utc
from schemas import (ApresentacaoEntrada, ApresentacaoResposta, ApresentacaoResumo)
from seguranca import get_usuario_atual, verificar_csrf

router = APIRouter(
    prefix="/apresentacoes",
    tags=["Apresentações"],
    # CSRF é verificado apenas em POST/PUT/DELETE (GET passa direto).
    dependencies=[Depends(verificar_csrf)],
)


def _buscar_apresentacao_do_usuario(
    db: Session, apresentacao_id: int, usuario: Usuario
) -> Apresentacao:
    """Busca sempre filtrando pelo dono. Apresentações de outros usuários
    respondem 404 (e não 403) para não revelar que o ID existe."""
    apresentacao = db.scalar(
        select(Apresentacao)
        .options(selectinload(Apresentacao.momentos))
        .where(
            Apresentacao.id == apresentacao_id,
            Apresentacao.usuario_id == usuario.id,
        )
    )

    if not apresentacao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Apresentação não encontrada.",
        )

    return apresentacao


def _criar_momentos(dados: ApresentacaoEntrada) -> list[MomentoApresentacao]:
    return [
        MomentoApresentacao(
            ordem=indice,
            momento=item.momento,
            conteudo=item.conteudo,
            caixa_alta=item.caixa_alta,
        )
        for indice, item in enumerate(dados.momentos)
    ]


@router.post("", response_model=ApresentacaoResposta, status_code=status.HTTP_201_CREATED)
def criar_apresentacao(
    dados: ApresentacaoEntrada,
    usuario: Usuario = Depends(get_usuario_atual),
    db: Session = Depends(get_db),
):
    apresentacao = Apresentacao(
        usuario_id=usuario.id,
        nome=dados.nome,
        slide_preto=dados.slide_preto,
        momentos=_criar_momentos(dados),
    )

    db.add(apresentacao)
    db.commit()
    db.refresh(apresentacao)

    return apresentacao


@router.get("", response_model=list[ApresentacaoResumo])
def listar_apresentacoes(
    usuario: Usuario = Depends(get_usuario_atual),
    db: Session = Depends(get_db),
):
    quantidade = (
        select(func.count(MomentoApresentacao.id))
        .where(MomentoApresentacao.apresentacao_id == Apresentacao.id)
        .correlate(Apresentacao)
        .scalar_subquery()
    )

    linhas = db.execute(
        select(Apresentacao, quantidade)
        .where(Apresentacao.usuario_id == usuario.id)
        .order_by(Apresentacao.atualizado_em.desc(), Apresentacao.id.desc())
    ).all()

    return [
        ApresentacaoResumo(
            id=apresentacao.id,
            nome=apresentacao.nome,
            slide_preto=apresentacao.slide_preto,
            quantidade_momentos=total,
            criado_em=apresentacao.criado_em,
            atualizado_em=apresentacao.atualizado_em,
        )
        for apresentacao, total in linhas
    ]


@router.get("/{apresentacao_id}", response_model=ApresentacaoResposta)
def obter_apresentacao(
    apresentacao_id: int,
    usuario: Usuario = Depends(get_usuario_atual),
    db: Session = Depends(get_db),
):
    return _buscar_apresentacao_do_usuario(db, apresentacao_id, usuario)


@router.put("/{apresentacao_id}", response_model=ApresentacaoResposta)
def atualizar_apresentacao(
    apresentacao_id: int,
    dados: ApresentacaoEntrada,
    usuario: Usuario = Depends(get_usuario_atual),
    db: Session = Depends(get_db),
):
    apresentacao = _buscar_apresentacao_do_usuario(db, apresentacao_id, usuario)

    apresentacao.nome = dados.nome
    apresentacao.slide_preto = dados.slide_preto
    apresentacao.atualizado_em = agora_utc()

    # Substitui a lista de momentos. O flush intermediário remove os
    # antigos antes de inserir os novos, respeitando o UNIQUE de (apresentacao_id, ordem).
    apresentacao.momentos.clear()
    db.flush()
    apresentacao.momentos.extend(_criar_momentos(dados))

    db.commit()
    db.refresh(apresentacao)

    return apresentacao


@router.delete("/{apresentacao_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_apresentacao(
    apresentacao_id: int,
    usuario: Usuario = Depends(get_usuario_atual),
    db: Session = Depends(get_db),
):
    apresentacao = _buscar_apresentacao_do_usuario(db, apresentacao_id, usuario)

    db.delete(apresentacao)
    db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)
