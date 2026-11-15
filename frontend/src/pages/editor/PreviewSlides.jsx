import { useEffect, useMemo, useRef } from "react";
import { classes } from "../../utils/formatacao";
import { calcularFormatacao, tamanhoNaTela, tamanhoProporcional } from "../../utils/slides";

/**
 * Pré-visualização dos slides (slide grande, miniaturas e navegação).
 * - slides: textos já formatados ("" = slide preto).
 * - rotulo: texto ao lado do título (momento exibido).
 * - barra: na revisão completa, { momentos: [nomes], indiceAtual } para a
 *   barra de atalhos dos momentos; null fora da revisão.
 */
export default function PreviewSlides({ slides, indice, aoSelecionar, rotulo, barra, aoIrParaMomento, refPainel }) {
  const miniaturas = useRef(null);
  const botoesBarra = useRef([]);

  const tamanhosMiniaturas = useMemo(() => slides.map(tamanhoNaTela), [slides]);

  // Mantém a miniatura ativa centralizada.
  useEffect(() => {
    const lista = miniaturas.current;
    const ativa = lista?.children[indice];
    if (!ativa || slides.length === 0) return;
    lista.scrollLeft = ativa.offsetLeft - lista.offsetLeft - (lista.clientWidth - ativa.offsetWidth) / 2;
  }, [indice, slides]);

  const indiceMomentoAtual = barra?.indiceAtual;
  useEffect(() => {
    if (indiceMomentoAtual === undefined) return;
    botoesBarra.current[indiceMomentoAtual]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [indiceMomentoAtual]);

  let textoSlide = "Digite o conteúdo para visualizar";
  let tamanhoSlide = tamanhoProporcional(40);
  let contador = "0 / 0";

  if (slides.length > 0) {
    const texto = slides[indice];
    const { tamanho, escala } = calcularFormatacao(texto);
    textoSlide = texto;
    tamanhoSlide = tamanhoProporcional(tamanho * escala);
    contador =
      `${indice + 1} / ${slides.length}` +
      (texto
        ? ` · Arial ${tamanho} pt` + (escala < 1 ? ` (reduzido a ${Math.round(escala * 100)}%)` : "")
        : " · slide preto");
  }

  return (
    <div className="painel-preview" ref={refPainel}>
      <div className="cabecalho-preview">
        <h2>Pré-visualização</h2>
        <span id="momento-preview">{rotulo}</span>
      </div>

      {barra && (
        <div className="barra-momentos">
          {barra.momentos.map((nome, i) => (
            <button
              key={i}
              ref={(elemento) => {
                botoesBarra.current[i] = elemento;
              }}
              type="button"
              className={classes("item-barra-momento", i === barra.indiceAtual && "ativo")}
              onClick={() => aoIrParaMomento(i)}
            >
              {nome}
            </button>
          ))}
        </div>
      )}

      <div className="preview-slide">
        <p id="preview-texto" style={{ fontSize: tamanhoSlide }}>
          {textoSlide}
        </p>
      </div>

      <div className="controles-preview">
        <button
          className="botao-preview"
          type="button"
          aria-label="Slide anterior"
          disabled={indice === 0 || slides.length === 0}
          onClick={() => aoSelecionar(indice - 1)}
        >
          ‹
        </button>
        <div className="miniaturas-slides" ref={miniaturas} aria-label="Slides da pré-visualização">
          {slides.length === 0 ? (
            <span className="miniaturas-vazias">Seus slides aparecerão aqui</span>
          ) : (
            slides.map((texto, i) => (
              <button
                key={i}
                type="button"
                className={classes("miniatura", i === indice && "ativa")}
                aria-label={`Ir para slide ${i + 1}${texto === "" ? " (slide preto)" : ""}`}
                aria-current={i === indice ? "true" : "false"}
                onClick={() => aoSelecionar(i)}
              >
                <span className="miniatura-tela" aria-hidden="true">
                  <span className="miniatura-texto" style={{ fontSize: tamanhosMiniaturas[i] }}>
                    {texto}
                  </span>
                </span>
                <span>{i + 1}</span>
              </button>
            ))
          )}
        </div>
        <button
          className="botao-preview"
          type="button"
          aria-label="Próximo slide"
          disabled={indice >= slides.length - 1}
          onClick={() => aoSelecionar(indice + 1)}
        >
          ›
        </button>
      </div>
      <span id="contador" aria-live="polite">
        {contador}
      </span>
    </div>
  );
}
