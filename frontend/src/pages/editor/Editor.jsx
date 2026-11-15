import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBlocker, useLocation, useNavigate, useParams } from "react-router";
import { apiFetch } from "../../api/cliente";
import Icone from "../../components/Icone";
import Pagina from "../../components/Pagina";
import { useAviso } from "../../contexts/AvisoContext";
import { useRecentes } from "../../contexts/RecentesContext";
import { classes, formatarDataHora, nomeArquivoPptx } from "../../utils/formatacao";
import {
  MARGENS_SLIDE,
  MOMENTOS_PADRAO,
  caixaAltaPadrao,
  dividirBlocosAutomaticamente,
  formatarTexto,
} from "../../utils/slides";
import ListaMomentos from "./ListaMomentos";
import PreviewSlides from "./PreviewSlides";

const TEXTO_ADICIONAR = "+ Adicionar à apresentação";

// Todos os slides da apresentação, na ordem final (revisão completa).
function construirRevisao(momentos, slidePreto) {
  const slides = [];
  const infos = [];
  momentos.forEach((item, indiceMomento) => {
    item.slides.forEach((slide, parte) => {
      slides.push(formatarTexto(slide, item.caixaAlta));
      infos.push({ momento: item.momento, momentoId: item.id, indiceMomento, parte, preto: false });
    });
    if (slidePreto) {
      slides.push("");
      infos.push({ momento: item.momento, momentoId: item.id, indiceMomento, parte: -1, preto: true });
    }
  });
  return { slides, infos };
}

function dadosParaApi(momentos) {
  return momentos.map((item) => ({
    momento: item.momento,
    conteudo: item.conteudo,
    caixa_alta: item.caixaAlta,
  }));
}

