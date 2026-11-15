from datetime import datetime, timezone
from typing import Annotated

from pydantic import AfterValidator, BaseModel, EmailStr, Field, StringConstraints, model_validator

from gerador_pptx import caixa_alta_padrao

class UsuarioCadastro(BaseModel):
    nome: str = Field(min_length=2, max_length=100)
    email: EmailStr
    senha: str = Field(min_length=8, max_length=100)

class UsuarioLogin(BaseModel):
    email: EmailStr
    senha: str

class UsuarioAtualizacao(BaseModel):
    nome: str = Field(min_length=2, max_length=100)
    email: EmailStr


class SenhaAlteracao(BaseModel):
    senha_atual: str = Field(min_length=1, max_length=100)
    nova_senha: str = Field(min_length=8, max_length=100)


class ContaExclusao(BaseModel):
    senha: str = Field(min_length=1, max_length=100)


class UsuarioResposta(BaseModel):
    id: int
    nome: str
    email: EmailStr

    model_config = {"from_attributes": True}


# ======================================================
# APRESENTAÇÕES
# ======================================================

TextoCurto = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]

LIMITE_MOMENTOS = 200


def _garantir_utc(valor: datetime) -> datetime:
    # Bancos sem suporte a fuso (ex.: SQLite nos testes) devolvem datas
    # "naive"; as datas são gravadas em UTC, então o fuso é explicitado
    # para o navegador converter corretamente para o horário local.
    return valor.replace(tzinfo=timezone.utc) if valor.tzinfo is None else valor


DataHoraUTC = Annotated[datetime, AfterValidator(_garantir_utc)]


class MomentoEntrada(BaseModel):
    momento: Annotated[TextoCurto, StringConstraints(max_length=100)]
    conteudo: Annotated[TextoCurto, StringConstraints(max_length=20000)]
    # None = padrão do momento (cantos em CAIXA ALTA, respostas em caixa normal)
    caixa_alta: bool | None = None

    @model_validator(mode="after")
    def _aplicar_padrao_caixa_alta(self):
        if self.caixa_alta is None:
            self.caixa_alta = caixa_alta_padrao(self.momento)
        return self


class ApresentacaoEntrada(BaseModel):
    nome: Annotated[TextoCurto, StringConstraints(max_length=150)]
    slide_preto: bool = True
    # A ordem da lista é a ordem da apresentação.
    momentos: list[MomentoEntrada] = Field(default_factory=list, max_length=LIMITE_MOMENTOS)


class MomentoResposta(BaseModel):
    id: int
    ordem: int
    momento: str
    conteudo: str
    caixa_alta: bool

    model_config = {"from_attributes": True}


class ApresentacaoResumo(BaseModel):
    id: int
    nome: str
    slide_preto: bool
    quantidade_momentos: int
    criado_em: DataHoraUTC
    atualizado_em: DataHoraUTC


class ApresentacaoResposta(BaseModel):
    id: int
    nome: str
    slide_preto: bool
    criado_em: DataHoraUTC
    atualizado_em: DataHoraUTC
    momentos: list[MomentoResposta]

    model_config = {"from_attributes": True}
