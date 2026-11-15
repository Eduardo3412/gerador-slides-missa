import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { apiFetch } from "../api/cliente";
import LayoutAuth from "../components/LayoutAuth";
import MensagemFormulario from "../components/MensagemFormulario";
import { useAuth } from "../contexts/AuthContext";
import { EMAIL_VALIDO } from "../utils/formatacao";
import { destinoAposLogin } from "./Login";

function validar({ nome, email, senha, confirmacao }) {
  if (nome.length < 2) return "Informe seu nome (mínimo de 2 caracteres).";
  if (!EMAIL_VALIDO.test(email)) return "Informe um e-mail válido.";
  if (senha.length < 8) return "A senha precisa ter pelo menos 8 caracteres.";
  if (senha !== confirmacao) return "As senhas não conferem.";
  return null;
}

export default function Cadastro() {
  const { usuario, entrar } = useAuth();
  const navigate = useNavigate();
  const [parametros] = useSearchParams();
  const [campos, setCampos] = useState({ nome: "", email: "", senha: "", confirmacao: "" });
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState(null);

  if (usuario) return <Navigate to={destinoAposLogin(parametros)} replace />;

  const alterar = (campo) => (evento) => setCampos((atual) => ({ ...atual, [campo]: evento.target.value }));

  async function aoEnviar(evento) {
    evento.preventDefault();
    setMensagem(null);

    const dados = { ...campos, nome: campos.nome.trim(), email: campos.email.trim() };
    const erroValidacao = validar(dados);
    if (erroValidacao) {
      setMensagem({ texto: erroValidacao });
      return;
    }

    setEnviando(true);
    try {
      await apiFetch("/usuarios/cadastro", {
        method: "POST",
        json: { nome: dados.nome, email: dados.email, senha: dados.senha },
        redirecionar401: false,
      });
    } catch (erro) {
      setMensagem({
        texto:
          erro.status === 409
            ? "Este e-mail já está cadastrado. Entre com sua senha ou use outro e-mail."
            : erro.message,
      });
      setEnviando(false);
      return;
    }

    // Conta criada: entra direto (o redirecionamento acontece ao ter usuário).
    try {
      await entrar(dados.email, dados.senha);
    } catch {
      navigate("/login");
    }
  }

  return (
    <LayoutAuth titulo="Criar conta" descricao="Cadastre-se para salvar e recuperar suas apresentações.">
      <MensagemFormulario mensagem={mensagem} />

      <form onSubmit={aoEnviar} noValidate>
        <div className="campo">
          <label htmlFor="nome">Nome</label>
          <input
            type="text"
            id="nome"
            name="nome"
            autoComplete="name"
            minLength={2}
            maxLength={100}
            required
            value={campos.nome}
            onChange={alterar("nome")}
          />
        </div>

        <div className="campo">
          <label htmlFor="email">E-mail</label>
          <input
            type="email"
            id="email"
            name="email"
            autoComplete="email"
            maxLength={255}
            placeholder="voce@exemplo.com"
            required
            value={campos.email}
            onChange={alterar("email")}
          />
        </div>

        <div className="campo">
          <label htmlFor="senha">Senha</label>
          <input
            type="password"
            id="senha"
            name="senha"
            autoComplete="new-password"
            minLength={8}
            maxLength={100}
            required
            aria-describedby="dica-senha"
            value={campos.senha}
            onChange={alterar("senha")}
          />
          <small id="dica-senha" className="dica-campo">
            Mínimo de 8 caracteres.
          </small>
        </div>

        <div className="campo">
          <label htmlFor="confirmar-senha">Confirmar senha</label>
          <input
            type="password"
            id="confirmar-senha"
            name="confirmar-senha"
            autoComplete="new-password"
            required
            value={campos.confirmacao}
            onChange={alterar("confirmacao")}
          />
        </div>

        <button type="submit" className="botao botao-primario" disabled={enviando}>
          {enviando ? "Aguarde..." : "Criar conta"}
        </button>
      </form>

      <p className="alternativa-auth">
        Já tem conta? <Link to="/login">Entrar</Link>
      </p>
    </LayoutAuth>
  );
}
