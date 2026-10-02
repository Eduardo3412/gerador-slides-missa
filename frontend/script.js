const momentoPreview = document.getElementById("momento-preview");

const botaoRevisar = document.getElementById("revisar");

const campoNomeArquivo = document.getElementById("nome-arquivo");

const campoMomento = document.getElementById("momento");
const campoLetra = document.getElementById("letra");

const botaoAdicionar = document.getElementById("adicionar");
const botaoGerar = document.getElementById("gerar");

const previewTexto = document.getElementById("preview-texto");

const botaoAnterior = document.getElementById("anterior");
const botaoProximo = document.getElementById("proximo");

const contador = document.getElementById("contador");

const listaMomentos = document.getElementById("lista-momentos");

const campoSlidePreto = document.getElementById("slide-preto");

const botaoCancelarEdicao = document.getElementById("cancelar-edicao");

const barraMomentos = document.getElementById("barra-momentos");
const miniaturasSlides = document.getElementById("miniaturas-slides");

// Guarda todos os momentos adicionados à apresentação
let momentosAdicionados = [];

// Slides mostrados na pré-visualização
let slidesPreview = [];

// Slide atualmente exibido
let slideAtual = 0;

let momentoEmEdicao = null;

let modoRevisaoCompleta = false;

let informacoesSlidesPreview = [];

// DIVISÃO AUTOMÁTICA DOS SLIDES
function dividirBlocosAutomaticamente(texto) {
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

    // Máximo de 4 linhas por slide
    for (let i = 0; i < linhas.length; i += 4) {
      const grupo = linhas.slice(i, i + 4);

      slides.push(grupo.join("\n"));
    }
  });
  return slides;
}

// ATUALIZA A PRÉ-VISUALIZAÇÃO
function atualizarSlidesPreview() {
  modoRevisaoCompleta = false;

  informacoesSlidesPreview = [];

  const letra = campoLetra.value.trim();

  momentoPreview.textContent = campoMomento.value;

  if (!letra) {
    slidesPreview = [];
    slideAtual = 0;

    mostrarSlide();

    return;
  }

  slidesPreview = dividirBlocosAutomaticamente(letra);

  slideAtual = 0;

  mostrarSlide();
}

// MOSTRA O SLIDE ATUAL
function mostrarSlide() {
  botaoAnterior.disabled = slideAtual === 0 || slidesPreview.length === 0;
  botaoProximo.disabled = slideAtual >= slidesPreview.length - 1;
  atualizarMiniaturas();

  if (slidesPreview.length === 0) {
    previewTexto.textContent = "Digite o conteúdo para visualizar";

    contador.textContent = "0 / 0";
    barraMomentos.style.display = "none";
    momentoPreview.textContent = campoMomento.value;

    return;
  }

  previewTexto.textContent = slidesPreview[slideAtual];

  contador.textContent = `${slideAtual + 1} / ${slidesPreview.length}`;

  // REVISÃO COMPLETA
  if (modoRevisaoCompleta && informacoesSlidesPreview[slideAtual]) {
    const informacao = informacoesSlidesPreview[slideAtual];

    if (informacao.preto) {
      momentoPreview.textContent = `${informacao.momento} • Slide preto`;
    } else {
      momentoPreview.textContent = informacao.momento;
    }
  }
  atualizarBarraMomentos();
}

function atualizarMiniaturas() {
  const indiceComFoco = Array.from(miniaturasSlides.children).indexOf(
    document.activeElement,
  );
  miniaturasSlides.replaceChildren();
  if (slidesPreview.length === 0) {
    const mensagem = document.createElement("span");
    mensagem.className = "miniaturas-vazias";
    mensagem.textContent = "Seus slides aparecerão aqui";
    miniaturasSlides.appendChild(mensagem);
    return;
  }

  slidesPreview.forEach((texto, indice) => {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "miniatura";
    botao.classList.toggle("ativa", indice === slideAtual);
    botao.setAttribute(
      "aria-label",
      `Ir para slide ${indice + 1}${texto === "" ? " (slide preto)" : ""}`,
    );
    botao.setAttribute(
      "aria-current",
      indice === slideAtual ? "true" : "false",
    );
    const tela = document.createElement("span");
    tela.className = "miniatura-tela";
    tela.setAttribute("aria-hidden", "true");
    const conteudo = document.createElement("span");
    conteudo.className = "miniatura-texto";
    conteudo.textContent = texto;
    tela.appendChild(conteudo);
    const numero = document.createElement("span");
    numero.textContent = indice + 1;
    botao.append(tela, numero);
    botao.addEventListener("click", () => {
      slideAtual = indice;
      mostrarSlide();
    });
    miniaturasSlides.appendChild(botao);
  });

  if (indiceComFoco >= 0) {
    miniaturasSlides.children[indiceComFoco]?.focus({ preventScroll: true });
  }
  const ativa = miniaturasSlides.children[slideAtual];
  miniaturasSlides.scrollLeft =
    ativa.offsetLeft -
    miniaturasSlides.offsetLeft -
    (miniaturasSlides.clientWidth - ativa.offsetWidth) / 2;
}

