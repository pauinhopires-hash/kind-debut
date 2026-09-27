// Monta links wa.me pra abrir o WhatsApp já com uma mensagem de cotação
// pronta pro fornecedor. Sem API paga — só um link, o usuário confirma o
// envio manualmente no WhatsApp Web/app.

function normalizarNumero(whatsapp: string) {
  let numero = whatsapp.replace(/\D/g, "");
  if (numero.length <= 11) numero = `55${numero}`; // assume DDD+número BR sem código do país
  return numero;
}

export function linkCotacaoWhatsapp(whatsapp: string, produtoNome: string) {
  const mensagem = `Olá! Gostaria de uma cotação de: ${produtoNome}. Pode me passar o preço?`;
  return `https://wa.me/${normalizarNumero(whatsapp)}?text=${encodeURIComponent(mensagem)}`;
}

export function linkCotacaoMultiplaWhatsapp(
  whatsapp: string,
  itens: { nome: string; quantidade: number; unidade: string }[],
) {
  const lista = itens.map((i) => `• ${i.nome} — ${i.quantidade} ${i.unidade}`).join("\n");
  const mensagem = `Olá! Gostaria de uma cotação dos seguintes itens:\n${lista}\n\nPode me passar os preços?`;
  return `https://wa.me/${normalizarNumero(whatsapp)}?text=${encodeURIComponent(mensagem)}`;
}