export default function Editor() {
  const mostrarAviso = useAviso();
  const { atualizarRecentes } = useRecentes();
  const navigate = useNavigate();
  const location = useLocation();
  const { id: idRota } = useParams();
  const tokenNova = location.state?.nova;

  // ---------------- Estado da apresentação ----------------
  const [nome, setNome] = useState("");
  const [slidePreto, setSlidePreto] = useState(true);
  // { id (local, só no navegador), momento, conteudo, caixaAlta, slides }
  const [momentos, setMomentos] = useState([]);

  // ---------------- Formulário do momento ----------------
  const [momentoSelecionado, setMomentoSelecionado] = useState(MOMENTOS_PADRAO[0]);
  const [letra, setLetra] = useState("");
  const [caixaAlta, setCaixaAlta] = useState(true);
  const [emEdicao, setEmEdicao] = useState(null);

  // ---------------- Pré-visualização ----------------
  // modo: "atual" (texto digitado), "momento" (um momento salvo) ou "revisao"
  const [preview, setPreview] = useState({ modo: "atual" });
  const [slideAtual, setSlideAtual] = useState(0);

  // ---------------- Salvamento ----------------
  const [apresentacaoId, setApresentacaoId] = useState(null);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null);
  const [pendentes, setPendentes] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [gerando, setGerando] = useState(false);

  // Refs lidas fora do ciclo de render (bloqueio de navegação, efeitos).
  const pendentesRef = useRef(false);
  const apresentacaoIdRef = useRef(null);
  const ultimoIdLocal = useRef(0);
  const requisicaoAtual = useRef(0);

  const refRolagem = useRef(null);
  const refPainelPreview = useRef(null);
  const refNome = useRef(null);
  const refLetra = useRef(null);

  const gerarIdLocal = () => {
    ultimoIdLocal.current += 1;
    return ultimoIdLocal.current;
  };

  function definirPendentes(valor) {
    pendentesRef.current = valor;
    setPendentes(valor);
  }

  const marcarAlterado = () => definirPendentes(true);

  function mostrarNaPreview(novoPreview) {
    setPreview(novoPreview);
    setSlideAtual(0);
  }

  // ---------------- Slides exibidos na pré-visualização ----------------

  const exibicao = useMemo(() => {
    if (preview.modo === "revisao") {
      return { ...construirRevisao(momentos, slidePreto), rotulo: null };
    }
    if (preview.modo === "momento") {
      const item = momentos.find((m) => m.id === preview.id);
      if (item) {
        return {
          slides: item.slides.map((slide) => formatarTexto(slide, item.caixaAlta)),
          infos: null,
          rotulo: item.momento,
        };
      }
    }
    const texto = letra.trim();
    return {
      slides: texto ? dividirBlocosAutomaticamente(texto).map((slide) => formatarTexto(slide, caixaAlta)) : [],
      infos: null,
      rotulo: momentoSelecionado,
    };
  }, [preview, momentos, slidePreto, letra, caixaAlta, momentoSelecionado]);

  const indiceSlide = Math.min(slideAtual, Math.max(0, exibicao.slides.length - 1));
  const infoAtual = exibicao.infos?.[indiceSlide];

  let rotuloPreview = exibicao.rotulo ?? momentoSelecionado;
  if (infoAtual) rotuloPreview = infoAtual.preto ? `${infoAtual.momento} • Slide preto` : infoAtual.momento;

  const barra = infoAtual
    ? { momentos: momentos.map((item) => item.momento), indiceAtual: infoAtual.indiceMomento }
    : null;

  function irParaMomento(indiceMomento) {
    const indice = exibicao.infos?.findIndex((info) => info.indiceMomento === indiceMomento && !info.preto) ?? -1;
    if (indice !== -1) setSlideAtual(indice);
  }

  function rolarAtePreview() {
    refPainelPreview.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // ---------------- Formulário do momento ----------------

  function aoMudarLetra(evento) {
    setLetra(evento.target.value);
    mostrarNaPreview({ modo: "atual" });
  }

  function aoMudarMomento(evento) {
    setMomentoSelecionado(evento.target.value);
    setCaixaAlta(caixaAltaPadrao(evento.target.value));
    mostrarNaPreview({ modo: "atual" });
  }

  function aoMudarCaixaAlta(evento) {
    setCaixaAlta(evento.target.checked);
    mostrarNaPreview({ modo: "atual" });
  }

  function limparFormulario() {
    setEmEdicao(null);
    setLetra("");
    mostrarNaPreview({ modo: "atual" });
  }

  function adicionarMomento() {
    const conteudo = letra.trim();
    if (!conteudo) {
      mostrarAviso("Digite a letra ou as respostas antes de adicionar.", "erro");
      refLetra.current?.focus();
      return;
    }

    const dados = {
      momento: momentoSelecionado,
      conteudo,
      caixaAlta,
      slides: dividirBlocosAutomaticamente(conteudo),
    };

    if (emEdicao !== null) {
      setMomentos((atual) => atual.map((item) => (item.id === emEdicao ? { ...item, ...dados } : item)));
    } else {
      setMomentos((atual) => [...atual, { id: gerarIdLocal(), ...dados }]);
    }

    marcarAlterado();
    limparFormulario();
  }

  function editarMomento(id) {
    const item = momentos.find((m) => m.id === id);
    if (!item) return;

    setEmEdicao(id);
    setMomentoSelecionado(item.momento);
    setCaixaAlta(item.caixaAlta);
    setLetra(item.conteudo);
    mostrarNaPreview({ modo: "atual" });

    refRolagem.current?.scrollTo({ top: 0, behavior: "smooth" });
    refLetra.current?.focus({ preventScroll: true });
  }

  function excluirMomento(id) {
    if (!window.confirm("Deseja realmente excluir este momento?")) return;
    setMomentos((atual) => atual.filter((item) => item.id !== id));
    if (emEdicao === id) limparFormulario();
    marcarAlterado();
  }

  function visualizarMomento(id) {
    mostrarNaPreview({ modo: "momento", id });
    rolarAtePreview();
  }

  function revisarApresentacao() {
    if (momentos.length === 0) {
      mostrarAviso("Adicione pelo menos um momento antes de revisar.", "erro");
      return;
    }
    mostrarNaPreview({ modo: "revisao" });
    rolarAtePreview();
  }

  // A ordem da lista também é a ordem da revisão e do PowerPoint.
  function reordenarMomentos(ids) {
    const porId = new Map(momentos.map((item) => [item.id, item]));
    const novaOrdem = ids.map((id) => porId.get(id)).filter(Boolean);
    setMomentos(novaOrdem);
    marcarAlterado();

    // Na revisão, continua mostrando o mesmo slide na nova posição.
    if (preview.modo === "revisao" && infoAtual) {
      const { infos } = construirRevisao(novaOrdem, slidePreto);
      const novoIndice = infos.findIndex(
        (info) => info.momentoId === infoAtual.momentoId && info.parte === infoAtual.parte,
      );
      setSlideAtual(Math.max(0, novoIndice));
    }
  }

  // ---------------- Carregar / nova apresentação ----------------

  const preencherEditor = useCallback((apresentacao) => {
    setNome(apresentacao.nome);
    setSlidePreto(apresentacao.slide_preto);
    setMomentos(
      [...apresentacao.momentos]
        .sort((a, b) => a.ordem - b.ordem)
        .map((item) => ({
          id: gerarIdLocal(),
          momento: item.momento,
          conteudo: item.conteudo,
          caixaAlta: item.caixa_alta,
          slides: dividirBlocosAutomaticamente(item.conteudo),
        })),
    );
    setEmEdicao(null);
    setLetra("");
    setPreview({ modo: "atual" });
    setSlideAtual(0);
  }, []);

  const marcarSalvo = useCallback((apresentacao) => {
    apresentacaoIdRef.current = apresentacao.id;
    setApresentacaoId(apresentacao.id);
    setUltimaAtualizacao(apresentacao.atualizado_em);
    definirPendentes(false);
  }, []);

  const limparEditor = useCallback(() => {
    requisicaoAtual.current += 1; // ignora carregamentos em andamento
    apresentacaoIdRef.current = null;
    setApresentacaoId(null);
    setUltimaAtualizacao(null);
    definirPendentes(false);
    setCarregando(false);
    setNome("");
    setSlidePreto(true);
    setMomentos([]);
    setEmEdicao(null);
    setLetra("");
    setPreview({ modo: "atual" });
    setSlideAtual(0);
  }, []);

  // Começa uma apresentação nova e deixa a URL em /editor.
  const novaApresentacao = useCallback(() => {
    limparEditor();
    navigate("/editor", { replace: true });
    refNome.current?.focus();
  }, [limparEditor, navigate]);

  const carregarApresentacao = useCallback(
    async (id) => {
      const requisicao = ++requisicaoAtual.current;
      setCarregando(true);
      try {
        const apresentacao = await apiFetch(`/apresentacoes/${id}`);
        if (requisicao !== requisicaoAtual.current) return;
        preencherEditor(apresentacao);
        marcarSalvo(apresentacao);
        setCarregando(false);
      } catch (erro) {
        if (requisicao !== requisicaoAtual.current || erro.status === 401) return;
        novaApresentacao();
        mostrarAviso(
          erro.status === 404 ? "Apresentação não encontrada. Ela pode ter sido excluída." : erro.message,
          "erro",
        );
      }
    },
    [preencherEditor, marcarSalvo, novaApresentacao, mostrarAviso],
  );

  // A URL define o que está aberto: /editor/:id carrega do servidor e
  // /editor é uma apresentação nova. Depois de salvar, a URL muda para o
  // id que já está na tela e nada é recarregado.
  useEffect(() => {
    if (idRota !== undefined && !/^\d+$/.test(idRota)) {
      navigate("/editor", { replace: true });
      return;
    }
    const id = idRota === undefined ? null : Number(idRota);
    if (id !== null) {
      if (id !== apresentacaoIdRef.current) carregarApresentacao(id);
    } else if (apresentacaoIdRef.current !== null || tokenNova !== undefined) {
      limparEditor();
      refNome.current?.focus();
    }
  }, [idRota, tokenNova, carregarApresentacao, limparEditor, navigate]);

  // ---------------- Salvar / excluir ----------------

  async function salvarApresentacao() {
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) {
      mostrarAviso("Informe o nome da apresentação antes de salvar.", "erro");
      refNome.current?.focus();
      return;
    }

    if (
      emEdicao !== null &&
      !window.confirm(
        "Há um momento em edição que ainda não foi aplicado (botão “Salvar alterações”). Salvar a apresentação sem essa alteração?",
      )
    ) {
      return;
    }

    const dados = { nome: nomeLimpo, slide_preto: slidePreto, momentos: dadosParaApi(momentos) };

    setSalvando(true);
    try {
      const apresentacao =
        apresentacaoId === null
          ? await apiFetch("/apresentacoes", { method: "POST", json: dados })
          : await apiFetch(`/apresentacoes/${apresentacaoId}`, { method: "PUT", json: dados });

      marcarSalvo(apresentacao);
      navigate(`/editor/${apresentacao.id}`, { replace: true });
      mostrarAviso("Apresentação salva com sucesso.", "sucesso");
      atualizarRecentes();
    } catch (erro) {
      if (erro.status === 401) return;

      if (erro.status === 404 && apresentacaoId !== null) {
        // Foi excluída em outra aba: o próximo "Salvar" cria uma nova.
        apresentacaoIdRef.current = null;
        setApresentacaoId(null);
        marcarAlterado();
        mostrarAviso(
          "Esta apresentação não existe mais no servidor. Clique em “Salvar” novamente para criá-la como nova.",
          "erro",
        );
      } else {
        mostrarAviso(erro.message, "erro");
      }
    } finally {
      setSalvando(false);
    }
  }

  async function excluirApresentacao() {
    if (apresentacaoId === null) return;

    const nomeExibido = nome.trim() || "sem nome";
    if (
      !window.confirm(`Deseja realmente excluir a apresentação “${nomeExibido}”? Esta ação não pode ser desfeita.`)
    ) {
      return;
    }

    try {
      await apiFetch(`/apresentacoes/${apresentacaoId}`, { method: "DELETE" });
      novaApresentacao();
      mostrarAviso("Apresentação excluída.", "sucesso");
      atualizarRecentes();
    } catch (erro) {
      if (erro.status === 404) {
        novaApresentacao();
        mostrarAviso("Esta apresentação já havia sido excluída.", "erro");
      } else if (erro.status !== 401) {
        mostrarAviso(erro.message, "erro");
      }
    }
  }

  // ---------------- Gerar PowerPoint ----------------

  async function gerarPowerPoint() {
    const nomeArquivo = nome.trim();
    if (!nomeArquivo) {
      mostrarAviso("Informe o nome da apresentação.", "erro");
      refNome.current?.focus();
      return;
    }
    if (momentos.length === 0) {
      mostrarAviso("Adicione pelo menos um momento à apresentação.", "erro");
      return;
    }

    setGerando(true);
    try {
      const arquivo = await apiFetch("/gerar-apresentacao", {
        method: "POST",
        json: { nome_arquivo: nomeArquivo, slide_preto: slidePreto, momentos: dadosParaApi(momentos) },
        tipo: "blob",
      });

      const url = URL.createObjectURL(arquivo);
      const link = document.createElement("a");
      link.href = url;
      link.download = nomeArquivoPptx(nomeArquivo);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (erro) {
      console.error(erro);
      if (erro.status !== 401) {
        mostrarAviso(erro.status === 0 ? erro.message : "Não foi possível gerar a apresentação.", "erro");
      }
    } finally {
      setGerando(false);
    }
  }

  // ---------------- Alterações não salvas ----------------

  // Fechar/recarregar a aba.
  useEffect(() => {
    if (!pendentes) return undefined;
    const aoSair = (evento) => {
      evento.preventDefault();
      evento.returnValue = "";
    };
    window.addEventListener("beforeunload", aoSair);
    return () => window.removeEventListener("beforeunload", aoSair);
  }, [pendentes]);

  // Navegar dentro do site (menu, recentes, "Nova apresentação").
  const bloqueio = useBlocker(
    ({ currentLocation, nextLocation }) =>
      pendentesRef.current &&
      (currentLocation.pathname !== nextLocation.pathname || nextLocation.state?.nova !== undefined),
  );

  useEffect(() => {
    if (bloqueio.state !== "blocked") return;
    const indoParaNova = bloqueio.location.pathname === "/editor" && bloqueio.location.state?.nova !== undefined;
    const mensagem = indoParaNova
      ? "Há alterações não salvas. Deseja descartá-las e começar uma nova apresentação?"
      : "Há alterações não salvas. Deseja sair e descartá-las?";
    if (window.confirm(mensagem)) {
      pendentesRef.current = false;
      bloqueio.proceed();
    } else {
      bloqueio.reset();
    }
  }, [bloqueio]);

  // ---------------- Tela ----------------

  let status;
  if (carregando) status = "Carregando apresentação...";
  else if (apresentacaoId === null)
    status = pendentes ? "Nova apresentação • alterações não salvas" : "Nova apresentação (não salva)";
  else status = pendentes ? "Alterações não salvas" : `Salva em ${formatarDataHora(ultimaAtualizacao)}`;

  // Momentos salvos podem ter nomes fora da lista padrão.
  const opcoesMomento = MOMENTOS_PADRAO.includes(momentoSelecionado)
    ? MOMENTOS_PADRAO
    : [...MOMENTOS_PADRAO, momentoSelecionado];

  return (
    <Pagina
      titulo="Editor de apresentação"
      tituloDocumento="Editor"
      refRolagem={refRolagem}
      subtitulo={
        <p className={classes("status-salvamento", pendentes && "pendente")} role="status">
          {status}
        </p>
      }
      acoes={
        <>
          {apresentacaoId !== null && (
            <button
              type="button"
              className="botao botao-perigo"
              title="Excluir apresentação"
              onClick={excluirApresentacao}
            >
              <Icone nome="lixeira" tamanho={18} />
              <span>Excluir</span>
            </button>
          )}
          <button
            type="button"
            className="botao botao-primario"
            title="Salvar apresentação"
            onClick={salvarApresentacao}
            disabled={salvando || carregando}
          >
            <Icone nome="salvar" tamanho={18} />
            <span>{salvando ? "Salvando..." : "Salvar"}</span>
          </button>
        </>
      }
    >
      {/* CONTEÚDO DO MOMENTO + PRÉ-VISUALIZAÇÃO */}
      <section className="card editor-apresentacao" style={MARGENS_SLIDE}>
        <div className="configuracao-apresentacao">
          <label htmlFor="nome-arquivo">Nome da apresentação</label>
          <input
            type="text"
            id="nome-arquivo"
            ref={refNome}
            maxLength={150}
            placeholder="Ex.: Missa Domingo 20-09-2026"
            value={nome}
            onChange={(e) => {
              setNome(e.target.value);
              marcarAlterado();
            }}
          />
        </div>

        <div className="area-principal">
          <div className="painel-formulario">
            <div className="formulario">
              <label htmlFor="momento">Momento da Missa</label>
              <select id="momento" value={momentoSelecionado} onChange={aoMudarMomento}>
                {opcoesMomento.map((opcao) => (
                  <option key={opcao} value={opcao}>
                    {opcao}
                  </option>
                ))}
              </select>
              <label className="opcao-checkbox opcao-caixa-alta">
                <input type="checkbox" checked={caixaAlta} onChange={aoMudarCaixaAlta} />
                Letra em CAIXA ALTA (canto)
              </label>
            </div>

            <div className="formulario">
              <label htmlFor="letra">Letra / Respostas</label>
              <textarea
                id="letra"
                ref={refLetra}
                rows={7}
                placeholder={"Digite ou cole aqui a letra ou as respostas...\n\nUse uma linha vazia para separar os blocos."}
                value={letra}
                onChange={aoMudarLetra}
              />
            </div>

            <button id="adicionar" type="button" onClick={adicionarMomento}>
              {emEdicao !== null ? "Salvar alterações" : TEXTO_ADICIONAR}
            </button>
            {emEdicao !== null && (
              <button type="button" className="botao-cancelar" onClick={limparFormulario}>
                Cancelar edição
              </button>
            )}
          </div>

          <PreviewSlides
            slides={exibicao.slides}
            indice={indiceSlide}
            aoSelecionar={setSlideAtual}
            rotulo={rotuloPreview}
            barra={barra}
            aoIrParaMomento={irParaMomento}
            refPainel={refPainelPreview}
          />
        </div>
      </section>

      {/* ITENS DA APRESENTAÇÃO */}
      <section className="card secao-itens">
        <div className="titulo-secao">
          <div>
            <h2>Apresentação atual</h2>
            <p className="descricao-secao">
              Os momentos aparecem na ordem da apresentação. Arraste a alça à esquerda (ou use as setas do teclado)
              para mudar a ordem.
            </p>
          </div>
          <button className="botao-revisar" type="button" onClick={revisarApresentacao}>
            Revisar apresentação
          </button>
        </div>

        <ListaMomentos
          momentos={momentos}
          aoReordenar={reordenarMomentos}
          aoVisualizar={visualizarMomento}
          aoEditar={editarMomento}
          aoExcluir={excluirMomento}
        />
      </section>

      {/* CONFIGURAÇÕES E GERAÇÃO */}
      <section className="card rodape-editor">
        <div className="configuracoes">
          <h2>Configurações</h2>
          <label className="opcao-checkbox">
            <input
              type="checkbox"
              checked={slidePreto}
              onChange={(e) => {
                setSlidePreto(e.target.checked);
                marcarAlterado();
              }}
            />
            Adicionar slide preto vazio entre os momentos
          </label>
        </div>

        <div className="acoes-finais">
          <button className="botao-gerar" type="button" onClick={gerarPowerPoint} disabled={gerando}>
            {gerando ? "Gerando apresentação..." : "Gerar PowerPoint Completo"}
          </button>
        </div>
      </section>
    </Pagina>
  );
}