// NAVEGAÇÃO DA PRÉ-VISUALIZAÇÃO
botaoAnterior.addEventListener("click", function () {
  if (slideAtual > 0) {
    slideAtual--;

    mostrarSlide();
  }
});

botaoProximo.addEventListener("click", function () {
  if (slideAtual < slidesPreview.length - 1) {
    slideAtual++;

    mostrarSlide();
  }
});

// ATUALIZA PREVIEW ENQUANTO DIGITA
campoLetra.addEventListener("input", atualizarSlidesPreview);
campoMomento.addEventListener("change", atualizarSlidesPreview);

// ADICIONAR MOMENTO À APRESENTAÇÃO
botaoAdicionar.addEventListener("click", adicionarMomento);

function adicionarMomento() {
  const momento = campoMomento.value;
  const conteudo = campoLetra.value.trim();

  if (!conteudo) {
    alert("Digite a letra ou as respostas antes de adicionar.");

    return;
  }

  const slides = dividirBlocosAutomaticamente(conteudo);

  // SE ESTIVER EDITANDO
  if (momentoEmEdicao !== null) {
    const indice = momentosAdicionados.findIndex(
      (item) => item.id === momentoEmEdicao,
    );

    if (indice !== -1) {
      momentosAdicionados[indice].momento = momento;

      momentosAdicionados[indice].conteudo = conteudo;

      momentosAdicionados[indice].slides = slides;
    }

    momentoEmEdicao = null;

    botaoAdicionar.textContent = "+ Adicionar à apresentação";

    botaoCancelarEdicao.style.display = "none";
  }

  // SE FOR UM NOVO MOMENTO
  else {
    const novoMomento = {
      id: Date.now(),
      momento: momento,
      conteudo: conteudo,
      slides: slides,
    };

    momentosAdicionados.push(novoMomento);
  }

  atualizarListaMomentos();

  // Limpa formulário
  campoLetra.value = "";

  slidesPreview = [];

  slideAtual = 0;

  mostrarSlide();
}

// MOSTRA OS MOMENTOS ADICIONADOS
function atualizarListaMomentos() {
  listaMomentos.innerHTML = "";

  // Nenhum momento
  if (momentosAdicionados.length === 0) {
    listaMomentos.innerHTML = `
            <div class="lista-vazia">
                Nenhum momento adicionado ainda.
            </div>
        `;

    return;
  }

  // Cria um item para cada momento
  momentosAdicionados.forEach((item, indice) => {
    const elemento = document.createElement("div");

    elemento.className = "item-momento";
    elemento.dataset.id = item.id;

    elemento.innerHTML = `

    <div class="linha-momento">
    <button type="button" class="alca-momento"
        aria-label="Reordenar momento ${indice + 1}. Arraste ou use as setas para cima e para baixo."
        title="Arraste para reordenar ou use as setas do teclado">⠿</button>
    <button type="button"
        class="cabecalho-momento"
        aria-expanded="false"
        aria-controls="conteudo-${item.id}"
        onclick="alternarMomento(${item.id})"
    >

        <span class="titulo-momento">

            <span class="numero-momento">
                ${String(indice + 1).padStart(2, "0")}
            </span>

            <strong>
                ${item.momento}
            </strong>

        </span>


        <span class="resumo-momento">

            <span>
                ${item.slides.length}
                ${item.slides.length === 1 ? "slide" : "slides"}
            </span>

            <span
                class="seta-momento"
                id="seta-${item.id}"
            >
                ›
            </span>

        </span>

    </button>
    </div>


    <div
        class="conteudo-momento"
        id="conteudo-${item.id}"
    >

        <div class="previa-conteudo">
            ${item.conteudo.replace(/\n/g, "<br>")}
        </div>


        <div class="acoes-momento">

            <button
              type="button"
              class="botao-visualizar"
              onclick="visualizarMomento(${item.id})"
            >
              Visualizar
            </button>

            <button
                type="button"
                class="botao-editar"
                onclick="editarMomento(${item.id})"
            >
                Editar
            </button>

            <button
                type="button"
                class="botao-excluir"
                onclick="excluirMomento(${item.id})"
            >
                Excluir
            </button>

        </div>

    </div>
`;

    listaMomentos.appendChild(elemento);
  });
}

