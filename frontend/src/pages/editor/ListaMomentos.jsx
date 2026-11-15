import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { classes } from "../../utils/formatacao";

// Distância mínima (px) para um toque na alça virar arraste.
const LIMIAR_ARRASTE = 6;
// Faixa (px) perto das bordas da área de rolagem que rola a página.
const BORDA_ROLAGEM = 70;

function numero(indice) {
  return String(indice + 1).padStart(2, "0");
}

function moverItem(ids, id, destino) {
  const semItem = ids.filter((atual) => atual !== id);
  semItem.splice(destino, 0, id);
  return semItem;
}

function ItemMomento({ item, indice, aberto, emArraste, aoAlternar, aoVisualizar, aoEditar, aoExcluir, refItem }) {
  const idConteudo = `conteudo-${item.id}`;
  const linhas = item.conteudo.split("\n");

  return (
    <div className={classes("item-momento", emArraste && "em-arraste")} ref={refItem}>
      <div className="linha-momento">
        <button
          type="button"
          className="alca-momento"
          data-id={item.id}
          aria-label={`Reordenar ${item.momento}, posição ${indice + 1}. Arraste ou use as setas para cima e para baixo.`}
          title="Arraste para reordenar ou use as setas do teclado"
        >
          ⠿
        </button>
        <button
          type="button"
          className="cabecalho-momento"
          aria-expanded={aberto}
          aria-controls={idConteudo}
          onClick={aoAlternar}
        >
          <span className="titulo-momento">
            <span className="numero-momento">{numero(indice)}</span>
            <strong>{item.momento}</strong>
          </span>
          <span className="resumo-momento">
            <span className="etiqueta-caixa">{item.caixaAlta ? "CAIXA ALTA" : "Caixa normal"}</span>
            <span>
              {item.slides.length} {item.slides.length === 1 ? "slide" : "slides"}
            </span>
            <span className={classes("seta-momento", aberto && "aberta")}>›</span>
          </span>
        </button>
      </div>

      <div className={classes("conteudo-momento", aberto && "aberto")} id={idConteudo}>
        <div className="previa-conteudo">
          {linhas.map((linha, i) => (
            <Fragment key={i}>
              {i > 0 && <br />}
              {linha}
            </Fragment>
          ))}
        </div>

        <div className="acoes-momento">
          <button type="button" className="botao-visualizar" onClick={aoVisualizar}>
            Visualizar
          </button>
          <button type="button" className="botao-editar" onClick={aoEditar}>
            Editar
          </button>
          <button type="button" className="botao-excluir" onClick={aoExcluir}>
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Momentos da apresentação, com reordenação pela alça (arrastar com
 * mouse/toque ou setas ↑ ↓ do teclado).
 * Durante o arraste a ordem é só visual; aoReordenar(ids) é chamado ao soltar.
 */
export default function ListaMomentos({ momentos, aoReordenar, aoVisualizar, aoEditar, aoExcluir }) {
  const [abertos, setAbertos] = useState(() => new Set());
  // { id, ordem: ids, fantasma: { left, width, y, titulo } | null }
  const [arraste, setArraste] = useState(null);
  const [statusOrdem, setStatusOrdem] = useState("");

  const lista = useRef(null);
  const elementos = useRef(new Map());
  const arrasteAtual = useRef(null);
  const focarAlca = useRef(null);

  const porId = new Map(momentos.map((item) => [item.id, item]));
  const ordemIds = arraste?.ordem ?? momentos.map((item) => item.id);
  const itens = ordemIds.map((id) => porId.get(id)).filter(Boolean);

  // Depois de reordenar pelo teclado, devolve o foco à alça movida.
  useLayoutEffect(() => {
    if (focarAlca.current === null) return;
    lista.current?.querySelector(`.alca-momento[data-id="${focarAlca.current}"]`)?.focus({ preventScroll: true });
    focarAlca.current = null;
  });

  function alternar(id) {
    setAbertos((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function confirmarOrdem(ids) {
    aoReordenar(ids);
    setStatusOrdem("Ordem da apresentação atualizada.");
  }

  // ---------------- Arrastar com mouse/toque ----------------

  function areaRolagem() {
    return lista.current?.closest(".pagina") ?? document.scrollingElement;
  }

  // Coloca o item arrastado antes do primeiro item cujo meio está abaixo do ponteiro.
  function posicionar() {
    const atual = arrasteAtual.current;
    if (!atual?.ativo) return;
    const outros = atual.ordem.filter((id) => id !== atual.id);
    let destino = outros.findIndex((id) => {
      const caixa = elementos.current.get(id)?.getBoundingClientRect();
      return caixa && atual.y < caixa.top + caixa.height / 2;
    });
    if (destino === -1) destino = outros.length;
    const novaOrdem = moverItem(atual.ordem, atual.id, destino);
    atual.ordem = novaOrdem;
    setArraste((estado) => estado && { ...estado, ordem: novaOrdem, fantasma: { ...estado.fantasma, y: atual.y } });
  }

  function rolarDuranteArraste() {
    const atual = arrasteAtual.current;
    if (!atual?.ativo) return;
    const area = areaRolagem();
    const caixa = area.getBoundingClientRect();
    let deslocamento = 0;
    if (atual.y < caixa.top + BORDA_ROLAGEM) deslocamento = -12;
    else if (atual.y > caixa.bottom - BORDA_ROLAGEM) deslocamento = 12;
    if (deslocamento) {
      area.scrollBy(0, deslocamento);
      posicionar();
    }
    atual.frame = requestAnimationFrame(rolarDuranteArraste);
  }

  function aoPressionar(evento) {
    const alca = evento.target.closest(".alca-momento");
    if (!alca || !evento.isPrimary || evento.button !== 0 || arrasteAtual.current) return;
    evento.preventDefault();
    alca.focus({ preventScroll: true });
    const id = Number(alca.dataset.id);
    const ordem = momentos.map((item) => item.id);
    arrasteAtual.current = {
      pointerId: evento.pointerId,
      id,
      ordemOriginal: ordem,
      ordem,
      inicioY: evento.clientY,
      y: evento.clientY,
      ativo: false,
      frame: null,
    };
    lista.current.setPointerCapture(evento.pointerId);
  }

  function aoMover(evento) {
    const atual = arrasteAtual.current;
    if (!atual || evento.pointerId !== atual.pointerId) return;
    atual.y = evento.clientY;

    if (!atual.ativo) {
      if (Math.abs(atual.y - atual.inicioY) < LIMIAR_ARRASTE) return;
      atual.ativo = true;
      const caixa = elementos.current.get(atual.id).getBoundingClientRect();
      const indice = atual.ordem.indexOf(atual.id);
      setArraste({
        id: atual.id,
        ordem: atual.ordem,
        fantasma: {
          left: caixa.left,
          width: caixa.width,
          y: atual.y,
          titulo: `${numero(indice)} ${porId.get(atual.id).momento}`,
        },
      });
      document.body.classList.add("reordenando");
      rolarDuranteArraste();
    }
    posicionar();
  }

  function finalizarArraste(cancelado) {
    const atual = arrasteAtual.current;
    if (!atual) return;
    arrasteAtual.current = null;
    cancelAnimationFrame(atual.frame);
    document.body.classList.remove("reordenando");
    if (lista.current?.hasPointerCapture(atual.pointerId)) {
      lista.current.releasePointerCapture(atual.pointerId);
    }
    setArraste(null);

    const mudou = atual.ordem.some((id, i) => id !== atual.ordemOriginal[i]);
    if (!cancelado && atual.ativo && mudou) confirmarOrdem(atual.ordem);
    focarAlca.current = atual.id;
  }

  // Esc cancela o arraste; limpeza se a lista sair da tela no meio dele.
  const finalizarArrasteAtual = useRef(finalizarArraste);
  finalizarArrasteAtual.current = finalizarArraste;

  useEffect(() => {
    const aoTeclar = (evento) => {
      if (evento.key === "Escape") finalizarArrasteAtual.current(true);
    };
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      if (arrasteAtual.current) {
        cancelAnimationFrame(arrasteAtual.current.frame);
        arrasteAtual.current = null;
        document.body.classList.remove("reordenando");
      }
    };
  }, []);

  // ---------------- Teclado ----------------

  function aoTeclar(evento) {
    const alca = evento.target.closest(".alca-momento");
    if (!alca || arrasteAtual.current || !["ArrowUp", "ArrowDown"].includes(evento.key)) return;
    evento.preventDefault();
    const id = Number(alca.dataset.id);
    const ids = momentos.map((item) => item.id);
    const indice = ids.indexOf(id);
    const destino = evento.key === "ArrowUp" ? indice - 1 : indice + 1;
    if (destino < 0 || destino >= ids.length) return;
    focarAlca.current = id;
    confirmarOrdem(moverItem(ids, id, destino));
  }

  if (momentos.length === 0) {
    return (
      <div id="lista-momentos">
        <div className="lista-vazia">Nenhum momento adicionado ainda.</div>
      </div>
    );
  }

  return (
    <>
      <div
        id="lista-momentos"
        ref={lista}
        onPointerDown={aoPressionar}
        onPointerMove={aoMover}
        onPointerUp={(evento) => {
          if (evento.pointerId === arrasteAtual.current?.pointerId) finalizarArraste(false);
        }}
        onPointerCancel={() => finalizarArraste(true)}
        onLostPointerCapture={() => finalizarArraste(true)}
        onKeyDown={aoTeclar}
      >
        {itens.map((item, indice) => (
          <ItemMomento
            key={item.id}
            item={item}
            indice={indice}
            aberto={abertos.has(item.id)}
            emArraste={arraste?.id === item.id}
            refItem={(elemento) => {
              if (elemento) elementos.current.set(item.id, elemento);
              else elementos.current.delete(item.id);
            }}
            aoAlternar={() => alternar(item.id)}
            aoVisualizar={() => aoVisualizar(item.id)}
            aoEditar={() => aoEditar(item.id)}
            aoExcluir={() => aoExcluir(item.id)}
          />
        ))}
      </div>
      <p className="somente-leitor" role="status">
        {statusOrdem}
      </p>

      {arraste?.fantasma &&
        createPortal(
          <div
            className="momento-arrastado"
            aria-hidden="true"
            style={{
              left: arraste.fantasma.left,
              width: arraste.fantasma.width,
              top: arraste.fantasma.y - 24,
            }}
          >
            {arraste.fantasma.titulo}
          </div>,
          document.body,
        )}
    </>
  );
}
