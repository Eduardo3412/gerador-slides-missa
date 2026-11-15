from datetime import datetime, timezone
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, true
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


def agora_utc() -> datetime:
    return datetime.now(timezone.utc)


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nome: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    senha_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)

    apresentacoes: Mapped[list["Apresentacao"]] = relationship(
        back_populates="usuario",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class Apresentacao(Base):
    __tablename__ = "apresentacoes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    usuario_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True
    )
    nome: Mapped[str] = mapped_column(String(150), nullable=False)
    slide_preto: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=agora_utc, nullable=False
    )
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=agora_utc, onupdate=agora_utc, nullable=False
    )

    usuario: Mapped[Usuario] = relationship(back_populates="apresentacoes")
    momentos: Mapped[list["MomentoApresentacao"]] = relationship(
        back_populates="apresentacao",
        cascade="all, delete-orphan",
        order_by="MomentoApresentacao.ordem",
    )


class MomentoApresentacao(Base):
    """Um item da apresentação. O mesmo tipo de momento pode se repetir
    (ex.: duas músicas de Comunhão); a posição é definida por `ordem`."""

    __tablename__ = "momentos_apresentacao"
    __table_args__ = (
        UniqueConstraint("apresentacao_id", "ordem", name="uq_momento_apresentacao_ordem"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    apresentacao_id: Mapped[int] = mapped_column(
        ForeignKey("apresentacoes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    ordem: Mapped[int] = mapped_column(Integer, nullable=False)
    momento: Mapped[str] = mapped_column(String(100), nullable=False)
    conteudo: Mapped[str] = mapped_column(Text, nullable=False)
    # Cantos em CAIXA ALTA; respostas do povo em caixa normal. O texto é
    # guardado como foi digitado e só é convertido ao gerar os slides.
    caixa_alta: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=true()
    )

    apresentacao: Mapped[Apresentacao] = relationship(back_populates="momentos")