function alternarMomento(id) {
  const conteudo = document.getElementById(`conteudo-${id}`);

  const seta = document.getElementById(`seta-${id}`);

  conteudo.classList.toggle("aberto");
  conteudo.previousElementSibling
    .querySelector(".cabecalho-momento")
    .setAttribute("aria-expanded", conteudo.classList.contains("aberto"));

  seta.classList.toggle("aberta");
}

// EXCLUIR MOMENTO

function excluirMomento(id) {
  const confirmar = confirm("Deseja realmente excluir este momento?");

  if (!confirmar) {
    return;
  }

  momentosAdicionados = momentosAdicionados.filter((item) => item.id !== id);

  atualizarListaMomentos();
}

// A ordem visual também é a ordem usada na revisão e no PowerPoint.
function confirmarOrdemMomentos() {
  const ordemAnterior = [...momentosAdicionados];
  const itens = [...listaMomentos.querySelectorAll(".item-momento")];
  momentosAdicionados = itens.map((elemento) =>
    ordemAnterior.find((item) => String(item.id) === elemento.dataset.id),
  );
  itens.forEach((elemento, indice) => {
    elemento.querySelector(".numero-momento").textContent = String(
      indice + 1,
    ).padStart(2, "0");
    elemento
      .querySelector(".alca-momento")
      .setAttribute(
        "aria-label",
        `Reordenar ${momentosAdicionados[indice].momento}, posição ${indice + 1}. Arraste ou use as setas para cima e para baixo.`,
      );
  });

  if (modoRevisaoCompleta && informacoesSlidesPreview.length) {
    const atual = informacoesSlidesPreview[slideAtual];
    const slides = informacoesSlidesPreview
      .map((info, indice) => {
        const momento = ordemAnterior[info.indiceMomento];
        return {
          texto: slidesPreview[indice],
          info,
          novoIndice: momentosAdicionados.indexOf(momento),
        };
      })
      .sort((a, b) => a.novoIndice - b.novoIndice);
    slidesPreview = slides.map((slide) => slide.texto);
    informacoesSlidesPreview = slides.map((slide) => {
      slide.info.indiceMomento = slide.novoIndice;
      return slide.info;
    });
    slideAtual = Math.max(0, informacoesSlidesPreview.indexOf(atual));
    mostrarSlide();
  }
  document.getElementById("status-ordem").textContent =
    "Ordem da apresentação atualizada.";
}

let arrasteMomento = null;

listaMomentos.addEventListener("pointerdown", (evento) => {
  const alca = evento.target.closest(".alca-momento");
  if (!alca || !evento.isPrimary || evento.button !== 0 || arrasteMomento)
    return;
  evento.preventDefault();
  alca.focus({ preventScroll: true });
  arrasteMomento = {
    pointerId: evento.pointerId,
    elemento: alca.closest(".item-momento"),
    ordem: [...listaMomentos.children],
    inicioY: evento.clientY,
    y: evento.clientY,
    fantasma: null,
    frame: null,
  };
  listaMomentos.setPointerCapture(evento.pointerId);
});

function posicionarMomentoArrastado() {
  const arraste = arrasteMomento;
  if (!arraste?.fantasma) return;
  arraste.fantasma.style.top = `${arraste.y - 24}px`;
  const outros = [...listaMomentos.querySelectorAll(".item-momento")].filter(
    (item) => item !== arraste.elemento,
  );
  const seguinte = outros.find((item) => {
    const caixa = item.getBoundingClientRect();
    return arraste.y < caixa.top + caixa.height / 2;
  });
  listaMomentos.insertBefore(arraste.elemento, seguinte || null);
}

