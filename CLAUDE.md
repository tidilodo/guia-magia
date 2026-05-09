# CLAUDE.md — Guia de Magia Atual

## Comandos

```bash
npm run dev      # dev em http://localhost:5173
npm run build    # build → dist/
npm run preview  # preview do build
```

Deploy automático no Vercel a cada push para main.

## Arquitetura

Multi-page Vite app (vanilla JS). Páginas:

| Página | Propósito |
|--------|-----------|
| `index.html` | Landing page de vendas |
| `obrigado.html` | Pós-pagamento (verifica status do MP) |
| `sucesso.html` | Confirmação visual + links dos PDFs |

### Fluxo completo

```
index.html
  └─ botão comprar → POST /api/criar-pagamento → redirect Mercado Pago
       └─ aprovado → /obrigado.html?status=approved → /sucesso.html
       └─ webhook MP → /api/webhook → Resend envia email com PDFs
```

### API (Vercel Serverless Functions)

- **`api/criar-pagamento.js`** — cria preferência MP, retorna `init_point`
- **`api/webhook.js`** — recebe notificação MP, chama Resend para enviar email com PDFs

### Conteúdo dos PDFs (`conteudo/`)

| Arquivo | PDF |
|---------|-----|
| `PDF0_FUNDAMENTOS.md` | Bônus — Fundamentos da Magia Atual |
| `PDF1_FOGO.md` | PDF 01 — Fogo: A Chama que Transforma |
| `PDF2_AGUA.md` | PDF 02 — Água: O Fluxo que Cura |
| `PDF3_TERRA.md` | PDF 03 — Terra: A Força que Sustenta |
| `PDF4_AR.md` | PDF 04 — Ar: A Voz que Manifesta |

Os PDFs finais (gerados no Canva a partir do markdown) ficam em `public/pdfs/`.

### Variáveis de ambiente (Vercel)

| Variável | Valor |
|----------|-------|
| `MP_ACCESS_TOKEN` | Token de produção Mercado Pago (APP_USR-...) |
| `APP_URL` | URL do Vercel (ex: https://guia-magia.vercel.app) |
| `RESEND_API_KEY` | Chave da API Resend para envio de emails |
| `SHEETS_URL` | URL do Google Apps Script (opcional — log de vendas) |

### Entrega dos PDFs

Os PDFs são servidos diretamente como arquivos estáticos em `public/pdfs/`:
- `public/pdfs/fundamentos.pdf`
- `public/pdfs/fogo.pdf`
- `public/pdfs/agua.pdf`
- `public/pdfs/terra.pdf`
- `public/pdfs/ar.pdf`

O webhook envia links para esses arquivos no email. Os links são públicos mas obscuros (sem listagem de diretório).

### Identidade visual

- **Marca:** Guilda da Fonte
- **Produto:** Guia de Magia Atual — Box dos 4 Elementos
- **Paleta:** preto profundo (#0a0608), dourado (#c9913a / #e8b96a), creme (#f5ede0)
- **Tipografia:** Cinzel Decorative (títulos), Cinzel (subtítulos), Inter (corpo)
- **Elementos:** 🔥 Fogo (#e85d2a), 💧 Água (#3a7abf), 🌿 Terra (#6b8c3a), 🌬 Ar (#a08cc8)

### Preços

| Plano | Valor | Conteúdo |
|-------|-------|----------|
| `basico` | R$37 | Box dos 4 Elementos (5 PDFs) |
| `completo` | R$97 | Box + guia personalizado + suporte WPP 30 dias + calendário lunar |

### Contato

WhatsApp Guilda da Fonte: +55 62 99203-8987 → `wa.me/5562992038987`

## Deploy

1. Criar repositório GitHub e fazer push
2. Conectar ao Vercel (import project)
3. Adicionar variáveis de ambiente no Vercel
4. Converter markdowns em PDFs no Canva e fazer upload em `public/pdfs/`
5. Configurar domínio customizado (opcional)
