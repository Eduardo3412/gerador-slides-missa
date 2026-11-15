"""Baseline: tabela usuarios.

A tabela usuarios já existia (criada por criar_tabelas.py). Esta revisão
só a cria quando ela ainda não existe, então pode ser aplicada com
segurança sobre o banco atual sem apagar ou alterar dados.

Revision ID: 0001_usuarios
Revises:
Create Date: 2026-11-09
"""

from alembic import op
import sqlalchemy as sa


revision = "0001_usuarios"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspetor = sa.inspect(op.get_bind())

    if inspetor.has_table("usuarios"):
        return

    op.create_table(
        "usuarios",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nome", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("senha_hash", sa.String(length=255), nullable=False),
        sa.Column("criado_em", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_usuarios_id", "usuarios", ["id"])
    op.create_index("ix_usuarios_email", "usuarios", ["email"], unique=True)


def downgrade() -> None:
    # Intencionalmente vazio: a baseline não remove a tabela de usuários
    # para nunca apagar contas existentes.
    pass
