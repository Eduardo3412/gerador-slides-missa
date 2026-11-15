import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api/cliente";

// "Recentes" do menu lateral: as cinco apresentações atualizadas por último.
// O editor e a lista chamam atualizarRecentes() depois de salvar/excluir.
const RecentesContext = createContext(null);

const QUANTIDADE_RECENTES = 5;

export function RecentesProvider({ ativo, children }) {
  // null = carregando
  const [recentes, setRecentes] = useState(null);

  const atualizarRecentes = useCallback(async () => {
    try {
      const apresentacoes = await apiFetch("/apresentacoes", { redirecionar401: false });
      setRecentes(apresentacoes.slice(0, QUANTIDADE_RECENTES));
    } catch {
      setRecentes([]);
    }
  }, []);

  useEffect(() => {
    if (ativo) atualizarRecentes();
  }, [ativo, atualizarRecentes]);

  const valor = useMemo(() => ({ recentes, atualizarRecentes }), [recentes, atualizarRecentes]);

  return <RecentesContext.Provider value={valor}>{children}</RecentesContext.Provider>;
}

export function useRecentes() {
  return useContext(RecentesContext);
}
