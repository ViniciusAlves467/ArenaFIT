# Autenticação — login somente com Google

O ArenaFit entra **apenas com a conta Google**. Não há cadastro com e-mail e senha, então o projeto não envia nenhum e-mail: sem SMTP, sem domínio próprio e sem custo. O Google já garante que o e-mail é verdadeiro, e isso substitui a confirmação de e-mail.

## Como funciona no app

| Etapa | O que acontece |
| --- | --- |
| Boas-vindas | Um único botão, **Continuar com Google**. |
| Primeiro acesso | O Supabase cria a conta com nome e e-mail vindos do Google (trigger `handle_new_user`). O app segue para o onboarding (dados corporais e consentimento LGPD, que registra `terms_accepted_at`). |
| Próximos acessos | Entra direto. A sessão fica salva no aparelho e é renovada automaticamente. |
| Sair / excluir conta | Configurações → Conta → Sair; e Privacidade → Excluir minha conta. |

Por dentro, é o OAuth do Supabase com PKCE: no celular (Expo Go e APK) abre o navegador do sistema e volta ao app pelo deep link; na web, faz um redirecionamento completo para `/auth-callback`.

No **modo demo** (sem `.env.local`), o botão do Google entra direto na conta de exemplo.

## Custo

| Item | Custo |
| --- | --- |
| Login com Google (Google Cloud OAuth) | Gratuito |
| Supabase Auth (plano Free) | Gratuito até 50.000 usuários ativos por mês |
| E-mail/SMTP/domínio | Não usado |

## Configuração (uma vez, uns 10 minutos)

### 1. Credencial no Google Cloud

No [Google Cloud Console](https://console.cloud.google.com):

1. Crie um projeto (ex.: "ArenaFit"). Não precisa cadastrar cartão nem ativar faturamento.
2. **APIs e serviços → Tela de permissão OAuth** (ou "Google Auth Platform"): tipo *Externo*, nome "ArenaFit", seu e-mail de suporte, escopos padrão (`email`, `profile`, `openid`).
3. **Público-alvo:** enquanto o app estiver em *Teste*, só entram os e-mails listados em *Usuários de teste* (até 100). Adicione a equipe e a banca, ou clique em *Publicar app*: com apenas os escopos básicos, normalmente não é exigida verificação.
4. **Credenciais → Criar credenciais → ID do cliente OAuth → Aplicativo da Web**.
5. Em *URIs de redirecionamento autorizados*, adicione exatamente:
   `https://xainescjcawmvarsjumc.supabase.co/auth/v1/callback`
6. Copie o **Client ID** (termina com `.apps.googleusercontent.com`) e o **Client Secret** (começa com `GOCSPX-`).

Não é preciso credencial Android: o login passa pelo navegador do sistema e volta pelo deep link.

### 2. Aplicar no Supabase

Crie um token em [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens) e, na pasta do projeto:

```bash
npm run configure:auth -- --dry-run
```

```bash
npm run configure:auth
```

O primeiro só mostra o que mudaria; o segundo pede o token, o Client ID e o Secret (o token e o Secret não aparecem na tela), mostra o resumo, pede confirmação e confere o resultado. Ele:

- define as URLs de retorno (`arenafit://auth-callback`, `exp://**` para o Expo Go, `http://localhost:8081/**` para a web);
- **desliga** o provedor de e-mail;
- liga o Google com as suas credenciais.

**Pelo painel, se preferir:** Supabase → Authentication → *URL Configuration* (as mesmas URLs acima); *Sign In / Providers* → Email: desativar; Google: ativar e colar Client ID e Secret.

**Pela CLI:** o `supabase/config.toml` já está assim. Com `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` exportados, rode `npx supabase config push`.

## Testando

1. Abra o app → **Continuar com Google** → escolha a conta → volta ao app no onboarding.
2. Complete o onboarding, saia (Configurações → Sair) e entre de novo: deve ir direto para o início.
3. Com outra conta Google, confirme que ela também entra (se o app estiver em *Teste* no Google, ela precisa estar em *Usuários de teste*).

Problemas comuns:

| Mensagem | Causa |
| --- | --- |
| `redirect_uri_mismatch` (tela do Google) | O URI do passo 1.5 não está igual na credencial do Google. |
| "Acesso bloqueado: o app não concluiu o processo de verificação" | O app está em *Teste* e o e-mail não está em *Usuários de teste*. |
| "Login com Google ainda não foi ativado no servidor" | O passo 2 ainda não foi aplicado. |
| Volta ao app mas não entra (Expo Go) | Falta `exp://**` nas Redirect URLs do Supabase. |

Para mais detalhes, veja **Authentication → Logs** no painel do Supabase.
