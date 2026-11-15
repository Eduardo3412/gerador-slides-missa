import { useMenu } from "../contexts/MenuContext";
import { classes } from "../utils/formatacao";
import { useTituloPagina } from "../utils/hooks";
import BotaoTema from "./BotaoTema";
import Icone from "./Icone";

/**
 * Estrutura das páginas internas: topbar (título, subtítulo e ações) e a
 * área de conteúdo que rola (<main class="pagina">).
 * - subtitulo: elemento exibido abaixo do título (ex.: <p>...</p>).
 * - acoes: botões à direita da topbar (o botão de tema é incluído aqui).
 * - refRolagem: ref para o <main>, que é quem rola (não a janela).
 */
export default function Pagina({ titulo, tituloDocumento, subtitulo, acoes, classeInterna, refRolagem, children }) {
  const { menuAberto, abrirMenu } = useMenu();
  useTituloPagina(tituloDocumento ?? titulo);

  return (
    <div className="app-conteudo">
      <header className="topbar">
        <button
          type="button"
          className="botao botao-fantasma botao-icone topbar-menu"
          aria-label="Abrir menu"
          aria-expanded={menuAberto}
          onClick={abrirMenu}
        >
          <Icone nome="menu" />
        </button>
        <div className="topbar-titulo">
          <h1>{titulo}</h1>
          {subtitulo}
        </div>
        <div className="topbar-acoes">
          {acoes}
          <BotaoTema />
        </div>
      </header>

      <main className="pagina" ref={refRolagem}>
        <div className={classes("pagina-interna", classeInterna)}>{children}</div>
      </main>
    </div>
  );
}
