"""Cria apresentacoes e momentos_apresentacao.

Revision ID: 0002_apresentacoes
Revises: 0001_usuarios
Create Date: 2026-11-09
"""

from alembic import op
import sqlalchemy as sa


revision = "0002_apresentacoes"
down_revision = "0001_usuarios"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "apresentacoes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "usuario_id",
            sa.Integer(),
            sa.ForeignKey("usuarios.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("nome", sa.String(length=150), nullable=False),
        sa.Column("slide_preto", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "criado_em",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "atualizado_em",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_apresentacoes_usuario_id", "apresentacoes", ["usuario_id"])

    op.create_table(
        "momentos_apresentacao",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "apresentacao_id",
            sa.Integer(),
            sa.ForeignKey("apresentacoes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("ordem", sa.Integer(), nullable=False),
        sa.Column("momento", sa.String(length=100), nullable=False),
        sa.Column("conteudo", sa.Text(), nullable=False),
        sa.UniqueConstraint(
            "apresentacao_id", "ordem", name="uq_momento_apresentacao_ordem"
        ),
    )
    op.create_index(
        "ix_momentos_apresentacao_apresentacao_id",
        "momentos_apresentacao",
        ["apresentacao_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_momentos_apresentacao_apresentacao_id", table_name="momentos_apresentacao"
    )
    op.drop_table("momentos_apresentacao")
    op.drop_index("ix_apresentacoes_usuario_id", table_name="apresentacoes")
    op.drop_table("apresentacoes")
