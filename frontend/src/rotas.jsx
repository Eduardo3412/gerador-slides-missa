import { Navigate, Outlet, createBrowserRouter, useLocation } from "react-router";
import LayoutApp from "./components/LayoutApp";
import { AuthProvider } from "./contexts/AuthContext";
import { AvisoProvider } from "./contexts/AvisoContext";
import Ajuda from "./pages/Ajuda";
import Cadastro from "./pages/Cadastro";
import Conta from "./pages/Conta";
import Login from "./pages/Login";
import MinhasApresentacoes from "./pages/MinhasApresentacoes";
import Editor from "./pages/editor/Editor";

function Raiz() {
  return (
    <AvisoProvider>
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    </AvisoProvider>
  );
}

// Endereços da versão antiga (páginas .html), para links e favoritos
// salvos. Qualquer outro endereço desconhecido volta para o início.
function RedirecionarLegado() {
  const { pathname, search } = useLocation();
  const pagina = pathname.split("/").pop();
  const parametros = new URLSearchParams(search);

  if (pagina === "index.html") {
    const id = parametros.get("id");
    return <Navigate to={id && /^\d+$/.test(id) ? `/editor/${id}` : "/editor"} replace />;
  }

  const destinos = {
    "apresentacoes.html": "/minhas-apresentacoes",
    "conta.html": "/conta",
    "ajuda.html": "/ajuda",
    "cadastro.html": "/cadastro",
  };
  if (pagina === "login.html") {
    // O "next" antigo apontava para páginas .html; o login novo só aceita
    // rotas novas e cai no padrão (editor) se não reconhecer.
    parametros.delete("next");
    const resto = parametros.toString();
    return <Navigate to={`/login${resto ? `?${resto}` : ""}`} replace />;
  }
  return <Navigate to={destinos[pagina] ?? "/"} replace />;
}

export const router = createBrowserRouter([
  {
    element: <Raiz />,
    children: [
      { path: "/login", element: <Login /> },
      { path: "/cadastro", element: <Cadastro /> },
      {
        element: <LayoutApp />,
        children: [
          // Uma única rota para nova e existente: o editor não é recriado
          // quando a URL muda de /editor para /editor/:id ao salvar.
          { path: "/editor/:id?", element: <Editor /> },
          { path: "/minhas-apresentacoes", element: <MinhasApresentacoes /> },
          { path: "/conta", element: <Conta /> },
          { path: "/ajuda", element: <Ajuda /> },
        ],
      },
      { path: "/", element: <Navigate to="/editor" replace /> },
      // Endereços desconhecidos (inclusive os .html antigos).
      { path: "*", element: <RedirecionarLegado /> },
    ],
  },
]);
