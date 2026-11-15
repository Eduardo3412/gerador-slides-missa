import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router";
import { apiFetch, definirAoExpirarSessao } from "../api/cliente";
import { useAviso } from "./AvisoContext";

// ======================================================
// SESSÃO DO USUÁRIO
// usuario: dados de /usuarios/me (null = sem sessão).
// carregando: verificação inicial da sessão ainda em andamento.
// erro: falha de conexão ao verificar a sessão (não é "sem sessão").
// saida: para onde as rotas protegidas mandam o usuário depois de sair
//        (ex.: login com aviso de sessão expirada ou de conta excluída).
// ======================================================

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const mostrarAviso = useAviso();
  const location = useLocation();
  const [sessao, setSessao] = useState({ usuario: null, carregando: true, erro: null, saida: null });

  const localAtual = useRef(location);
  localAtual.current = location;

  const verificarSessao = useCallback(async () => {
    setSessao((atual) => ({ ...atual, carregando: true, erro: null }));
    try {
      const usuario = await apiFetch("/usuarios/me", { redirecionar401: false });
      setSessao({ usuario, carregando: false, erro: null, saida: null });
    } catch (erro) {
      setSessao({
        usuario: null,
        carregando: false,
        erro: erro.status === 401 ? null : erro.message,
        saida: null,
      });
    }
  }, []);

  useEffect(() => {
    verificarSessao();
  }, [verificarSessao]);

  // Encerra a sessão local; a rota protegida redireciona para `destino`.
  const encerrarSessao = useCallback((destino) => {
    setSessao({ usuario: null, carregando: false, erro: null, saida: destino });
  }, []);

  // Qualquer 401 da API (sessão expirada) leva ao login, voltando depois
  // para a página em que o usuário estava.
  useEffect(() => {
    definirAoExpirarSessao(() => {
      const { pathname, search } = localAtual.current;
      const parametros = new URLSearchParams({ next: pathname + search, motivo: "expirada" });
      encerrarSessao(`/login?${parametros}`);
    });
    return () => definirAoExpirarSessao(null);
  }, [encerrarSessao]);

  const entrar = useCallback(async (email, senha) => {
    const usuario = await apiFetch("/usuarios/login", {
      method: "POST",
      json: { email, senha },
      redirecionar401: false,
    });
    setSessao({ usuario, carregando: false, erro: null, saida: null });
    return usuario;
  }, []);

  const sair = useCallback(async () => {
    try {
      await apiFetch("/usuarios/logout", { method: "POST", redirecionar401: false });
    } catch (erro) {
      if (erro.status === 0) {
        mostrarAviso(erro.message, "erro");
        return;
      }
    }
    encerrarSessao("/login");
  }, [encerrarSessao, mostrarAviso]);

  const atualizarUsuario = useCallback((usuario) => {
    setSessao((atual) => ({ ...atual, usuario }));
  }, []);

  const valor = useMemo(
    () => ({ ...sessao, verificarSessao, entrar, sair, encerrarSessao, atualizarUsuario }),
    [sessao, verificarSessao, entrar, sair, encerrarSessao, atualizarUsuario],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
