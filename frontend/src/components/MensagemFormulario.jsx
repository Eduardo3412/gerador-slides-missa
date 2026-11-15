// Mensagem de erro/sucesso/informação exibida acima de um formulário.
// mensagem: { texto, tipo: "erro" | "sucesso" | "info" } ou null.
export default function MensagemFormulario({ mensagem }) {
  if (!mensagem) return null;
  return (
    <div className={`mensagem-formulario mensagem-${mensagem.tipo ?? "erro"}`} role="alert">
      {mensagem.texto}
    </div>
  );
}
