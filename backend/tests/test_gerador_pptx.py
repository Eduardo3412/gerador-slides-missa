"""Cada teste confere um item do padrão dos slides."""

import io
import os
import re
from types import SimpleNamespace

import pytest
from pptx import Presentation
from pptx.enum.text import MSO_ANCHOR, MSO_AUTO_SIZE, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Emu

import gerador_pptx
from gerador_pptx import (
    ALTURA_LINHA,
    AREA_ALTURA_PT,
    AREA_LARGURA_PT,
    _largura_em,
    _linhas_apos_quebra,
    caixa_alta_padrao,
    calcular_formatacao,
    dividir_blocos_automaticamente,
    gerar_apresentacao_completa,
)

CM_POR_POL = 2.54


def gerar(momentos, slide_preto=False):
    buffer = io.BytesIO()
    itens = [
        SimpleNamespace(momento=m[0], conteudo=m[1], caixa_alta=m[2] if len(m) > 2 else None)
        for m in momentos
    ]
    gerar_apresentacao_completa(itens, slide_preto, buffer)
    return Presentation(io.BytesIO(buffer.getvalue()))


def cm(emu):
    return round(Emu(emu).inches * CM_POR_POL, 2)


def runs(slide):
    return [r for p in slide.shapes[0].text_frame.paragraphs for r in p.runs]


ESTROFE = (
    "Vem, Senhor Jesus, vem nos transformar\n"
    "Vem morar em nosso coração\n"
    "Tu és nossa esperança e salvação\n"
    "Vem, Senhor, vem nos renovar"
)


def test_tamanho_4_por_3():
    apresentacao = gerar([("Entrada", "Linha")])

    assert cm(apresentacao.slide_width) == 25.4
    assert cm(apresentacao.slide_height) == 19.05


def test_layout_em_branco_sem_marcadores():
    apresentacao = gerar([("Entrada", "Linha"), ("Final", "Fim")], slide_preto=True)

    for slide in apresentacao.slides:
        assert slide.slide_layout.name == "Blank"
        assert len(slide.placeholders) == 0


def test_fundo_preto_em_todos_os_slides():
    apresentacao = gerar([("Entrada", "Linha"), ("Final", "Fim")], slide_preto=True)

    for slide in apresentacao.slides:
        assert str(slide.background.fill.fore_color.rgb) == "000000"


def test_uma_caixa_de_texto_centralizada_sem_margens_internas():
    slide = gerar([("Entrada", "Linha 1\nLinha 2")]).slides[0]

    assert len(slide.shapes) == 1
    quadro = slide.shapes[0].text_frame
    assert (quadro.margin_left, quadro.margin_right, quadro.margin_top, quadro.margin_bottom) == (0, 0, 0, 0)
    assert quadro.vertical_anchor == MSO_ANCHOR.MIDDLE
    assert all(p.alignment == PP_ALIGN.CENTER for p in quadro.paragraphs)


def test_posicao_da_caixa():
    apresentacao = gerar([("Entrada", "Linha")])
    caixa = apresentacao.slides[0].shapes[0]

    assert cm(caixa.top) == 1.27                       # ~1,27 cm do topo
    assert 16.4 <= cm(caixa.height) <= 16.6            # ~16,5 cm de altura
    assert cm(caixa.width) / cm(apresentacao.slide_width) >= 0.94  # quase toda a largura
    assert cm(caixa.left) == cm(apresentacao.slide_width - caixa.left - caixa.width)


def test_fonte_arial_negrito_branca():
    slide = gerar([("Entrada", "Linha 1\nLinha 2")]).slides[0]

    for run in runs(slide):
        assert run.font.name == "Arial"
        assert run.font.bold is True
        assert str(run.font.color.rgb) == "FFFFFF"


def test_cada_verso_e_um_paragrafo():
    slide = gerar([("Entrada", "Primeiro verso\nSegundo verso\nTerceiro verso")]).slides[0]
    paragrafos = slide.shapes[0].text_frame.paragraphs

    assert [p.text for p in paragrafos] == ["PRIMEIRO VERSO", "SEGUNDO VERSO", "TERCEIRO VERSO"]


def test_reduzir_texto_ao_transbordar_ligado():
    slide = gerar([("Entrada", "Linha")]).slides[0]

    assert slide.shapes[0].text_frame.auto_size == MSO_AUTO_SIZE.TEXT_TO_FIT_SHAPE


def test_tamanho_entre_40_e_60_conforme_quantidade_de_texto():
    curto = gerar([("Santo", "Santo, Santo, Santo\nSenhor Deus do universo")]).slides[0]
    longo = gerar([("Entrada", ESTROFE)]).slides[0]

    (tamanho_curto,) = {r.font.size.pt for r in runs(curto)}
    (tamanho_longo,) = {r.font.size.pt for r in runs(longo)}

    assert 48 <= tamanho_curto <= 60   # trecho curto (1-2 versos)
    assert 40 <= tamanho_longo <= 44   # estrofe longa


