# Handoff — Anti-Prejuízo (Simulador de Resultados)

Este documento é para onboarding de um novo Claude Code neste projeto. Leia tudo e salve na memória interna antes de qualquer ação.

---

## O que é este projeto

**Nome:** Anti-Prejuízo  
**Repositório:** profit-pathfinder-701  
**Deploy:** Vercel (auto-deploy a partir do branch `main` do GitHub — `ayresmarketing/profit-pathfinder-701`)  
**Usuário:** Samuel Ayres (samuel@ayresmarketing.com) — empreendedor digital, não técnico. Sempre comunica em português e em linguagem simples. Traduz os pedidos para implementações técnicas por conta própria sem pedir esclarecimentos desnecessários.

**Propósito:** Simulador financeiro para empreendedores digitais calcularem lucratividade de funnels de tráfego pago antes de investir. Ajuda a calcular CPA máximo, ROI, ponto de equilíbrio e simular metas.

---

## Stack técnica

| Camada | Tecnologia |
|--------|-----------|
| Framework | React 18 + TypeScript + Vite 8 |
| Estilo | TailwindCSS 3 + shadcn/ui (Radix UI) |
| Animação | Framer Motion |
| Gráficos | Recharts |
| Roteamento | React Router v6 |
| Backend/Auth | Supabase (PostgreSQL + Auth) |
| Estado | React Context (AuthContext + OperationContext) |
| Forms | React Hook Form + Zod |
| Deploy | Vercel |
| Package manager | npm |

---

## Estrutura de pastas relevante

```
src/
  pages/
    Index.tsx          # Dashboard principal (3 abas)
    Login.tsx          # Login e-mail/senha (sem Google OAuth)
    Signup.tsx         # Cadastro e-mail/senha (sem Google OAuth)
  components/
    cadastro/
      ProductRegistration.tsx   # Aba 1: cadastro de produtos
    perpetuo/
      PerpetuoAnalysis.tsx      # Aba 2: análise funil perpétuo
    planning/
      LaunchPlanner.tsx         # Aba 3: planejamento de lançamento
    shared/
      InputField.tsx
      MetricCard.tsx
    ui/                         # shadcn components (não editar diretamente)
  contexts/
    AuthContext.tsx             # Supabase auth state
    OperationContext.tsx        # Estado global de produto/ofertas/tráfego + auto-save no Supabase
  integrations/
    supabase/
      client.ts                 # Cliente Supabase (usa VITE_SUPABASE_* env vars)
      types.ts                  # Types gerados pelo Supabase CLI
  lib/
    calculations.ts             # Engine de cálculos (calcMainProduct, calcFullFunnel, formatBRL, etc.)
supabase/
  config.toml                   # project_id do projeto Supabase ativo
  migrations/                   # SQL de criação do schema (histórico do projeto local)
  RESTORE_SCHEMA.sql            # Script standalone para recriar o schema completo num Supabase novo
vercel.json                     # Config de rewrite SPA da Vercel (/* -> /index.html)
```

---

## Funcionalidades principais

### Aba 1 — Cadastro de Produtos
- Cadastra produto principal com: nome, preço, meta de vendas, impostos (%), taxa de plataforma (% + fixo), comissão coprodutor (%), outros custos
- Adiciona produtos secundários ao funil: Order Bumps, Upsells, Downsells — cada um com taxa de conversão e estrutura de custos própria
- Salva automaticamente no Supabase (debounce 1s produto principal, 1.5s ofertas)

### Aba 2 — Perpétuo (funil contínuo)
- Métricas de tráfego: investimento, CPM, CTR, taxa de conexão, página→checkout, checkout→compra
- Calcula: CPA máximo (produto e funil), receita por cliente, break-even, zonas de saúde
- Projeções ROI (0x a 5x)
- Gráfico de breakdown de custos (pizza) e comparação de receitas (barra)
- Simulador de cenários: meta de lucro, CPA alvo, receita mensal
- Custo por etapa no funil

### Aba 3 — Lançamento Pago
- Configura funil antes do pitch (ingresso) e depois do pitch (produto principal)
- Lotes de vendas (preço, qtd, datas)
- Métricas de tráfego separadas
- Relatório: faturamento bruto/líquido, CPA máximo por fase
- Detalhamento de vendas e faturamento por produto (tabela completa)
- Custo por etapa no funil do lançamento
- Simulador de metas: digita faturamento desejado → retorna ingressos necessários, CPA projetado, investimento necessário, lucro projetado