function rolarDuranteArraste() {
  if (!arrasteMomento?.fantasma) return;
  const y = arrasteMomento.y;
  const deslocamento = y < 70 ? -12 : y > window.innerHeight - 70 ? 12 : 0;
  if (deslocamento) {
    window.scrollBy(0, deslocamento);
    posicionarMomentoArrastado();
  }
  arrasteMomento.frame = requestAnimationFrame(rolarDuranteArraste);
}

listaMomentos.addEventListener("pointermove", (evento) => {
  const arraste = arrasteMomento;
  if (!arraste || evento.pointerId !== arraste.pointerId) return;
  arraste.y = evento.clientY;
  if (!arraste.fantasma && Math.abs(arraste.y - arraste.inicioY) >= 6) {
    const caixa = arraste.elemento.getBoundingClientRect();
    const fantasma = document.createElement("div");
    fantasma.className = "momento-arrastado";
    fantasma.textContent = arraste.elemento
      .querySelector(".titulo-momento")
      .textContent.trim();
    fantasma.setAttribute("aria-hidden", "true");
    fantasma.style.left = `${caixa.left}px`;
    fantasma.style.width = `${caixa.width}px`;
    document.body.appendChild(fantasma);
    arraste.fantasma = fantasma;
    arraste.elemento.classList.add("em-arraste");
    document.body.classList.add("reordenando");
    rolarDuranteArraste();
  }
  posicionarMomentoArrastado();
});

function finalizarArrasteMomento(cancelado = false) {
  const arraste = arrasteMomento;
  if (!arraste) return;
  arrasteMomento = null;
  cancelAnimationFrame(arraste.frame);
  arraste.fantasma?.remove();
  arraste.elemento.classList.remove("em-arraste");
  document.body.classList.remove("reordenando");
  if (listaMomentos.hasPointerCapture(arraste.pointerId)) {
    listaMomentos.releasePointerCapture(arraste.pointerId);
  }
  if (cancelado) listaMomentos.append(...arraste.ordem);
  else if (arraste.fantasma) confirmarOrdemMomentos();
  arraste.elemento
    .querySelector(".alca-momento")
    .focus({ preventScroll: true });
}

listaMomentos.addEventListener("pointerup", (evento) => {
  if (evento.pointerId === arrasteMomento?.pointerId) finalizarArrasteMomento();
});
listaMomentos.addEventListener("pointercancel", () =>
  finalizarArrasteMomento(true),
);
listaMomentos.addEventListener("lostpointercapture", () =>
  finalizarArrasteMomento(true),
);
document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape") finalizarArrasteMomento(true);
});
listaMomentos.addEventListener("keydown", (evento) => {
  const alca = evento.target.closest(".alca-momento");
  if (!alca || arrasteMomento || !["ArrowUp", "ArrowDown"].includes(evento.key))
    return;
  evento.preventDefault();
  const item = alca.closest(".item-momento");
  const vizinho =
    evento.key === "ArrowUp"
      ? item.previousElementSibling
      : item.nextElementSibling;
  if (!vizinho) return;
  listaMomentos.insertBefore(
    item,
    evento.key === "ArrowUp" ? vizinho : vizinho.nextElementSibling,
  );
  confirmarOrdemMomentos();
  alca.focus({ preventScroll: true });
});

// EDITAR MOMENTO

