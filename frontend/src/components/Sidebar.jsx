import { useEffect, useRef } from "react";
import { Link, matchPath, useLocation } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { useRecentes } from "../contexts/RecentesContext";
import { iniciaisDoNome } from "../utils/formatacao";
import Icone, { IconeIgreja } from "./Icone";

function ItemMenu({ to, state, icone, rotulo, ativo }) {
  return (
    <Link
      className="nav-item"
      to={to}
      state={state}
      title={rotulo}
      aria-current={ativo ? "page" : undefined}
    >
      <Icone nome={icone} />
      <span>{rotulo}</span>
    </Link>
  );
}

function ListaRecentes({ idAberto }) {
  const { recentes } = useRecentes();

  if (recentes === null) return <p className="nav-vazio">Carregando...</p>;
  if (recentes.length === 0) return <p className="nav-vazio">Nenhuma apresentação salva.</p>;

  return recentes.map((apresentacao) => (
    <Link
      key={apresentacao.id}
      className="nav-item nav-item-recente"
      to={`/editor/${apresentacao.id}`}
      title={apresentacao.nome}
      aria-current={String(apresentacao.id) === idAberto ? "page" : undefined}
    >
      <Icone nome="slide" />
      <span>{apresentacao.nome}</span>
    </Link>
  ));
}

export default function Sidebar({ recolhido, aoAlternarRecolhido, menuAberto, aoFecharMenu }) {
  const { usuario, sair } = useAuth();
  const { pathname } = useLocation();
  const primeiroItem = useRef(null);

  const idAberto = matchPath("/editor/:id", pathname)?.params.id ?? null;
  const editorNovo = pathname === "/editor";

  // Ao abrir o menu no celular, o foco vai para o primeiro item.
  useEffect(() => {
    if (menuAberto) primeiroItem.current?.querySelector(".nav-item")?.focus();
  }, [menuAberto]);

  return (
    <aside id="sidebar" className="sidebar" aria-label="Menu">
      <div className="sidebar-topo">
        <Link className="sidebar-marca" to="/minhas-apresentacoes" aria-label="Início — Minhas apresentações">
          <span className="marca-icone">
            <IconeIgreja />
          </span>
          <span className="marca-texto">
            <strong>Slides para Missa</strong>
            <small>Gerador de apresentações</small>
          </span>
        </Link>
        <button type="button" className="sidebar-fechar" aria-label="Fechar menu" onClick={aoFecharMenu}>
          <Icone nome="fechar" />
        </button>
        <button
          type="button"
          className="sidebar-recolher"
          aria-label={recolhido ? "Expandir menu" : "Recolher menu"}
          aria-expanded={!recolhido}
          onClick={aoAlternarRecolhido}
        >
          <Icone nome="seta" tamanho={14} />
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Menu principal">
        <div className="nav-secao" ref={primeiroItem}>
          <p className="nav-rotulo">Apresentações</p>
          {/* O "state" faz o editor começar uma apresentação nova mesmo
              quando o usuário já está em /editor. */}
          <ItemMenu
            to="/editor"
            state={{ nova: Date.now() }}
            icone="mais"
            rotulo="Nova apresentação"
            ativo={editorNovo}
          />
          <ItemMenu
            to="/minhas-apresentacoes"
            icone="pasta"
            rotulo="Minhas apresentações"
            ativo={pathname === "/minhas-apresentacoes"}
          />
        </div>

        <div className="nav-secao nav-recentes">
          <p className="nav-rotulo">Recentes</p>
          <div className="nav-secao">
            <ListaRecentes idAberto={idAberto} />
          </div>
        </div>

        <div className="nav-secao">
          <p className="nav-rotulo">Conta</p>
          <ItemMenu to="/conta" icone="usuario" rotulo="Configurações da conta" ativo={pathname === "/conta"} />
          <ItemMenu to="/ajuda" icone="ajuda" rotulo="Como usar" ativo={pathname === "/ajuda"} />
        </div>
      </nav>

      <div className="sidebar-rodape">
        <div className="cartao-usuario">
          <span className="avatar" aria-hidden="true">
            {usuario ? iniciaisDoNome(usuario.nome) : ""}
          </span>
          <div className="usuario-info">
            <p className="usuario-nome" title={usuario?.nome}>
              {usuario?.nome}
            </p>
            <p className="usuario-email" title={usuario?.email}>
              {usuario?.email}
            </p>
          </div>
          <button
            type="button"
            className="botao-sair"
            aria-label="Sair da conta"
            title="Sair da conta"
            onClick={sair}
          >
            <Icone nome="sair" />
          </button>
        </div>
      </div>
    </aside>
  );
}
