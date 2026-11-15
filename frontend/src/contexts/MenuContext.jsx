import { createContext, useContext } from "react";

// Estado do menu lateral no celular (aberto/fechado), usado pela Topbar.
export const MenuContext = createContext({ menuAberto: false, abrirMenu: () => {} });

export function useMenu() {
  return useContext(MenuContext);
}
