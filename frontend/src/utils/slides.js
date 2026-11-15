// ======================================================
// REGRAS DOS SLIDES (divisão do texto e tamanho da letra)
// Mesma regra do backend (gerador_pptx.py), para a pré-visualização
// mostrar o que vai sair no PowerPoint. O teste
// backend/tests/test_gerador_pptx.py confere que os valores batem.
// ======================================================

export const MOMENTOS_PADRAO = [
  "Entrada",
  "Ato Penitencial",
  "Glória",
  "Salmo",
  "Aclamação ao Evangelho",
  "Preces",
  "Ofertório",
  "Oração Eucarística",
  "Santo",
  "Cordeiro de Deus",
  "Comunhão",
  "Final",
];

// Padrão dos slides: 4:3 (25,4 x 19,05 cm), caixa de texto a 1,27 cm do
// topo, 16,5 cm de altura e quase toda a largura, sem margens internas.
export const SLIDE_LARGURA_POL = 10.0;
export const SLIDE_ALTURA_POL = 7.5;
export const CAIXA_TOPO_POL = 0.5;
export const CAIXA_ALTURA_POL = 6.5;
export const CAIXA_ESQUERDA_POL = 0.25;
const CAIXA_LARGURA_POL = SLIDE_LARGURA_POL - 2 * CAIXA_ESQUERDA_POL;
export const FOLGA_LARGURA = 0.98;
const AREA_LARGURA_PT = CAIXA_LARGURA_POL * 72 * FOLGA_LARGURA;
const AREA_ALTURA_PT = CAIXA_ALTURA_POL * 72;

// Tamanho da letra entre 40 e 60 pt, conforme a quantidade de texto:
// até 2 versos de 60 a 48 pt; 3 versos ou mais de 44 a 40 pt.
export const TAMANHO_MAXIMO = 60;
export const TAMANHO_MINIMO = 40;
export const VERSOS_TRECHO_CURTO = 2;
const FAIXA_CURTA = [60, 48];
const FAIXA_LONGA = [44, 40];
export const ALTURA_LINHA = 1.2;

// Cantos em CAIXA ALTA; respostas do povo em caixa normal (padrão por
// momento, que pode ser trocado em cada momento).
const MOMENTOS_RESPOSTA = new Set(["Salmo", "Preces", "Oração Eucarística"]);

export function caixaAltaPadrao(momento) {
  return !MOMENTOS_RESPOSTA.has((momento || "").trim());
}

export function formatarTexto(texto, caixaAlta) {
  return caixaAlta ? texto.toLocaleUpperCase("pt-BR") : texto;
}

// DIVISÃO AUTOMÁTICA: linha vazia separa blocos; no máximo 4 linhas por slide.
export function dividirBlocosAutomaticamente(texto) {
  const blocos = texto
    .trim()
    .split(/\r?\n\s*\r?\n/)
    .map((bloco) => bloco.trim())
    .filter((bloco) => bloco !== "");

  const slides = [];

  blocos.forEach((bloco) => {
    const linhas = bloco
      .split(/\r?\n/)
      .map((linha) => linha.trim())
      .filter((linha) => linha !== "");

    for (let i = 0; i < linhas.length; i += 4) {
      slides.push(linhas.slice(i, i + 4).join("\n"));
    }
  });
  return slides;
}

// ---------------- Medida do texto (Arial Negrito) ----------------

let contextoMedida = null;

// Largura em "em" (1 em = tamanho da letra), em Arial Negrito.
function larguraEm(texto) {
  if (!contextoMedida) {
    contextoMedida = document.createElement("canvas").getContext("2d");
    contextoMedida.font = 'bold 1000px Arial, "Liberation Sans", sans-serif';
  }
  return contextoMedida.measureText(texto).width / 1000;
}

function linhasAposQuebra(linha, tamanho) {
  if (larguraEm(linha) * tamanho <= AREA_LARGURA_PT) return 1;

  let linhas = 1;
  let atual = "";
  for (const palavra of linha.split(" ")) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (larguraEm(tentativa) * tamanho <= AREA_LARGURA_PT) {
      atual = tentativa;
      continue;
    }
    if (atual) linhas += 1;
    linhas += Math.max(1, Math.ceil((larguraEm(palavra) * tamanho) / AREA_LARGURA_PT)) - 1;
    atual = palavra;
  }
  return linhas;
}

// Mesma regra de calcular_formatacao() no backend (gerador_pptx.py).
// Devolve o tamanho em pt e a escala da redução automática (1 = sem redução).
export function calcularFormatacao(texto) {
  const linhas = texto.split("\n").filter((linha) => linha.trim());
  if (linhas.length === 0) return { tamanho: TAMANHO_MAXIMO, escala: 1 };

  const [alto, baixo] = linhas.length <= VERSOS_TRECHO_CURTO ? FAIXA_CURTA : FAIXA_LONGA;
  const totalLinhas = (tamanho) => linhas.reduce((soma, l) => soma + linhasAposQuebra(l, tamanho), 0);
  const cabeNaAltura = (total, tamanho) => total * tamanho * ALTURA_LINHA <= AREA_ALTURA_PT;

  for (let tamanho = alto; tamanho >= baixo; tamanho--) {
    const semQuebra = linhas.every((l) => larguraEm(l) * tamanho <= AREA_LARGURA_PT);
    if (semQuebra && cabeNaAltura(linhas.length, tamanho)) return { tamanho, escala: 1 };
  }
  for (let tamanho = alto; tamanho >= TAMANHO_MINIMO; tamanho--) {
    if (cabeNaAltura(totalLinhas(tamanho), tamanho)) return { tamanho, escala: 1 };
  }

  let escala = 1;
  while (escala > 0.25) {
    escala = Math.round((escala - 0.025) * 1000) / 1000;
    const efetivo = TAMANHO_MINIMO * escala;
    if (cabeNaAltura(totalLinhas(efetivo), efetivo)) break;
  }
  return { tamanho: TAMANHO_MINIMO, escala };
}

// ---------------- Tamanho na tela ----------------

// Na pré-visualização a caixa de texto ocupa a área interna (padding) do
// slide; a unidade cqw é relativa à largura dessa área.
const SLIDE_LARGURA_UTIL_PT = CAIXA_LARGURA_POL * 72;

const porcentagem = (polegadas) => `${((polegadas / SLIDE_LARGURA_POL) * 100).toFixed(4)}%`;

// Variáveis CSS com as margens do slide (usadas por .preview-slide e
// .miniatura-tela). Aplicadas como style em um elemento ancestral.
export const MARGENS_SLIDE = {
  "--margem-slide-topo": porcentagem(CAIXA_TOPO_POL),
  "--margem-slide-lado": porcentagem(CAIXA_ESQUERDA_POL),
  "--margem-slide-base": porcentagem(SLIDE_ALTURA_POL - CAIXA_TOPO_POL - CAIXA_ALTURA_POL),
};

// Tamanho em pontos -> unidade proporcional ao slide na tela.
export function tamanhoProporcional(tamanhoPt) {
  return `${((tamanhoPt / SLIDE_LARGURA_UTIL_PT) * 100).toFixed(3)}cqw`;
}

export function tamanhoNaTela(texto) {
  const { tamanho, escala } = calcularFormatacao(texto);
  return tamanhoProporcional(tamanho * escala);
}
