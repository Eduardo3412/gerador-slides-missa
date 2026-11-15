import { useTema } from "../utils/hooks";
import Icone from "./Icone";

export default function BotaoTema() {
  const { escuro, alternarTema } = useTema();
  const rotulo = escuro ? "Usar tema claro" : "Usar tema escuro";

  return (
    <button
      type="button"
      className="botao botao-fantasma botao-icone"
      onClick={alternarTema}
      aria-label={rotulo}
      title={rotulo}
    >
      <Icone nome={escuro ? "sol" : "lua"} tamanho={18} />
    </button>
  );
}
