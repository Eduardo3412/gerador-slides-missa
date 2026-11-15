import Pagina from "../components/Pagina";

const EXEMPLO = `Vem, Senhor Jesus
Vem nos transformar

Tu és nossa esperança
Tu és nossa salvação`;

export default function Ajuda() {
  return (
    <Pagina titulo="Como usar" subtitulo={<p>Do texto da celebração ao PowerPoint pronto para projetar.</p>}>
      <section className="card" aria-labelledby="titulo-passos">
        <div className="card-cabecalho">
          <h2 id="titulo-passos" className="card-titulo">
            Passo a passo
          </h2>
        </div>
        <ol className="passos">
          <li>
            Clique em <strong>Nova apresentação</strong> no menu e dê um nome a ela (ex.: “Missa Domingo 20-09”).
          </li>
          <li>
            Escolha o <strong>momento da missa</strong>, cole a letra ou as respostas e clique em{" "}
            <strong>Adicionar à apresentação</strong>. Repita para cada momento. O mesmo momento pode aparecer
            mais de uma vez, como duas músicas de Comunhão.
          </li>
          <li>
            Confira tudo em <strong>Revisar apresentação</strong>, que mostra todos os slides na ordem final.
          </li>
          <li>
            Clique em <strong>Salvar</strong> no topo da tela para guardar a apresentação na sua conta. Ela fica
            em <strong>Minhas apresentações</strong> e nos <strong>Recentes</strong> do menu.
          </li>
          <li>
            Clique em <strong>Gerar PowerPoint Completo</strong> para baixar o arquivo .pptx.
          </li>
        </ol>
      </section>

      <section className="card" aria-labelledby="titulo-slides">
        <div className="card-cabecalho">
          <div>
            <h2 id="titulo-slides" className="card-titulo">
              Como o texto vira slide
            </h2>
            <p className="card-descricao">A divisão é automática e igual na pré-visualização e no PowerPoint.</p>
          </div>
        </div>
        <ul className="lista-dicas">
          <li>
            Uma <strong>linha vazia</strong> separa os blocos: cada bloco começa em um slide novo.
          </li>
          <li>
            Cada slide tem no máximo <strong>4 linhas</strong>. Um bloco maior continua no slide seguinte.
          </li>
          <li>
            Com <strong>“Adicionar slide preto vazio entre os momentos”</strong> ativado, um slide preto separa um
            canto do outro.
          </li>
          <li>
            As letras dos <strong>cantos</strong> saem em <strong>CAIXA ALTA</strong>; as{" "}
            <strong>respostas do povo</strong> (ex.: “Enviai o vosso Espírito Santo!”) saem em caixa normal.
            Salmo, Preces e Oração Eucarística já vêm como resposta; a opção “Letra em CAIXA ALTA” troca isso em
            cada momento.
          </li>
          <li>
            Os slides são <strong>4:3</strong> (25,4 × 19,05 cm), fundo preto, em{" "}
            <strong>Arial negrito branca</strong>, com a letra entre <strong>40 e 60 pt</strong>: trechos curtos
            (1 ou 2 versos) de 48 a 60 pt e estrofes longas de 40 a 44 pt.
          </li>
        </ul>
        <div className="exemplo-texto" aria-label="Exemplo de texto">
          {EXEMPLO}
        </div>
        <p className="card-descricao">No exemplo acima, a linha vazia gera 2 slides com 2 linhas cada.</p>
      </section>

      <section className="card" aria-labelledby="titulo-dicas">
        <div className="card-cabecalho">
          <h2 id="titulo-dicas" className="card-titulo">
            Dicas
          </h2>
        </div>
        <ul className="lista-dicas">
          <li>
            Para mudar a ordem dos momentos, arraste a alça <strong>⠿</strong> ou selecione-a e use as setas{" "}
            <kbd>↑</kbd> <kbd>↓</kbd> do teclado.
          </li>
          <li>
            Na pré-visualização, clique nas miniaturas ou use os botões <kbd>‹</kbd> <kbd>›</kbd> para navegar
            pelos slides.
          </li>
          <li>
            O texto <strong>“Alterações não salvas”</strong> no topo do editor avisa que há mudanças que ainda não
            foram salvas.
          </li>
          <li>
            O botão de lua/sol no topo alterna entre o tema claro e o escuro. A barra lateral pode ser recolhida
            pela setinha na borda.
          </li>
        </ul>
      </section>
    </Pagina>
  );
}
