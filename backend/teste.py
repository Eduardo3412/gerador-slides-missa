from gerador_pptx import gerar_apresentacao


titulo = "Entrada - Vem, Senhor Jesus"

letra = """
Vem, Senhor Jesus
Vem nos transformar

Vem, Senhor Jesus
Vem nos renovar

Tu és nossa esperança
Tu és nossa salvação

Vem, Senhor Jesus
Vem morar em nosso coração
"""


gerar_apresentacao(
    titulo,
    letra,
    "../slides_gerados/musica_teste.pptx"
)

print("Apresentação criada com sucesso!")