function editarMomento(id) {
  const item = momentosAdicionados.find((item) => item.id === id);

  if (!item) {
    return;
  }

  momentoEmEdicao = id;

  campoMomento.value = item.momento;

  campoLetra.value = item.conteudo;

  botaoAdicionar.textContent = "Salvar alterações";

  botaoCancelarEdicao.style.display = "block";

  atualizarSlidesPreview();

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

// GERAR POWERPOINT

botaoGerar.addEventListener("click", gerarApresentacao);

async function gerarApresentacao() {
  const nomeArquivo = campoNomeArquivo.value.trim();

  if (!nomeArquivo) {
    alert("Informe o nome da apresentação.");
    return;
  }

  if (momentosAdicionados.length === 0) {
    alert("Adicione pelo menos um momento à apresentação.");
    return;
  }

  const dados = {
    nome_arquivo: nomeArquivo,
    slide_preto: campoSlidePreto.checked,

    momentos: momentosAdicionados.map((item) => {
      return {
        momento: item.momento,
        conteudo: item.conteudo,
      };
    }),
  };

  try {
    botaoGerar.disabled = true;

    botaoGerar.textContent = "Gerando apresentação...";

    const resposta = await fetch("http://127.0.0.1:8000/gerar-apresentacao", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(dados),
    });

    if (!resposta.ok) {
      throw new Error("Erro ao gerar apresentação.");
    }

    const arquivo = await resposta.blob();

    const url = window.URL.createObjectURL(arquivo);

    const link = document.createElement("a");

    link.href = url;

    let nomeDownload = nomeArquivo
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9\s_-]/g, "")
      .trim()
      .replace(/\s+/g, "_");

    link.download = `${nomeDownload}.pptx`;

    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (erro) {
    console.error(erro);
    alert("Não foi possível gerar a apresentação.");
  } finally {
    botaoGerar.disabled = false;
    botaoGerar.textContent = "Gerar PowerPoint Completo";
  }
}

botaoCancelarEdicao.addEventListener("click", cancelarEdicao);

function cancelarEdicao() {
  momentoEmEdicao = null;

  campoLetra.value = "";

  botaoAdicionar.textContent = "+ Adicionar à apresentação";
  botaoCancelarEdicao.style.display = "none";

  slidesPreview = [];

  slideAtual = 0;

  mostrarSlide();
}

function visualizarMomento(id) {
  modoRevisaoCompleta = false;

  informacoesSlidesPreview = [];

  const item = momentosAdicionados.find((item) => item.id === id);

  if (!item) {
    return;
  }

  slidesPreview = [...item.slides];

  slideAtual = 0;

  momentoPreview.textContent = item.momento;

  mostrarSlide();

  document.querySelector(".painel-preview").scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}

function revisarApresentacaoCompleta() {
  if (momentosAdicionados.length === 0) {
    alert("Adicione pelo menos um momento antes de revisar.");

    return;
  }

  slidesPreview = [];

  informacoesSlidesPreview = [];

  momentosAdicionados.forEach((item, indiceMomento) => {
    item.slides.forEach((slide) => {
      slidesPreview.push(slide);

      informacoesSlidesPreview.push({
        momento: item.momento,
        indiceMomento: indiceMomento,
        preto: false,
      });
    });

    // Adiciona o slide preto
    if (campoSlidePreto.checked) {
      slidesPreview.push("");

      informacoesSlidesPreview.push({
        momento: item.momento,
        indiceMomento: indiceMomento,
        preto: true,
      });
    }
  });

  modoRevisaoCompleta = true;

  slideAtual = 0;

  mostrarSlide();

  document.querySelector(".painel-preview").scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}

botaoRevisar.addEventListener("click", revisarApresentacaoCompleta);

function atualizarBarraMomentos() {
  if (!modoRevisaoCompleta || !informacoesSlidesPreview[slideAtual]) {
    barraMomentos.style.display = "none";
    return;
  }

  barraMomentos.style.display = "flex";
  barraMomentos.innerHTML = "";

  const indiceAtual = informacoesSlidesPreview[slideAtual].indiceMomento;

  momentosAdicionados.forEach((item, indice) => {
    const elemento = document.createElement("button");
    elemento.type = "button";

    elemento.classList.add("item-barra-momento");

    elemento.textContent = item.momento;

    elemento.addEventListener("click", () => {
      irParaMomento(indice);
    });

    if (indice === indiceAtual) {
      elemento.classList.add("ativo");
      setTimeout(() => {
        elemento.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }, 50);
    }
    barraMomentos.appendChild(elemento);
  });
}

function irParaMomento(indiceMomento) {
  // funciona se estiver em modo de revisão completa
  if (!modoRevisaoCompleta) {
    return;
  }

  // procura o primeiro slide do momento desejado
  const indiceSlide = informacoesSlidesPreview.findIndex(
    (info) => info.indiceMomento === indiceMomento && info.preto === false,
  );

  // se não encontrar nenhum slide
  if (indiceSlide === -1) {
    return;
  }

  // ir para o slide do momento
  slideAtual = indiceSlide;

  mostrarSlide();
}

mostrarSlide();
