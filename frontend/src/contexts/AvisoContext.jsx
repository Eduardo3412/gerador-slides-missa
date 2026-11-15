import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { classes } from "../utils/formatacao";

// Mensagem não bloqueante (canto da tela) usada por todas as páginas.
const AvisoContext = createContext(null);

export function AvisoProvider({ children }) {
  const [aviso, setAviso] = useState({ texto: "", tipo: "info", visivel: false });
  const temporizador = useRef(null);

  const mostrarAviso = useCallback((texto, tipo = "info") => {
    setAviso({ texto, tipo, visivel: true });
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(
      () => setAviso((atual) => ({ ...atual, visivel: false })),
      tipo === "erro" ? 7000 : 3500,
    );
  }, []);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  return (
    <AvisoContext.Provider value={mostrarAviso}>
      {children}
      <div
        id="aviso"
        className={classes("aviso", `aviso-${aviso.tipo}`, aviso.visivel && "visivel")}
        role="status"
        aria-live="polite"
      >
        {aviso.texto}
      </div>
    </AvisoContext.Provider>
  );
}

export function useAviso() {
  return useContext(AvisoContext);
}
