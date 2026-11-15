import { useEffect, useState } from "react";
import { apiFetch } from "../api/cliente";
import MensagemFormulario from "../components/MensagemFormulario";
import Pagina from "../components/Pagina";
import { useAuth } from "../contexts/AuthContext";
import { EMAIL_VALIDO } from "../utils/formatacao";

// Botão de envio que mostra "Aguarde..." enquanto a ação roda.
function BotaoEnviar({ enviando, className = "botao botao-primario", children }) {
  return (
    <div className="acoes-formulario">
      <button type="submit" className={className} disabled={enviando}>
        {enviando ? "Aguarde..." : children}
      </button>
    </div>
  );
}

// ---------------- Dados pessoais ----------------

function FormularioPerfil() {
  const { usuario, atualizarUsuario } = useAuth();
  const [nome, setNome] = useState(usuario.nome);
  const [email, setEmail] = useState(usuario.email);
  const [mensagem, setMensagem] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(evento) {
    evento.preventDefault();
    setMensagem(null);

    const nomeLimpo = nome.trim();
    const emailLimpo = email.trim();
    if (nomeLimpo.length < 2) return setMensagem({ texto: "Informe seu nome (mínimo de 2 caracteres)." });
    if (!EMAIL_VALIDO.test(emailLimpo)) return setMensagem({ texto: "Informe um e-mail válido." });

    setEnviando(true);
    try {
      const atualizado = await apiFetch("/usuarios/me", {
        method: "PUT",
        json: { nome: nomeLimpo, email: emailLimpo },
      });
      setNome(atualizado.nome);
      setEmail(atualizado.email);
      atualizarUsuario(atualizado);
      setMensagem({ texto: "Dados atualizados com sucesso.", tipo: "sucesso" });
    } catch (erro) {
      if (erro.status !== 401) {
        setMensagem({
          texto: erro.status === 409 ? "Este e-mail já está sendo usado por outra conta." : erro.message,
        });
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="card" aria-labelledby="titulo-perfil">
      <div className="card-cabecalho">
        <div>
          <h2 id="titulo-perfil" className="card-titulo">
            Dados pessoais
          </h2>
          <p className="card-descricao">Nome exibido no menu e e-mail usado para entrar.</p>
        </div>
      </div>

      <MensagemFormulario mensagem={mensagem} />

      <form onSubmit={aoEnviar} noValidate>
        <div className="campo">
          <label htmlFor="perfil-campo-nome">Nome</label>
          <input
            type="text"
            id="perfil-campo-nome"
            name="nome"
            autoComplete="name"
            minLength={2}
            maxLength={100}
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>
        <div className="campo">
          <label htmlFor="perfil-campo-email">E-mail</label>
          <input
            type="email"
            id="perfil-campo-email"
            name="email"
            autoComplete="email"
            maxLength={255}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <BotaoEnviar enviando={enviando}>Salvar dados</BotaoEnviar>
      </form>
    </section>
  );
}

// ---------------- Senha ----------------

const SENHAS_VAZIAS = { atual: "", nova: "", confirmacao: "" };

function FormularioSenha() {
  const { usuario } = useAuth();
  const [senhas, setSenhas] = useState(SENHAS_VAZIAS);
  const [mensagem, setMensagem] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const alterar = (campo) => (evento) => setSenhas((atual) => ({ ...atual, [campo]: evento.target.value }));

  async function aoEnviar(evento) {
    evento.preventDefault();
    setMensagem(null);

    if (!senhas.atual) return setMensagem({ texto: "Informe sua senha atual." });
    if (senhas.nova.length < 8) return setMensagem({ texto: "A nova senha precisa ter pelo menos 8 caracteres." });
    if (senhas.nova !== senhas.confirmacao) return setMensagem({ texto: "As novas senhas não conferem." });

    setEnviando(true);
    try {
      await apiFetch("/usuarios/me/senha", {
        method: "PUT",
        json: { senha_atual: senhas.atual, nova_senha: senhas.nova },
      });
      setSenhas(SENHAS_VAZIAS);
      setMensagem({ texto: "Senha alterada com sucesso.", tipo: "sucesso" });
    } catch (erro) {
      if (erro.status !== 401) setMensagem({ texto: erro.message });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="card" aria-labelledby="titulo-senha">
      <div className="card-cabecalho">
        <div>
          <h2 id="titulo-senha" className="card-titulo">
            Alterar senha
          </h2>
          <p className="card-descricao">Use pelo menos 8 caracteres.</p>
        </div>
      </div>

      <MensagemFormulario mensagem={mensagem} />

      <form onSubmit={aoEnviar} noValidate>
        {/* Campo oculto ajuda gerenciadores de senha a associar a conta */}
        <input type="email" autoComplete="username" hidden readOnly value={usuario.email} />
        <div className="campo">
          <label htmlFor="senha-atual">Senha atual</label>
          <input
            type="password"
            id="senha-atual"
            name="senha_atual"
            autoComplete="current-password"
            required
            value={senhas.atual}
            onChange={alterar("atual")}
          />
        </div>
        <div className="grade-campos">
          <div className="campo">
            <label htmlFor="nova-senha">Nova senha</label>
            <input
              type="password"
              id="nova-senha"
              name="nova_senha"
              autoComplete="new-password"
              minLength={8}
              maxLength={100}
              required
              value={senhas.nova}
              onChange={alterar("nova")}
            />
          </div>
          <div className="campo">
            <label htmlFor="confirmar-nova-senha">Confirmar nova senha</label>
            <input
              type="password"
              id="confirmar-nova-senha"
              autoComplete="new-password"
              required
              value={senhas.confirmacao}
              onChange={alterar("confirmacao")}
            />
          </div>
        </div>
        <BotaoEnviar enviando={enviando}>Alterar senha</BotaoEnviar>
      </form>
    </section>
  );
}

// ---------------- Excluir conta ----------------

function FormularioExcluir() {
  const { encerrarSessao } = useAuth();
  const [senha, setSenha] = useState("");
  const [mensagem, setMensagem] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [totalApresentacoes, setTotalApresentacoes] = useState(null);

  useEffect(() => {
    apiFetch("/apresentacoes")
      .then((lista) => setTotalApresentacoes(lista.length))
      .catch(() => {
        // Mantém o texto genérico.
      });
  }, []);

  let textoTotal = "todas as suas apresentações";
  if (totalApresentacoes === 0) {
    textoTotal = "todas as suas apresentações (você não tem nenhuma salva)";
  } else if (totalApresentacoes > 0) {
    textoTotal = `suas ${totalApresentacoes} ${totalApresentacoes === 1 ? "apresentação salva" : "apresentações salvas"}`;
  }

  async function aoEnviar(evento) {
    evento.preventDefault();
    setMensagem(null);

    if (!senha) return setMensagem({ texto: "Digite sua senha para confirmar." });

    const confirmar = window.confirm(
      "Tem certeza? Sua conta e todas as suas apresentações serão excluídas permanentemente.",
    );
    if (!confirmar) return;

    setEnviando(true);
    try {
      await apiFetch("/usuarios/me", { method: "DELETE", json: { senha } });
      encerrarSessao("/login?motivo=conta-excluida");
    } catch (erro) {
      if (erro.status !== 401) setMensagem({ texto: erro.message });
      setEnviando(false);
    }
  }

  return (
    <section className="card card-perigo" aria-labelledby="titulo-excluir">
      <div className="card-cabecalho">
        <div>
          <h2 id="titulo-excluir" className="card-titulo">
            Excluir conta
          </h2>
          <p className="card-descricao">
            Remove sua conta e <strong>{textoTotal}</strong> permanentemente. Esta ação não pode ser desfeita.
          </p>
        </div>
      </div>

      <MensagemFormulario mensagem={mensagem} />

      <form onSubmit={aoEnviar} noValidate>
        <div className="grade-campos">
          <div className="campo">
            <label htmlFor="senha-exclusao">Confirme com sua senha</label>
            <input
              type="password"
              id="senha-exclusao"
              autoComplete="current-password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>
        </div>
        <BotaoEnviar enviando={enviando} className="botao botao-perigo-solido">
          Excluir minha conta
        </BotaoEnviar>
      </form>
    </section>
  );
}

export default function Conta() {
  return (
    <Pagina
      titulo="Configurações da conta"
      subtitulo={<p>Seus dados de acesso, senha e exclusão da conta.</p>}
      classeInterna="grade-conta"
    >
      <FormularioPerfil />
      <FormularioSenha />
      <FormularioExcluir />
    </Pagina>
  );
}
