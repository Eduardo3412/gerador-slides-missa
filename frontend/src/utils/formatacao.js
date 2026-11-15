export const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function formatarDataHora(iso) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function iniciaisDoNome(nome) {
  const partes = (nome || "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

// Remove acentos e ignora maiúsculas/minúsculas (usado na busca).
export function normalizar(texto) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// Mesmo tratamento do nome do arquivo feito no backend (criar_nome_arquivo).
export function nomeArquivoPptx(nome) {
  const base = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9\s_-]/g, "")
    .trim()
    .replace(/\s+/g, "_");
  return `${base || "apresentacao"}.pptx`;
}

export function plural(total, singular, pluralTexto) {
  return `${total} ${total === 1 ? singular : pluralTexto}`;
}

// Junta classes CSS ignorando valores falsos: classes("a", cond && "b").
export function classes(...nomes) {
  return nomes.filter(Boolean).join(" ");
}

// Preferências do navegador (tema, menu recolhido). Em janela privada o
// armazenamento pode falhar: a escolha só não é lembrada.
export function lerPreferencia(chave) {
  try {
    return localStorage.getItem(chave);
  } catch {
    return null;
  }
}

export function gravarPreferencia(chave, valor) {
  try {
    localStorage.setItem(chave, valor);
  } catch {
    // Armazenamento indisponível.
  }
}
