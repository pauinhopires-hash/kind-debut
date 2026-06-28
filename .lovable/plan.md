## Objetivo

Permitir instalar o app "Misturaria Fina Mezcla" no desktop (Windows, Mac, Linux) e também no celular, com ícone próprio, abrindo em janela sem barra do navegador. Sem modo offline — quando aberto precisa de internet, igual hoje.

## O que muda para você

- No Chrome/Edge aparece um botão "Instalar" na barra de endereço.
- Depois de instalado, vira um ícone no menu/área de trabalho.
- Abre em janela própria, em tela cheia, parecendo um programa nativo.
- Continua sendo o mesmo app (mesmo banco, mesmo login, mesmas telas) — só muda a forma de abrir.

## O que será feito (técnico)

1. Criar `public/manifest.webmanifest` com nome, cores (laranja `#E8650A` / fundo `#0A0A0A`), `display: standalone`, `start_url: /`.
2. Gerar ícones do app (192x192, 512x512, 512x512 maskable) em `public/` a partir da identidade visual atual.
3. Adicionar no `src/routes/__root.tsx` os links de `manifest`, `theme-color` e `apple-touch-icon` no `head()`.
4. **Não** adicionar service worker, nem `vite-plugin-pwa`, nem modo offline (você não pediu, e isso evita problemas de cache que travam atualizações).

## O que NÃO muda

- Nada do backend, login, requisições, estoque, papéis, telas atuais.
- O app continua acessível normalmente pelo navegador para quem não quiser instalar.
- A versão publicada continua atualizando sozinha a cada deploy.

## Como instalar depois de pronto

- **Desktop (Chrome/Edge):** abrir o app → ícone de instalar na barra de endereço (ou menu ⋮ → "Instalar Misturaria...").
- **Android:** menu do Chrome → "Adicionar à tela inicial".
- **iPhone/iPad:** Safari → compartilhar → "Adicionar à Tela de Início".
