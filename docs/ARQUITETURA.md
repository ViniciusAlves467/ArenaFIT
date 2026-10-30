# Arquitetura

## Visão geral

```
 App (Expo / React Native)                         Supabase
 ┌────────────────────────────┐        ┌──────────────────────────────────────┐
 │ Telas (expo-router)        │        │ Auth (e-mail + Google, PKCE)         │
 │ TanStack Query (cache)     │──────▶ │ Postgres + RLS                       │
 │ api/ (contrato único)      │  REST  │   tabelas, triggers, RPCs            │
 │   ├─ supabase-api.ts       │        │ Storage (bucket privado de fotos)    │
 │   └─ demo-api.ts (offline) │──────▶ │ Edge Function submit-checkin         │
 │ motor de pontuação (TS) ◀──┼─ mesmo │   └─ motor de pontuação (TS)         │
 └────────────────────────────┘ código └──────────────────────────────────────┘
```

O motor de pontuação vive em `supabase/functions/_shared/scoring/` e é **o mesmo código** no app (modo demo e explicações) e no servidor (cálculo oficial). Ele não tem dependências e é coberto por testes que reproduzem todos os exemplos numéricos do estudo.

## Por que Expo + TypeScript + Supabase

| Decisão | Motivo |
| --- | --- |
| **Expo (React Native)** | Câmera, GPS, login Google e build Android prontos; roda no Expo Go sem Android Studio; uma base de código serve Android, iOS e web (útil para apresentar na banca pelo navegador). |
| **TypeScript ponta a ponta** | O mesmo motor de pontuação roda no app e na Edge Function (Deno), sem reimplementar fórmulas. |
| **Supabase** | Postgres de verdade (transações, triggers, RLS), Auth com Google, Storage para fotos e Edge Functions — tudo que o TCC exige, com plano gratuito. A equipe já conhece. |
| **Flutter?** | Seria igualmente viável, mas exigiria Dart no app e TypeScript nas Edge Functions — duas implementações das fórmulas. |
| **Firebase?** | NoSQL dificulta rankings, percentis e consultas estatísticas; Postgres + SQL é muito mais natural para o modelo do TCC. |

## Segurança (o que impede trapaça)

- O cliente **nunca envia pontos/XP**: envia apenas o treino bruto. A Edge Function `submit-checkin` valida, calcula com o motor e grava tudo numa única transação (`record_checkin`, executável só pelo `service_role`).
- Colunas de pontos, XP, moedas, nível e streak não têm permissão de `UPDATE` para o usuário (privilégios por coluna). Compras passam pela RPC `purchase_cosmetic`, que valida saldo e nível.
- RLS em todas as tabelas: grupos privados só são visíveis a membros; dados corporais (`profile_private`) só ao dono; amostras estatísticas e referências só ao servidor.
- Votos: só membros do grupo, nunca no próprio check-in, até 48 h. Um trigger recalcula o status; se reprovado, os pontos saem do ranking e as amostras deixam de alimentar os percentis.
- Um treino pontuado por dia em cada grupo (evita "farm" de check-ins); check-in retroativo só até 36 h.
- Fotos em bucket privado (`<user_id>/arquivo.jpg`), servidas por URL assinada só para quem participa do grupo.

## LGPD

- **Minimização:** coordenadas GPS são coletadas apenas quando um grupo exige e **não são legíveis pela API** — o grupo vê só "local verificado" (`has_location`). Peso/altura/idade/sexo ficam numa tabela separada visível só ao dono.
- **Consentimento:** registrado no onboarding (`terms_accepted_at`), com a finalidade explicada.
- **Portabilidade:** RPC `export_my_data()` (tela Configurações → Exportar meus dados).
- **Eliminação:** Edge Function `delete-account` apaga fotos e o usuário; o restante sai por `ON DELETE CASCADE`.

## Testes realizados

- `npm test` — 43 testes (motor de pontuação + validação do check-in).
- Migrations aplicadas e exercitadas num Postgres 16 com stubs de `auth`/`storage`: cadastro, grupo, check-in, regra de 1 ponto/dia, reprovação e reaprovação por voto, loja, exportação e tentativas de fraude (todas bloqueadas pela RLS).
- Edge Functions checadas com `deno check`; bundle Android exportado com sucesso; telas verificadas na web.

## Pendências técnicas para produção

- Testar as Edge Functions contra um projeto Supabase real (`supabase functions serve`).
- Política de Privacidade e Termos de Uso (texto jurídico) — hoje só referenciados.
- Notificações push (lembrete de treino, voto pendente) com `expo-notifications`.
- Compressão/redimensionamento da foto antes do upload (`expo-image-manipulator`).
- Tela de edição de grupo para o dono e moderação (remover membro).
