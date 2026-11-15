import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Backend FastAPI (uvicorn) usado em desenvolvimento.
const BACKEND = "http://127.0.0.1:8000";

// Em desenvolvimento o Vite repassa as chamadas da API ao backend: o
// navegador vê tudo na mesma origem, então o cookie de sessão (HttpOnly)
// e o cabeçalho CSRF funcionam sem configurar CORS.
// As expressões evitam capturar rotas da tela, como /minhas-apresentacoes.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "^/usuarios(/|$)": BACKEND,
      "^/apresentacoes(/|$)": BACKEND,
      "^/gerar-apresentacao$": BACKEND,
    },
  },
  build: {
    outDir: "dist",
  },
});
