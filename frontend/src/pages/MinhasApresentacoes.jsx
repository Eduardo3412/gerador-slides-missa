import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { apiFetch } from "../api/cliente";
import Icone from "../components/Icone";
import Pagina from "../components/Pagina";
import { useAviso } from "../contexts/AvisoContext";
import { useRecentes } from "../contexts/RecentesContext";
import { formatarDataHora, normalizar, plural } from "../utils/formatacao";

function ItemApresentacao({ apresentacao, aoExcluir }) {
  const [excluindo, setExcluindo] = useState(false);
  const endereco = `/editor/${apresentacao.id}`;

  async function excluir() {
    setExcluindo(true);
    const excluiu = await aoExcluir(apresentacao);
    if (!excluiu) setExcluindo(false);
  }

  return (
    <article className="item-apresentacao">
      {/* Capa no formato de slide, com o nome da apresentação */}
      <Link className="capa-apresentacao" to={endereco} tabIndex={-1} aria-hidden="true">
        <strong>{apresentacao.nome}</strong>
        <span className="etiqueta">{plural(apresentacao.quantidade_momentos, "momento", "momentos")}</span>
      </Link>

      <div className="info-apresentacao">
        <Link className="nome-apresentacao" to={endereco} title={apresentacao.nome}>
          {apresentacao.nome}
        </Link>
        <span className="detalhes-apresentacao">
          {`Atualizada em ${formatarDataHora(apresentacao.atualizado_em)}`}
          {apresentacao.slide_preto ? " · com slide preto" : ""}
        </span>
      </div>

      <div className="acoes-momento">
        <Link className="botao-acao botao-editar" to={endereco}>
          Abrir
        </Link>
        <button type="button" className="botao-excluir" onClick={excluir} disabled={excluindo}>
          Excluir
        </button>
      </div>
    </article>
  );
}

export default function MinhasApresentacoes() {
  const mostrarAviso = useAviso();
  const { atualizarRecentes } = useRecentes();
  // null = carregando
  const [apresentacoes, setApresentacoes] = useState(null);
  const [erro, setErro] = useState(null);
  const [busca, setBusca] = useState("");

  const carregar = useCallback(async () => {
    try {
      setApresentacoes(await apiFetch("/apresentacoes"));
      setErro(null);
    } catch (e) {
      if (e.status !== 401) setErro(e.message);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Devolve true se a apresentação saiu da lista.
  async function excluirApresentacao(apresentacao) {
    const confirmar = window.confirm(
      `Deseja realmente excluir a apresentação “${apresentacao.nome}”? Esta ação não pode ser desfeita.`,
    );
    if (!confirmar) return false;

    try {
      await apiFetch(`/apresentacoes/${apresentacao.id}`, { method: "DELETE" });
      mostrarAviso("Apresentação excluída.", "sucesso");
    } catch (e) {
      if (e.status === 404) {
        mostrarAviso("Esta apresentação já não existe.", "erro");
      } else {
        if (e.status !== 401) mostrarAviso(e.message, "erro");
        return false;
      }
    }
    await carregar();
    atualizarRecentes();
    return true;
  }

  let conteudo;
  if (erro) {
    conteudo = <div className="lista-vazia">{erro}</div>;
  } else if (apresentacoes === null) {
    conteudo = <div className="lista-vazia">Carregando apresentações...</div>;
  } else if (apresentacoes.length === 0) {
    conteudo = (
      <div className="lista-vazia">
        Você ainda não salvou nenhuma apresentação. Clique em “Nova apresentação” para começar.
      </div>
    );
  } else {
    const termo = normalizar(busca.trim());
    const filtradas = termo ? apresentacoes.filter((a) => normalizar(a.nome).includes(termo)) : apresentacoes;
    conteudo =
      filtradas.length === 0 ? (
        <div className="lista-vazia">Nenhuma apresentação encontrada com esse nome.</div>
      ) : (
        filtradas.map((apresentacao) => (
          <ItemApresentacao key={apresentacao.id} apresentacao={apresentacao} aoExcluir={excluirApresentacao} />
        ))
      );
  }

  const total = apresentacoes?.length ?? 0;

  return (
    <Pagina
      titulo="Minhas apresentações"
      subtitulo={<p>Abra uma apresentação para editar ou gerar o PowerPoint.</p>}
      acoes={
        <Link to="/editor" state={{ nova: Date.now() }} className="botao botao-primario" title="Nova apresentação">
          <Icone nome="mais" tamanho={18} />
          <span>Nova apresentação</span>
        </Link>
      }
    >
      <section className="card">
        <div className="barra-ferramentas">
          <div className="campo-busca">
            <Icone nome="busca" tamanho={18} />
            <label htmlFor="busca" className="somente-leitor">
              Buscar apresentação
            </label>
            <input
              type="search"
              id="busca"
              placeholder="Buscar pelo nome..."
              autoComplete="off"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          {total > 0 && <span className="etiqueta">{plural(total, "apresentação", "apresentações")}</span>}
        </div>

        <div className="lista-apresentacoes" aria-live="polite">
          {conteudo}
        </div>
      </section>
    </Pagina>
  );
}
