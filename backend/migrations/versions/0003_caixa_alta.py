"""Adiciona momentos_apresentacao.caixa_alta.

Cantos ficam em CAIXA ALTA e respostas do povo em caixa normal. Os
momentos já salvos recebem o padrão do seu tipo: Salmo, Preces e Oração
Eucarística em caixa normal; os demais em CAIXA ALTA. Nenhum dado é apagado.

Revision ID: 0003_caixa_alta
Revises: 0002_apresentacoes
Create Date: 2026-11-14
"""

from alembic import op
import sqlalchemy as sa


revision = "0003_caixa_alta"
down_revision = "0002_apresentacoes"
branch_labels = None
depends_on = None

MOMENTOS_RESPOSTA = ("Salmo", "Preces", "Oração Eucarística")


def upgrade() -> None:
    with op.batch_alter_table("momentos_apresentacao") as tabela:
        tabela.add_column(
            sa.Column("caixa_alta", sa.Boolean(), nullable=False, server_default=sa.true())
        )

    momentos = sa.table(
        "momentos_apresentacao",
        sa.column("momento", sa.String),
        sa.column("caixa_alta", sa.Boolean),
    )
    op.execute(
        momentos.update()
        .where(momentos.c.momento.in_(MOMENTOS_RESPOSTA))
        .values(caixa_alta=False)
    )


def downgrade() -> None:
    with op.batch_alter_table("momentos_apresentacao") as tabela:
        tabela.drop_column("caixa_alta")
