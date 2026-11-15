import { useTituloPagina } from "../utils/hooks";
import BotaoTema from "./BotaoTema";
import { IconeIgreja } from "./Icone";

// Estrutura das telas de entrar e criar conta (painel da marca + formulário).
export default function LayoutAuth({ titulo, descricao, children }) {
  useTituloPagina(titulo);

  return (
    <div className="auth-layout">
      {/* Celular: faixa compacta com a marca */}
      <div className="auth-faixa">
        <span className="marca-icone">
          <IconeIgreja />
        </span>
        <span className="marca-texto">
          <strong>Slides para Missa</strong>
          <small>Gerador de apresentações</small>
        </span>
      </div>

      {/* Desktop: painel da marca */}
      <div className="auth-painel">
        <IconeIgreja detalhada className="auth-painel-marca" />
        <div className="auth-painel-conteudo">
          <div>
            <h2>
              Cada momento da celebração, <em>pronto para projetar.</em>
            </h2>
            <p>Monte os slides da missa, salve na sua conta e gere o PowerPoint em poucos minutos.</p>
          </div>
          <ol className="auth-painel-passos">
            <li>
              <strong>Escolha o momento</strong>
              <p>Entrada, Salmo, Comunhão e os demais.</p>
            </li>
            <li>
              <strong>Cole a letra</strong>
              <p>Os slides são divididos automaticamente.</p>
            </li>
            <li>
              <strong>Gere o PowerPoint</strong>
              <p>Arquivo pronto para projetar.</p>
            </li>
          </ol>
        </div>
      </div>

      <div className="auth-coluna">
        <main className="auth-principal">
          <div className="auth-formulario">
            <h2>{titulo}</h2>
            <p className="card-descricao">{descricao}</p>
            {children}
          </div>
        </main>

        <footer className="auth-rodape">
          <p>Gerador de Slides para Missa</p>
          <BotaoTema />
        </footer>
      </div>
    </div>
  );
}
