from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR, MSO_AUTO_SIZE
from pptx.dml.color import RGBColor
from pptx.oxml.ns import qn

import os
import re
from functools import lru_cache


# ======================================================
# PADRÃO DOS SLIDES
# 4:3 (25,4 x 19,05 cm), layout "Em branco" sem marcadores de posição,
# fundo preto, uma caixa de texto em Arial negrito branca, centralizada
# na horizontal e na vertical, com margens internas zeradas.
# Se mudar algum valor aqui, ajuste também o frontend/src/utils/slides.js
# (um teste automático avisa se os dois ficarem diferentes).
# ======================================================

SLIDE_LARGURA_POL = 10.0   # 25,4 cm
SLIDE_ALTURA_POL = 7.5     # 19,05 cm

# Caixa de texto: 1,27 cm do topo, 16,5 cm de altura, quase toda a largura
CAIXA_TOPO_POL = 0.5                                            # 1,27 cm
CAIXA_ALTURA_POL = 6.5                                          # 16,51 cm
CAIXA_ESQUERDA_POL = 0.25                                       # 0,635 cm de cada lado
CAIXA_LARGURA_POL = SLIDE_LARGURA_POL - 2 * CAIXA_ESQUERDA_POL  # 24,13 cm

# Margens internas da caixa zeradas
MARGEM_HORIZONTAL_POL = 0
MARGEM_VERTICAL_POL = 0

FONTE_SLIDE = "Arial"

# Tamanho da letra: entre 40 e 60 pt, conforme a quantidade de texto.
TAMANHO_MAXIMO = 60
TAMANHO_MINIMO = 40
TAMANHOS_FONTE = tuple(range(TAMANHO_MAXIMO, TAMANHO_MINIMO - 1, -1))
# Trechos curtos (até 2 versos): de 60 a 48 pt
VERSOS_TRECHO_CURTO = 2
FAIXA_CURTA = (60, 48)
# Estrofes longas (3 versos ou mais): de 44 a 40 pt
FAIXA_LONGA = (44, 40)

# Altura de uma linha em relação ao tamanho da letra (espaçamento simples
# do PowerPoint para Arial).
ALTURA_LINHA = 1.2

# Pequena folga na largura para diferenças de renderização entre programas
# (a medida com a fonte real bate com o PowerPoint, então 2% basta).
FOLGA_LARGURA = 0.98

AREA_LARGURA_PT = (CAIXA_LARGURA_POL - 2 * MARGEM_HORIZONTAL_POL) * 72 * FOLGA_LARGURA
AREA_ALTURA_PT = (CAIXA_ALTURA_POL - 2 * MARGEM_VERTICAL_POL) * 72


# ======================================================
# CAIXA ALTA
# Letras dos cantos em CAIXA ALTA; respostas do povo (ex.: "Enviai o
# vosso Espírito Santo!") em caixa normal. Este é o padrão de cada
# momento; no editor dá para trocar momento a momento.
# ======================================================

MOMENTOS_RESPOSTA = frozenset({"Salmo", "Preces", "Oração Eucarística"})


def caixa_alta_padrao(momento: str) -> bool:
    """Cantos ficam em CAIXA ALTA; respostas do povo, em caixa normal."""
    return (momento or "").strip() not in MOMENTOS_RESPOSTA


def formatar_texto(texto: str, caixa_alta: bool) -> str:
    return texto.upper() if caixa_alta else texto


# ======================================================
# AJUSTE AUTOMÁTICO DO TAMANHO DA LETRA
# ======================================================

_ARQUIVOS_ARIAL_NEGRITO = (
    os.path.join(os.environ.get("WINDIR", r"C:\Windows"), "Fonts", "arialbd.ttf"),
    "/Library/Fonts/Arial Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/usr/share/fonts/truetype/msttcorefonts/Arial_Bold.ttf",
    # Liberation Sans tem exatamente as mesmas medidas da Arial
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/liberation-sans/LiberationSans-Bold.ttf",
)


@lru_cache(maxsize=1)
def _fonte_para_medir():
    """Arial Negrito real (via Pillow), ou None se não estiver instalada."""
    try:
        from PIL import ImageFont
    except ImportError:
        return None

    for caminho in _ARQUIVOS_ARIAL_NEGRITO:
        if os.path.exists(caminho):
            try:
                return ImageFont.truetype(caminho, 1000)
            except OSError:
                continue
    return None


