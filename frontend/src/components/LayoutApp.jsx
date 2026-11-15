import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { MenuContext } from "../contexts/MenuContext";
import { RecentesProvider } from "../contexts/RecentesContext";
import { classes, gravarPreferencia, lerPreferencia } from "../utils/formatacao";
import Sidebar from "./Sidebar";

const CHAVE_RECOLHIDO = "menu-recolhido";

// Erro de conexão ao verificar a sessão (backend fora do ar, sem internet).
function ErroConexao({ mensagem, aoTentarNovamente }) {
  return (
    <div className="app-conteudo">
      <main className="pagina">
        <div className="pagina-interna">
          <section className="card">
            <div className="lista-vazia">{mensagem}</div>
            <div className="acoes-formulario">
              <button type="button" className="botao botao-primario" onClick={aoTentarNovamente}>
                Tentar novamente
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

/**
 * Layout das páginas que exigem login: menu lateral + conteúdo da rota.
 * Sem sessão, redireciona para o login (voltando depois para esta página).
 */
export default function LayoutApp() {
  const { usuario, carregando, erro, saida, verificarSessao } = useAuth();
  const location = useLocation();

  const [recolhido, setRecolhido] = useState(() => lerPreferencia(CHAVE_RECOLHIDO) === "1");
  const [menuAberto, setMenuAberto] = useState(false);

  const fecharMenu = useCallback(() => setMenuAberto(false), []);
  const abrirMenu = useCallback(() => setMenuAberto(true), []);

  function alternarRecolhido() {
    setRecolhido((atual) => {
      gravarPreferencia(CHAVE_RECOLHIDO, atual ? "0" : "1");
      return !atual;
    });
  }

  // No celular, o menu fecha ao trocar de página.
  useEffect(fecharMenu, [location.pathname, location.state, fecharMenu]);

  useEffect(() => {
    if (!menuAberto) return undefined;
    const aoTeclar = (evento) => {
      if (evento.key === "Escape") fecharMenu();
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [menuAberto, fecharMenu]);

  const menu = useMemo(() => ({ menuAberto, abrirMenu }), [menuAberto, abrirMenu]);

  if (!carregando && !usuario && !erro) {
    const login = `/login?${new URLSearchParams({ next: location.pathname + location.search })}`;
    return <Navigate to={saida ?? login} replace />;
  }

  let conteudo;
  if (erro) {
    conteudo = <ErroConexao mensagem={erro} aoTentarNovamente={verificarSessao} />;
  } else if (usuario) {
    conteudo = <Outlet />;
  } else {
    // Verificando a sessão: o CSS esconde o conteúdo até terminar.
    conteudo = <div className="app-conteudo" />;
  }

  return (
    <MenuContext.Provider value={menu}>
      <RecentesProvider ativo={Boolean(usuario)}>
        <div
          className={classes(
            "app",
            !usuario && "verificando-sessao",
            recolhido && "menu-recolhido",
            menuAberto && "menu-aberto",
          )}
        >
          <Sidebar
            recolhido={recolhido}
            aoAlternarRecolhido={alternarRecolhido}
            menuAberto={menuAberto}
            aoFecharMenu={fecharMenu}
          />
          <div className="sidebar-fundo" aria-hidden="true" onClick={fecharMenu} />
          {conteudo}
        </div>
      </RecentesProvider>
    </MenuContext.Provider>
  );
}