---

## Banco de dados Supabase

> **Nota (2026-07-22):** o projeto Supabase original (`dbhmjzirzufvprfenwnb`) foi pausado
> por falta de uso. O projeto foi/está sendo migrado para um Supabase novo, de propriedade
> da empresa. O schema abaixo (tabelas, RLS, trigger) é o mesmo dos dois projetos — a versão
> pronta para colar num Supabase novo está em `supabase/RESTORE_SCHEMA.sql`. Ao configurar
> o projeto novo, atualize `supabase/config.toml` (project_id) e as env vars
> `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_PROJECT_ID`
> (`.env.local` + Vercel) com os dados do projeto novo. O `project_id`/URL abaixo refletem
> o projeto original e podem estar desatualizados.

**Projeto:** `dbhmjzirzufvprfenwnb`  
**URL:** `https://dbhmjzirzufvprfenwnb.supabase.co`

### Tabelas

| Tabela | Propósito |
|--------|-----------|
| `profiles` | Perfil do usuário (criado automaticamente no signup via trigger) |
| `subscriptions` | Trial/assinatura (criado automaticamente no signup, 7 dias trial) |
| `products` | Produtos do usuário (principal + ofertas) com todos os campos de custo |
| `funnels` | Funnels do usuário (estrutura, não totalmente usado na UI ainda) |
| `funnel_products` | Junction table funnels ↔ products |

Todas as tabelas têm **Row Level Security** — usuário só acessa os próprios dados.

### Trigger automático no signup
```sql
handle_new_user() → cria profile + subscription (trial 7 dias)
```

---

## Variáveis de ambiente

O projeto usa **APENAS** variáveis com prefixo `VITE_` (obrigatório no Vite para expor ao browser):

```
VITE_SUPABASE_URL=https://dbhmjzirzufvprfenwnb.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiaG1qemlyenVmdnByZmVud25iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1Mjc3MzYsImV4cCI6MjA5MjEwMzczNn0.QXtaKBgxTvipI6nsMLIriRmfXR7F3d5D3Fv9IQGo6Ps
VITE_SUPABASE_PROJECT_ID=dbhmjzirzufvprfenwnb
```

Ficam em `.env.local` (nunca no Git — `.gitignore` bloqueia `.env` e `.env.*`).  
Na Vercel ficam em **Project Settings → Environment Variables**.

---

## MCP configurado neste projeto

Apenas o MCP do Supabase está configurado, em `.claude/settings.json`:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "/opt/homebrew/bin/npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--access-token",
        "sbp_dbe5f8dc308c0e8cbad216a1b1699f7b1ceb61e2"
      ]
    }
  }
}
```

**Como instalar no novo computador:**  
Copie o JSON acima para `.claude/settings.json` na raiz do projeto e reinicie o Claude Code. O npx baixa o pacote automaticamente.

> Atenção: o `command` usa `/opt/homebrew/bin/npx` (macOS com Homebrew). Se o novo computador usar outro caminho, use `which npx` no terminal para descobrir o caminho correto e ajuste.

---

## Regras de trabalho (memória de feedback do usuário)

1. **Sempre fazer `git commit` + `git push` ao terminar qualquer alteração.** A Vercel faz auto-deploy a partir do push no branch `main`.
2. **Quando uma alteração precisar de mudança no Supabase** (nova tabela, coluna, política RLS, trigger), já realize de uma vez usando a API de gerenciamento do Supabase com o access token — não espere o usuário pedir separado.
3. **O usuário comunica em linguagem simples** — "coloca um botão pra X" significa implementar a feature completa com integração ao banco se necessário.
4. **Não usar Google OAuth** — autenticação é somente e-mail/senha.

---

## Como executar localmente

```bash
npm install
npm run dev        # http://localhost:8080
npm run build      # verifica se o build passa antes de commitar
```

---

## Como aplicar SQL no Supabase via API (sem CLI)

```bash
curl -X POST \
  -H "Authorization: Bearer sbp_dbe5f8dc308c0e8cbad216a1b1699f7b1ceb61e2" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"SEU SQL AQUI\"}" \
  "https://api.supabase.com/v1/projects/dbhmjzirzufvprfenwnb/database/query"
```
