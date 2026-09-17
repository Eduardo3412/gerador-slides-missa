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
    .split(/\n\s*\n/)
    .map((bloco) => bloco.trim())
    .filter((bloco) => bloco !== "");

  const slides = [];

  blocos.forEach((bloco) => {
    const linhas = bloco
      .split("\n")
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

  campoMomento.addEventListener("change", function () {
    momentoPreview.textContent = campoMomento.value;
  });

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
  if (slidesPreview.length === 0) {
    previewTexto.textContent = "Digite o conteúdo para visualizar";

    contador.textContent = "0 / 0";

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
}

previewTexto.textContent = slidesPreview[slideAtual];

contador.textContent = `${slideAtual + 1} / ${slidesPreview.length}`;

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

    elemento.innerHTML = `

    <div
        class="cabecalho-momento"
        onclick="alternarMomento(${item.id})"
    >

        <div class="titulo-momento">

            <span class="numero-momento">
                ${String(indice + 1).padStart(2, "0")}
            </span>

            <strong>
                ${item.momento}
            </strong>

        </div>


        <div class="resumo-momento">

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

        </div>

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
                onclick="moverMomento(${item.id}, -1)"
            >
                ↑ Subir
            </button>

            <button
                type="button"
                onclick="moverMomento(${item.id}, 1)"
            >
                ↓ Descer
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

function moverMomento(id, direcao) {
  const indiceAtual = momentosAdicionados.findIndex((item) => item.id === id);

  if (indiceAtual === -1) {
    return;
  }

  const novoIndice = indiceAtual + direcao;

  // Impede mover além dos limites
  if (novoIndice < 0 || novoIndice >= momentosAdicionados.length) {
    return;
  }

  // Guarda temporariamente o item
  const item = momentosAdicionados[indiceAtual];

  // Troca as posições
  momentosAdicionados[indiceAtual] = momentosAdicionados[novoIndice];

  momentosAdicionados[novoIndice] = item;

  // Atualiza a tela
  atualizarListaMomentos();
}

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

  momentosAdicionados.forEach((item) => {
    item.slides.forEach((slide) => {
      slidesPreview.push(slide);

      informacoesSlidesPreview.push({
        momento: item.momento,
        preto: false,
      });
    });

    // Adiciona o slide preto
    if (campoSlidePreto.checked) {
      slidesPreview.push("");

      informacoesSlidesPreview.push({
        momento: item.momento,
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
