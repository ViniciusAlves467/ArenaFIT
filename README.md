# ArenaFit

Aplicativo mobile (Android) que incentiva a prática de atividade física por meio de gamificação: check-ins com foto, grupos com ranking, XP, níveis, conquistas e cosméticos. Projeto de TCC.

**Stack:** Expo SDK 58 (React Native 0.88) · TypeScript · Expo Router · TanStack Query · Supabase (Postgres, Auth, Storage, Edge Functions).

## Rodando em 1 minuto (modo demo)

Sem nenhuma configuração o app abre em **modo demo**: dados locais em memória, com o **mesmo motor de pontuação** do servidor. Ótimo para desenvolver telas e apresentar.

```bash
npm install
```

```bash
npm start
```

Abra no celular com o app **Expo Go** (QR code no terminal) ou pressione `w` para abrir no navegador. No demo, "Continuar com Google" entra direto numa conta de exemplo.

## Projeto Supabase (já configurado)

O projeto **ArenaFIT** (`xainescjcawmvarsjumc`, São Paulo) já tem o schema, a RLS, os catálogos, o bucket de fotos e as Edge Functions `submit-checkin` e `delete-account` publicados. Para o app usar o banco real, crie `.env.local` a partir do `.env.example`:

```
EXPO_PUBLIC_SUPABASE_URL=https://xainescjcawmvarsjumc.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<Project Settings → API Keys → Publishable key>
```

Sem esse arquivo o app volta ao modo demo.

**Autenticação:** o login é **somente com Google**, sem e-mail/senha. Não há envio de e-mails, então não precisa de SMTP nem de domínio, e não tem custo. Para ativar, crie a credencial no Google Cloud e rode `npm run configure:auth` (passo a passo em [`docs/AUTH.md`](docs/AUTH.md)).

## Testando com a equipe (cada um na sua casa)

O banco e o login estão na nuvem, então cada colega usa a própria conta Google e todos veem os mesmos grupos e rankings. No Google Cloud, adicione o Gmail de cada pessoa em **Google Auth Platform → Público-alvo → Usuários de teste** (ou publique o app).

| Jeito | Para quem | Como |
| --- | --- | --- |
| **APK** (recomendado) | Android | `npx eas-cli@latest build -p android --profile preview` gera um link de download; quem abrir instala o app. Não depende do seu computador ligado. |
| **Expo Go + túnel** | Android e iPhone | Você roda `npx expo start --tunnel` e manda o QR code; funciona só enquanto o seu computador estiver com o servidor aberto. |
| **Cada um roda o projeto** | Quem programa | Clonar o repositório, `npm install`, criar o `.env.local` (ver `.env.example`) e `npx expo start`. |

O perfil `preview` do `eas.json` já embute a URL e a chave publicável do Supabase, então o APK abre no banco real, e não no modo demo. A chave publicável foi feita para ir dentro do app; a proteção dos dados vem da RLS.

## Publicando mudanças no Supabase

Novas migrations e funções podem ser aplicadas com a CLI:

```bash
npx supabase login
```

```bash
npx supabase link --project-ref xainescjcawmvarsjumc
```

```bash
npx supabase db push
```

```bash
npx supabase functions deploy submit-checkin delete-account
```

Desenvolvimento local completo (Docker): `npx supabase start` sobe Postgres/Auth/Storage locais usando `supabase/config.toml`.

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm start` | Servidor de desenvolvimento (Expo Go / web) |
| `npm test` | Testes do motor de pontuação e da validação de check-in (Vitest) |
| `npm run typecheck` | Checagem de tipos |
| `npm run lint` | ESLint (regras do Expo + React Compiler) |
| `npm run configure:auth` | Ativa o login com Google no Supabase e desliga o login por e-mail (ver docs/AUTH.md) |
| `npm run simulate` | Simulação do modelo para o TCC (cold start e distribuição dos bônus — seção 14 do estudo) |
| `npm run build:android` | Build nativo local (requer Android SDK). Para APK na nuvem: `npx eas-cli build -p android` |

## Estrutura

```
src/
  app/                 Telas (Expo Router: cada arquivo é uma rota)
    (auth)/            Boas-vindas com login pelo Google
    onboarding/        Dados corporais + consentimento LGPD, avatar
    (tabs)/            Início, Grupos, Desafios, Perfil
    routines/          Treinos fixos (lista e editor)
    group/  checkin/   Grupo (ranking, feed de validação, configurações do dono), check-in, resultado
    legal/             Termos de Uso e Política de Privacidade
    shop, settings, scoring
  api/                 Contrato da API + implementação Supabase e demo
  components/          Design system (ui/) e componentes de domínio
  hooks/queries.ts     Dados com TanStack Query
  theme/               Tokens (cores, tipografia, espaçamento) e formatação
supabase/
  migrations/          Schema, regras de negócio, RLS e catálogos
  functions/
    _shared/scoring/   Motor de pontuação (TS puro, usado no app e no servidor)
    submit-checkin/    Valida, pontua e grava o check-in
    delete-account/    Exclusão de conta (LGPD)
scripts/               Simulação do modelo de pontuação
docs/                  Arquitetura, pontuação e sugestões
```

Leia também: [`docs/AUTH.md`](docs/AUTH.md) · [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) · [`docs/PONTUACAO.md`](docs/PONTUACAO.md) · [`docs/SUGESTOES.md`](docs/SUGESTOES.md)
