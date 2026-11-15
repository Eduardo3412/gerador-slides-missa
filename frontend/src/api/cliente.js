// ======================================================
// CLIENTE DA API
// O token de acesso fica apenas em um cookie HttpOnly definido pelo
// backend; nada de sessão é guardado em localStorage.
// ======================================================

// Vazio = mesma origem (backend servindo o build, ou proxy do Vite em
// desenvolvimento). Defina VITE_API_URL só se a API estiver em outro endereço.
const API_BASE = import.meta.env.VITE_API_URL ?? "";

const MENSAGEM_SEM_CONEXAO =
  "Não foi possível conectar ao servidor. Verifique sua conexão ou se o backend está em execução.";

export class ErroApi extends Error {
  constructor(mensagem, status) {
    super(mensagem);
    this.status = status;
  }
}

function lerCookie(nome) {
  const prefixo = `${nome}=`;
  const item = document.cookie
    .split(";")
    .map((parte) => parte.trim())
    .find((parte) => parte.startsWith(prefixo));
  return item ? decodeURIComponent(item.slice(prefixo.length)) : null;
}

function mensagemDoErro(status, corpo) {
  if (corpo && typeof corpo.detail === "string") {
    return corpo.detail;
  }
  if (status === 422) {
    return "Verifique os dados informados.";
  }
  if (status >= 500) {
    return "O servidor encontrou um erro. Tente novamente em instantes.";
  }
  return "Não foi possível concluir a operação.";
}

// Chamado quando a API responde 401 (sessão expirada ou inválida).
// O AuthProvider registra aqui a ação de mandar o usuário para o login.
let aoExpirarSessao = null;

export function definirAoExpirarSessao(funcao) {
  aoExpirarSessao = funcao;
}

/**
 * Faz uma requisição à API com o cookie de sessão e o cabeçalho CSRF.
 * opcoes.json: corpo a ser enviado como JSON.
 * opcoes.tipo: "json" (padrão) ou "blob".
 * opcoes.redirecionar401: se true (padrão), sessão inválida leva ao login.
 */
export async function apiFetch(caminho, opcoes = {}) {
  const { json, tipo = "json", redirecionar401 = true, method = "GET" } = opcoes;

  const headers = {};
  if (json !== undefined) headers["Content-Type"] = "application/json";

  const csrf = lerCookie("csrf_token");
  if (csrf && method !== "GET") headers["X-CSRF-Token"] = csrf;

  let resposta;
  try {
    resposta = await fetch(`${API_BASE}${caminho}`, {
      method,
      headers,
      credentials: "include",
      body: json !== undefined ? JSON.stringify(json) : undefined,
    });
  } catch {
    throw new ErroApi(MENSAGEM_SEM_CONEXAO, 0);
  }

  if (resposta.ok) {
    if (resposta.status === 204) return null;
    return tipo === "blob" ? resposta.blob() : resposta.json();
  }

  let corpo = null;
  try {
    corpo = await resposta.json();
  } catch {
    // resposta sem JSON
  }

  if (resposta.status === 401 && redirecionar401) {
    aoExpirarSessao?.();
  }

  throw new ErroApi(mensagemDoErro(resposta.status, corpo), resposta.status);
}
