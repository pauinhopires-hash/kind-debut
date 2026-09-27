/**
 * Senha determinística derivada do PIN do funcionário.
 * O PIN nunca vira credencial direta: a senha real combina PIN + identificador
 * do login, garantindo o tamanho mínimo exigido pelo provedor de autenticação.
 */
export function slugDoNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "");
}

export function emailDoFuncionario(nome: string): string {
  return `${slugDoNome(nome)}@misturaria.app`;
}

export function senhaDoPin(loginEmail: string, pin: string): string {
  const slug = loginEmail.split("@")[0] ?? "";
  return `mfm-${pin}-${slug}`;
}
