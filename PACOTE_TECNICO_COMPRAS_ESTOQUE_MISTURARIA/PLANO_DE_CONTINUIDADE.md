# Plano de Continuidade

## 1. O que fazer se a plataforma Lovable ficar indisponivel

Curto prazo: registrar as requisicoes de compra e as retiradas de estoque em
papel ou planilha, com data, solicitante, produto, quantidade e setor. Lancar no
sistema quando ele voltar.

Medio prazo: usar este pacote para subir o aplicativo em outro provedor,
seguindo `07_DEPLOY_E_INFRAESTRUTURA.md`, secao 9.

## 2. O que fazer se o banco ficar indisponivel

O aplicativo abre (pelo cache do aplicativo instalado) mas nao grava nada. Mesmo
procedimento manual acima. Nao tentar "forcar" lancamentos repetidos: pode
duplicar requisicoes quando a conexao voltar.

## 3. Dependencias criticas

| Dependencia | Impacto se cair | Alternativa |
|---|---|---|
| Lovable Cloud (banco e login) | Total | Nenhuma imediata; migrar com este pacote |
| Hospedagem Lovable | Total | Publicar o mesmo codigo em Cloudflare Workers ou host Node |
| Servico de push do navegador | Apenas avisos | Comunicar por WhatsApp |
| WhatsApp | Apenas envio de cotacao | Copiar a lista e enviar por outro canal |
| Fontes Google | Apenas visual | O aplicativo continua legivel |

## 4. Conhecimento concentrado

Todo o conhecimento tecnico estava concentrado no ambiente da plataforma. Este
pacote e a primeira documentacao externa. Recomendacoes:

- Manter ao menos duas pessoas com acesso administrativo.
- Guardar este pacote fora da plataforma.
- Atualizar o pacote a cada mudanca estrutural.

## 5. Pontos unicos de falha

1. Instancia unica de banco para pre-visualizacao e producao — qualquer teste
   mexe em dados reais.
2. Sem copia de dados fora da plataforma.
3. Sem teste de restauracao ja realizado.
4. Chave administrativa do banco inacessivel ao cliente.
5. Sem testes automatizados que detectem regressao antes de publicar.

## 6. Prioridades recomendadas

1. Criar rotina de exportacao periodica dos dados.
2. Executar um teste real de restauracao em projeto separado.
3. Criar um ambiente de homologacao com banco proprio.
4. Revisar a politica de senha/PIN dos operadores.
5. Revogar permissoes amplas de escrita nas tabelas como defesa em profundidade.
