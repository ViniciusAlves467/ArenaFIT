# Autenticação — o que o app faz e o que configurar

## Fluxos implementados

| Fluxo | Como funciona no app |
| --- | --- |
| Cadastro com e-mail | Nome, e-mail, senha (8+ caracteres, letras e números) e aceite dos Termos. O Supabase envia um e-mail com **código de 6 dígitos** e um botão. |
| Verificação de e-mail | Tela "Confirme seu e-mail": digitar o código (funciona em qualquer aparelho) ou tocar no botão do e-mail no celular (abre `/auth-callback`). Reenvio com espera de 60 s. |
| Login com conta não confirmada | O app reenvia o código e leva direto à tela de verificação. |
| Esqueci minha senha | Envia um código; na tela seguinte o usuário digita o código e a nova senha. |
| Login com Google | OAuth do Supabase com PKCE: navegador do sistema no celular (Expo Go e APK) e redirecionamento na web. |
| Alterar/criar senha | Configurações → Conta. Quem entrou com Google pode criar uma senha para entrar também por e-mail. |

No **modo demo** todos os fluxos funcionam com o código `123456`.

## Caminho rápido: um comando configura tudo

O script `scripts/configure-auth.mjs` aplica de uma vez as URLs de retorno, o SMTP, os templates em português, as regras de senha/código e o login com Google, usando a API oficial do Supabase. Ele mostra cada mudança antes de aplicar e confere o resultado no final. Você só precisa juntar três credenciais (passo a passo abaixo):

| O que | Onde conseguir | Tempo |
| --- | --- | --- |
| Token de acesso do Supabase | supabase.com/dashboard/account/tokens → *Generate new token* | 1 min |
| Chave SMTP | Resend (resend.com → API Keys) ou Brevo (app.brevo.com → SMTP & API) | 5 min |
| Client ID e Secret do Google | Google Cloud Console (seção 4 abaixo) | 10 min |

Na pasta do projeto, no seu computador:

```bash
npm run configure:auth -- --dry-run
```

```bash
npm run configure:auth
```

O primeiro só mostra o que mudaria; o segundo pergunta as chaves (sem exibi-las na tela), mostra o resumo e pede confirmação. Pode rodar de novo quando quiser — por exemplo, depois de criar as credenciais do Google. Se pular o SMTP ou o Google, o resto é aplicado normalmente.

As seções abaixo explicam cada item, caso prefira configurar pelo painel.

## 1. URLs de retorno (obrigatório)

Supabase → **Authentication → URL Configuration**:

- **Site URL:** `arenafit://auth-callback`
- **Redirect URLs:** `arenafit://auth-callback`, `exp://**` (Expo Go) e `http://localhost:8081/**` (web local)

## 2. SMTP próprio (obrigatório para usuários reais)

O SMTP embutido do Supabase **só entrega e-mails para membros da organização** e tem limite de poucos envios por hora — serve para testar com o seu próprio e-mail, não com colegas ou na banca.

Opções gratuitas:

- **Resend** — 3.000 e-mails/mês (100/dia). Crie a conta, gere uma API key e, se tiver domínio, verifique-o (sem domínio dá para enviar só para o seu e-mail).
- **Brevo** — 300 e-mails/dia, permite remetente sem domínio próprio após verificar o e-mail.

Supabase → **Authentication → Emails → SMTP Settings**: ative *Custom SMTP* e preencha (Resend: host `smtp.resend.com`, porta `465`, usuário `resend`, senha = API key; Brevo: host `smtp-relay.brevo.com`, porta `587`, usuário e senha SMTP do painel). Depois, em **Rate Limits**, aumente *emails sent per hour* para 30.

**Remetente (campo "E-mail remetente" do script / *Sender email* do painel):** precisa ser um endereço de e-mail completo.

- **Resend:** um endereço no domínio que você verificou em *Domains*, por exemplo `nao-responda@seudominio.com.br`. Os nomes que aparecem na tela de DNS (`resend._domainkey`, `send`) são registros para colar no seu provedor de domínio, **não** o remetente. Sem domínio verificado, o Resend só entrega para o e-mail da própria conta Resend.
- **Brevo:** o e-mail que você cadastrou e confirmou em *Senders* (pode ser o seu Gmail). É a opção mais simples para quem não tem domínio, e já serve para colegas e para a banca.

## 3. Templates de e-mail em português

Supabase → **Authentication → Emails → Templates**. Para cada um, cole o HTML de `supabase/templates/`:

| Template | Arquivo | Assunto |
| --- | --- | --- |
| Confirm signup | `confirmation.html` | Seu código de confirmação do ArenaFit |
| Reset password | `recovery.html` | Código para redefinir sua senha do ArenaFit |
| Change email address | `email_change.html` | Confirme seu novo e-mail no ArenaFit |

Os templates mostram o código (`{{ .Token }}`) em destaque — é o que torna a verificação confiável, porque links com `arenafit://` não abrem em todos os clientes de e-mail (Gmail na web, por exemplo).

## 4. Login com Google

**No Google Cloud Console** (console.cloud.google.com):

1. Crie um projeto (ex.: "ArenaFit").
2. **APIs e serviços → Tela de permissão OAuth**: tipo *Externo*, nome "ArenaFit", e-mail de suporte, escopos padrão (`email`, `profile`, `openid`). Enquanto o app estiver em "Teste", adicione os e-mails da equipe e da banca em *Usuários de teste*.
3. **Credenciais → Criar credenciais → ID do cliente OAuth → Aplicativo da Web**.
4. Em *URIs de redirecionamento autorizados* adicione exatamente:
   `https://xainescjcawmvarsjumc.supabase.co/auth/v1/callback`
5. Copie o **Client ID** e o **Client Secret**.

**No Supabase** → **Authentication → Sign In / Providers → Google**: ative, cole Client ID e Secret e salve.

Não é preciso credencial Android: o login passa pelo navegador do sistema e volta ao app pelo deep link. (Um login nativo com o seletor de contas do Android exige build próprio e a biblioteca `@react-native-google-signin` — dá para evoluir depois.)

## Alternativa: tudo por linha de comando

O `supabase/config.toml` já contém as URLs, regras de senha, código de 6 dígitos, templates e o provedor Google. Com a CLI:

```bash
npx supabase login
```

```bash
npx supabase link --project-ref xainescjcawmvarsjumc
```

```bash
export GOOGLE_CLIENT_ID="seu-client-id" GOOGLE_CLIENT_SECRET="seu-secret"
```

```bash
npx supabase config push
```

O comando mostra as diferenças e pede confirmação antes de aplicar. Para o SMTP, descomente o bloco `[auth.email.smtp]` e exporte `SMTP_PASSWORD` antes do push.

## Testando

1. Crie uma conta com um e-mail seu → chega o código → digite no app → segue para o onboarding.
2. Saia, tente entrar sem ter confirmado (com outra conta) → o app leva à verificação.
3. "Esqueci minha senha" → código → nova senha → entra direto.
4. "Continuar com Google" → escolhe a conta → volta ao app logado.

Se algo falhar, veja **Authentication → Logs** no painel do Supabase.
