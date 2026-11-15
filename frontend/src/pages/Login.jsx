import { useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router";
import LayoutAuth from "../components/LayoutAuth";
import MensagemFormulario from "../components/MensagemFormulario";
import { useAuth } from "../contexts/AuthContext";
import { EMAIL_VALIDO } from "../utils/formatacao";

// Só aceita destinos internos conhecidos (evita redirecionamento aberto).
const DESTINO_PERMITIDO = /^\/(editor(\/\d+)?|minhas-apresentacoes|conta|ajuda)$/;

export function destinoAposLogin(parametros) {
  const destino = parametros.get("next") || "";
  return DESTINO_PERMITIDO.test(destino) ? destino : "/editor";
}

const MENSAGENS_MOTIVO = {
  expirada: { texto: "Sua sessão expirou ou é inválida. Entre novamente.", tipo: "info" },
  "conta-excluida": { texto: "Sua conta e suas apresentações foram excluídas.", tipo: "info" },
};

export default function Login() {
  const { usuario, entrar } = useAuth();
  const [parametros] = useSearchParams();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState(() => MENSAGENS_MOTIVO[parametros.get("motivo")] ?? null);

  // Já autenticado: não precisa ver a tela de login.
  if (usuario) return <Navigate to={destinoAposLogin(parametros)} replace />;

  async function aoEnviar(evento) {
    evento.preventDefault();
    setMensagem(null);

    const emailLimpo = email.trim();
    if (!EMAIL_VALIDO.test(emailLimpo) || !senha) {
      setMensagem({ texto: "Informe um e-mail válido e a senha." });
      return;
    }

    setEnviando(true);
    try {
      await entrar(emailLimpo, senha);
    } catch (erro) {
      setMensagem({ texto: erro.status === 401 ? "E-mail ou senha inválidos." : erro.message });
      setEnviando(false);
    }
  }

  return (
    <LayoutAuth titulo="Entrar" descricao="Acesse sua conta para montar e salvar suas apresentações.">
      <MensagemFormulario mensagem={mensagem} />

      <form onSubmit={aoEnviar} noValidate>
        <div className="campo">
          <label htmlFor="email">E-mail</label>
          <input
            type="email"
            id="email"
            name="email"
            autoComplete="email"
            placeholder="voce@exemplo.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="campo">
          <label htmlFor="senha">Senha</label>
          <input
            type="password"
            id="senha"
            name="senha"
            autoComplete="current-password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </div>

        <button type="submit" className="botao botao-primario" disabled={enviando}>
          {enviando ? "Aguarde..." : "Entrar"}
        </button>
      </form>

      <p className="alternativa-auth">
        Ainda não tem conta? <Link to="/cadastro">Criar conta</Link>
      </p>
    </LayoutAuth>
  );
}
