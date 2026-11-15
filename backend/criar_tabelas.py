"""Cria/atualiza as tabelas aplicando as migrações do Alembic.

Equivale a `alembic upgrade head`. Não usa mais Base.metadata.create_all:
tabelas criadas fora do Alembic fariam as migrações falharem depois.
As migrações apenas criam o que falta; nenhum dado existente é apagado.
"""

import os

from alembic import command
from alembic.config import Config

PASTA_BACKEND = os.path.dirname(os.path.abspath(__file__))

print("Aplicando migrações")
command.upgrade(Config(os.path.join(PASTA_BACKEND, "alembic.ini")), "head")
print("Tabelas criadas/atualizadas com sucesso!")
