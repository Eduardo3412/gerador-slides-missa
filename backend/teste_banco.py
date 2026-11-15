from sqlalchemy import text

from database import engine


try:

    with engine.connect() as conexao:

        resultado = conexao.execute(
            text("SELECT version();")
        )

        versao = resultado.scalar()

        print("\nCONEXÃO REALIZADA COM SUCESSO!")
        print("\nPostgreSQL:")
        print(versao)


except Exception as erro:

    print("\nERRO AO CONECTAR COM O BANCO:")
    print(erro)