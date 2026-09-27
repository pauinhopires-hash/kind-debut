# Pacote Tecnico — Misturaria Fina Mezcla · Compras e Estoque

Documentacao completa do aplicativo, gerada em 2026-09-27 a partir do codigo e
do banco em uso. Nao contem nenhum dado real nem nenhuma credencial.

## Por onde comecar

| Quem voce e | Leia |
|---|---|
| Funcionario | `11_MANUAL_FUNCIONARIO.md` |
| Gestor / comprador | `12_MANUAL_GESTOR.md` |
| Administrador | `13_MANUAL_ADMINISTRADOR.md` |
| Tecnico / desenvolvedor | `14_MANUAL_TECNICO.md`, depois `02_CODIGO_FONTE/` e `03_BANCO_DE_DADOS/` |
| Quem vai migrar de provedor | `07_DEPLOY_E_INFRAESTRUTURA.md` (secao 9) |
| Quem quer o panorama de riscos | `10_SEGURANCA_E_PRIVACIDADE.md` e `15_INVENTARIO_FINAL.md` |

## Indice

| Pasta / arquivo | Conteudo |
|---|---|
| `01_IDENTIDADE_DO_PRODUTO.md` | O que e o produto, para quem, o que faz e o que nao faz |
| `02_CODIGO_FONTE/` | Codigo completo, dependencias, comandos, estrutura, modelo de `.env` |
| `03_BANCO_DE_DADOS/` | Estado atual, estrutura, funcoes, dicionario, permissoes, migracoes, dados ficticios |
| `04_LOGIN_E_PERMISSOES.md` | Como se entra no sistema e quem pode o que |
| `05_FLUXOS_OPERACIONAIS.md` | Passo a passo de cada operacao, com mensagens e falhas |
| `06_INTEGRACOES.md` | Backend, notificacoes, WhatsApp, planilha, aplicativo instalavel |
| `07_DEPLOY_E_INFRAESTRUTURA.md` | Onde roda, como publicar, como migrar |
| `08_BACKUP_E_RESTAURACAO.md` | O que salvar e como restaurar |
| `PLANO_DE_ROLLBACK.md` | Como voltar atras quando algo quebra |
| `PLANO_DE_CONTINUIDADE.md` | O que fazer se o sistema ficar indisponivel |
| `09_TESTES/` | O que foi testado, o que nao foi e por que |
| `10_SEGURANCA_E_PRIVACIDADE.md` | Dados tratados, protecoes, riscos abertos |
| `11` a `14` | Manuais por publico |
| `15_INVENTARIO_FINAL.md` | Inventario item a item e relatorio final |
| `MANIFESTO_DO_PACOTE.json` | Metadados do pacote |

## Classificacoes usadas

COMPROVADO · NAO COMPROVADO · NAO IDENTIFICADO · FUNCIONANDO · NAO TESTADO ·
PENDENTE · BLOQUEADO.