@pytest.mark.parametrize(
    "texto",
    [
        "Amém",
        "Enviai o vosso Espírito Santo!",
        ESTROFE.upper(),
        "Senhor, tende piedade de nós, pois somos pecadores e precisamos do teu perdão\n" * 3
        + "Amém",
        "PALAVRAEXTREMAMENTELONGASEMESPACOSNENHUMPARAQUEBRARNATURALMENTENOSLIDE",
    ],
)
def test_texto_nunca_sai_do_slide(texto):
    linhas = texto.strip().split("\n")
    tamanho, escala = calcular_formatacao(linhas)
    efetivo = tamanho * escala
    total = sum(_linhas_apos_quebra(l, efetivo) for l in linhas)

    assert 40 <= tamanho <= 60
    assert total * efetivo * ALTURA_LINHA <= AREA_ALTURA_PT


def test_estrofe_que_nao_cabe_sai_com_reducao_aplicada():
    enorme = "\n".join(["Glória a Deus nas alturas e paz na terra aos homens por Ele amados"] * 4).upper()
    slide = gerar([("Glória", enorme, True)]).slides[0]

    assert {r.font.size.pt for r in runs(slide)} == {40.0}
    ajuste = slide.shapes[0].text_frame._txBody.bodyPr.find(qn("a:normAutofit"))
    assert ajuste is not None
    assert 0 < int(ajuste.get("fontScale")) < 100000


def test_letras_dos_cantos_em_caixa_alta_e_respostas_em_caixa_normal():
    apresentacao = gerar(
        [
            ("Entrada", "Vem, Senhor Jesus"),
            ("Salmo", "Enviai o vosso Espírito Santo!"),
            ("Comunhão", "Eu sou o pão da vida, ação"),
        ]
    )
    textos = [s.shapes[0].text_frame.text for s in apresentacao.slides]

    assert textos == ["VEM, SENHOR JESUS", "Enviai o vosso Espírito Santo!", "EU SOU O PÃO DA VIDA, AÇÃO"]


def test_caixa_alta_pode_ser_trocada_por_momento():
    apresentacao = gerar([("Salmo", "Salmo cantado", True), ("Entrada", "Texto recitado", False)])
    textos = [s.shapes[0].text_frame.text for s in apresentacao.slides]

    assert textos == ["SALMO CANTADO", "Texto recitado"]


def test_padrao_de_caixa_alta_por_momento():
    assert caixa_alta_padrao("Entrada") is True
    assert caixa_alta_padrao("Comunhão") is True
    assert caixa_alta_padrao("Salmo") is False
    assert caixa_alta_padrao("Preces") is False
    assert caixa_alta_padrao("Oração Eucarística") is False


def test_slide_preto_vazio_entre_um_canto_e_outro():
    apresentacao = gerar([("Entrada", "A"), ("Glória", "B")], slide_preto=True)
    slides = list(apresentacao.slides)

    assert [len(s.shapes) for s in slides] == [1, 0, 1, 0]


def test_divisao_em_ate_quatro_linhas_preservada():
    assert dividir_blocos_automaticamente("L1\nL2\nL3\nL4\nL5\n\nB1") == ["L1\nL2\nL3\nL4", "L5", "B1"]


def test_estimativa_sem_fonte_instalada_nunca_e_menor_que_a_real(monkeypatch):
    if gerador_pptx._fonte_para_medir() is None:
        pytest.skip("Arial não instalada: não há medida real para comparar")

    textos = ["Vem morar em nosso coração", "GLÓRIA A DEUS", "Santo, Santo, Santo 123"]
    reais = [_largura_em(t) for t in textos]

    monkeypatch.setattr(gerador_pptx, "_fonte_para_medir", lambda: None)
    estimadas = [_largura_em(t) for t in textos]

    assert all(e >= r for e, r in zip(estimadas, reais))


def test_previsualizacao_do_site_usa_os_mesmos_valores():
    """O frontend repete a regra para a prévia; os valores precisam bater."""
    caminho = os.path.join(
        os.path.dirname(__file__), "..", "..", "frontend", "src", "utils", "slides.js"
    )
    script = open(caminho, encoding="utf-8").read()

    def valor(nome):
        return float(re.search(rf"const {nome} = ([\d.]+)", script).group(1))

    for nome in (
        "SLIDE_LARGURA_POL", "SLIDE_ALTURA_POL", "CAIXA_TOPO_POL", "CAIXA_ALTURA_POL",
        "CAIXA_ESQUERDA_POL", "TAMANHO_MAXIMO", "TAMANHO_MINIMO", "VERSOS_TRECHO_CURTO",
        "ALTURA_LINHA", "FOLGA_LARGURA",
    ):
        assert valor(nome) == getattr(gerador_pptx, nome), nome

    assert re.search(r"FAIXA_CURTA = \[60, 48\]", script)
    assert re.search(r"FAIXA_LONGA = \[44, 40\]", script)
    for momento in gerador_pptx.MOMENTOS_RESPOSTA:
        assert f'"{momento}"' in script, momento
