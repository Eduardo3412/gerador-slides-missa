import { useCallback, useEffect, useState } from "react";
import { gravarPreferencia } from "./formatacao";

export function useTituloPagina(titulo) {
  useEffect(() => {
    document.title = `${titulo} | Slides para Missa`;
  }, [titulo]);
}

const CHAVE_TEMA = "tema";

function temaEfetivo() {
  const escolhido = document.documentElement.dataset.theme;
  if (escolhido) return escolhido;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// Tema claro/escuro. O index.html aplica o tema salvo antes do React
// carregar; aqui só alternamos e gravamos a escolha.
export function useTema() {
  const [tema, setTema] = useState(temaEfetivo);

  const alternarTema = useCallback(() => {
    const novo = temaEfetivo() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = novo;
    gravarPreferencia(CHAVE_TEMA, novo);
    setTema(novo);
  }, []);

  return { escuro: tema === "dark", alternarTema };
}