def _largura_em(texto: str) -> float:
    """Largura do texto em Arial Negrito, em "em" (1 em = tamanho da letra)."""
    fonte = _fonte_para_medir()

    if fonte is not None:
        return fonte.getlength(texto) / 1000

    # Sem a fonte instalada: larguras médias da Arial Negrito (estimativa
    # um pouco maior que a real, para nunca estourar).
    total = 0.0
    for caractere in texto:
        if caractere == " ":
            total += 0.28
        elif caractere.isupper():
            total += 0.74
        elif caractere.isdigit():
            total += 0.56
        elif caractere in "iljtfI.,;:!'|":
            total += 0.34
        elif caractere in "mwMW":
            total += 0.9
        else:
            total += 0.62
    return total


def _linhas_apos_quebra(linha: str, tamanho: float) -> int:
    """Quantas linhas o PowerPoint usa para exibir `linha` neste tamanho."""
    if _largura_em(linha) * tamanho <= AREA_LARGURA_PT:
        return 1

    linhas = 1
    atual = ""
    for palavra in linha.split(" "):
        tentativa = f"{atual} {palavra}" if atual else palavra
        if _largura_em(tentativa) * tamanho <= AREA_LARGURA_PT:
            atual = tentativa
            continue
        if atual:
            linhas += 1
        # Palavra maior que a linha inteira: o PowerPoint a parte em pedaços
        pedacos = max(1, -(-_largura_em(palavra) * tamanho // AREA_LARGURA_PT))
        linhas += int(pedacos) - 1
        atual = palavra
    return linhas


def _faixa_por_quantidade(quantidade_versos: int) -> tuple[int, int]:
    return FAIXA_CURTA if quantidade_versos <= VERSOS_TRECHO_CURTO else FAIXA_LONGA


def _total_linhas(linhas: list[str], tamanho: float) -> int:
    return sum(_linhas_apos_quebra(l, tamanho) for l in linhas)


def _cabe_na_altura(total_linhas: int, tamanho: float) -> bool:
    return total_linhas * tamanho * ALTURA_LINHA <= AREA_ALTURA_PT


def calcular_formatacao(linhas: list[str]) -> tuple[int, float]:
    """Tamanho da letra (pt) e escala de redução automática de um slide.

    1º) na faixa da quantidade de texto (até 2 versos: 60-48 pt;
        3 ou mais: 44-40 pt), o maior tamanho em que cada verso cabe
        inteiro numa linha;
    2º) da faixa até 40 pt, o maior em que o texto cabe na caixa,
        mesmo quebrando versos longos;
    3º) se nem a 40 pt couber, fica em 40 pt com a redução do PowerPoint
        ("Reduzir o texto ao transbordar") já calculada na escala
        devolvida. Escala 1.0 = sem redução.
    """
    linhas = [linha for linha in linhas if linha.strip()] or [""]
    alto, baixo = _faixa_por_quantidade(len(linhas))

    for tamanho in range(alto, baixo - 1, -1):
        sem_quebra = all(_largura_em(l) * tamanho <= AREA_LARGURA_PT for l in linhas)
        if sem_quebra and _cabe_na_altura(len(linhas), tamanho):
            return tamanho, 1.0

    for tamanho in range(alto, TAMANHO_MINIMO - 1, -1):
        if _cabe_na_altura(_total_linhas(linhas, tamanho), tamanho):
            return tamanho, 1.0

    escala = 1.0
    while escala > 0.25:
        escala = round(escala - 0.025, 3)
        efetivo = TAMANHO_MINIMO * escala
        if _cabe_na_altura(_total_linhas(linhas, efetivo), efetivo):
            break
    return TAMANHO_MINIMO, escala


def calcular_tamanho_fonte(linhas: list[str]) -> int:
    """Tamanho da letra do slide, em pontos (sem a redução automática)."""
    return calcular_formatacao(linhas)[0]


def layout_em_branco(apresentacao):
    """Layout "Em branco" (Blank). Os únicos marcadores dele (data, rodapé
    e número do slide) não são copiados para os slides, então cada slide
    fica sem nenhum marcador de posição."""
    for layout in apresentacao.slide_layouts:
        if layout.name == "Blank":
            return layout
    return apresentacao.slide_layouts[6]


# DIVIDIR CONTEÚDO
def dividir_blocos_automaticamente(texto):

    blocos_originais = re.split(
        r"\r?\n\s*\r?\n",
        texto.strip()
    )

    slides = []

    for bloco in blocos_originais:

        linhas = [
            linha.strip()
            for linha in bloco.splitlines()
            if linha.strip()
        ]

        # Máximo de 4 linhas por slide
        for i in range(0, len(linhas), 4):

            grupo = linhas[i:i + 4]

            slides.append(
                "\n".join(grupo)
            )

    return slides


def _pintar_fundo_preto(slide):
    preenchimento = slide.background.fill
    preenchimento.solid()
    preenchimento.fore_color.rgb = RGBColor(0, 0, 0)


# CRIAR SLIDE DE TEXTO
def criar_slide_texto(
    apresentacao,
    texto,
    caixa_alta=False
):

    slide = apresentacao.slides.add_slide(
        layout_em_branco(apresentacao)
    )

    # Fundo preto
    _pintar_fundo_preto(slide)


    # Caixa de texto (a única do slide)
    caixa = slide.shapes.add_textbox(
        Inches(CAIXA_ESQUERDA_POL),
        Inches(CAIXA_TOPO_POL),
        Inches(CAIXA_LARGURA_POL),
        Inches(CAIXA_ALTURA_POL)
    )

    quadro = caixa.text_frame

    quadro.clear()
    quadro.word_wrap = True

    # Margens internas zeradas
    quadro.margin_left = Inches(MARGEM_HORIZONTAL_POL)
    quadro.margin_right = Inches(MARGEM_HORIZONTAL_POL)
    quadro.margin_top = Inches(MARGEM_VERTICAL_POL)
    quadro.margin_bottom = Inches(MARGEM_VERTICAL_POL)

    # Centralizado na vertical
    quadro.vertical_anchor = MSO_ANCHOR.MIDDLE

    linhas = formatar_texto(texto, caixa_alta).split("\n")
    tamanho, escala = calcular_formatacao(linhas)

    # Cada verso é um parágrafo, centralizado na horizontal.
    for indice, linha in enumerate(linhas):

        paragrafo = quadro.paragraphs[0] if indice == 0 else quadro.add_paragraph()

        paragrafo.alignment = PP_ALIGN.CENTER

        run = paragrafo.add_run()
        run.text = linha

        run.font.name = FONTE_SLIDE

        run.font.size = Pt(tamanho)

        run.font.bold = True

        run.font.color.rgb = RGBColor(
            255,
            255,
            255
        )

    # "Reduzir o texto ao transbordar" ligado. Quando a estrofe não cabe
    # nem a 40 pt, a redução já vai calculada no arquivo (fontScale), para
    # o texto abrir dentro do slide sem precisar editar nada.
    quadro.auto_size = MSO_AUTO_SIZE.TEXT_TO_FIT_SHAPE
    if escala < 1:
        ajuste = quadro._txBody.bodyPr.find(qn("a:normAutofit"))
        ajuste.set("fontScale", str(int(round(escala * 100000))))


# CRIAR SLIDE PRETO
def criar_slide_preto(apresentacao):

    slide = apresentacao.slides.add_slide(
        layout_em_branco(apresentacao)
    )

    _pintar_fundo_preto(slide)


# GERAR APRESENTAÇÃO COMPLETA
def gerar_apresentacao_completa(
    momentos,
    adicionar_slide_preto,
    nome_arquivo
):

    apresentacao = Presentation()


    # Formato 4:3 (25,4 x 19,05 cm)
    apresentacao.slide_width = Inches(SLIDE_LARGURA_POL)

    apresentacao.slide_height = Inches(SLIDE_ALTURA_POL)


    # Percorre todos os momentos
    for momento in momentos:

        conteudo = momento.conteudo


        # Divide o conteúdo
        blocos = dividir_blocos_automaticamente(
            conteudo
        )


        # Cantos em CAIXA ALTA, respostas do povo em caixa normal
        caixa_alta = getattr(momento, "caixa_alta", None)
        if caixa_alta is None:
            caixa_alta = caixa_alta_padrao(getattr(momento, "momento", ""))


        # Cria os slides
        for bloco in blocos:

            criar_slide_texto(
                apresentacao,
                bloco,
                caixa_alta
            )


        # Slide preto separando um momento do outro
        if adicionar_slide_preto:

            criar_slide_preto(
                apresentacao
            )


    # Salva o arquivo
    apresentacao.save(
        nome_arquivo
    )
