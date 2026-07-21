// Monta um link wa.me pra abrir o WhatsApp já com uma mensagem de cotação
// pronta pro fornecedor. Sem API paga — só um link, o usuário confirma o
// envio manualmente no WhatsApp Web/app.
export function linkCotacaoWhatsapp(whatsapp: string, produtoNome: string) {
  let numero = whatsapp.replace(/\D/g, "");
  if (numero.length <= 11) numero = `55${numero}`; // assume DDD+número BR sem código do país
  const mensagem = `Olá! Gostaria de uma cotação de: ${produtoNome}. Pode me passar o preço?`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}
