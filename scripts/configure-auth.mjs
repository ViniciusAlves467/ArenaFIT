#!/usr/bin/env node
/**
 * Configura a autenticação do projeto Supabase do ArenaFit em um passo:
 *   1. URLs de retorno (app, Expo Go e web)
 *   2. SMTP próprio (Resend ou Brevo) + limite de envio
 *   3. Templates de e-mail em português (supabase/templates/*.html)
 *   4. Login com Google
 *   + regras de senha e código de 6 dígitos
 *
 * Usa a Management API oficial (PATCH /v1/projects/{ref}/config/auth).
 * Nada é salvo em disco: as chaves são lidas do ambiente ou digitadas na hora.
 *
 * Uso:  npm run configure:auth            (interativo)
 *       npm run configure:auth -- --dry-run   (só mostra o que mudaria)
 *       npm run configure:auth -- --yes       (não pede confirmação)
 *
 * Variáveis opcionais (para pular as perguntas):
 *   SUPABASE_ACCESS_TOKEN, SMTP_PROVIDER (resend|brevo|none), SMTP_USER, SMTP_PASSWORD,
 *   SMTP_SENDER_EMAIL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? 'xainescjcawmvarsjumc';
const API = process.env.SUPABASE_API_URL ?? 'https://api.supabase.com';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const ASSUME_YES = args.has('--yes');

const SMTP_PRESETS = {
  resend: { host: 'smtp.resend.com', port: 465, user: 'resend', hint: 'API key do Resend (começa com re_)' },
  brevo: { host: 'smtp-relay.brevo.com', port: 587, user: null, hint: 'chave SMTP do Brevo (Configurações → SMTP & API)' },
};

const SECRET_KEYS = new Set(['smtp_pass', 'external_google_secret']);

// ---------------------------------------------------------------------------
// Entrada do usuário
// ---------------------------------------------------------------------------

const isTTY = process.stdin.isTTY;
const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: isTTY });
let muted = false;
const write = rl._writeToOutput?.bind(rl);
if (write) rl._writeToOutput = (s) => (muted && !s.includes('\n') ? undefined : write(s));

// Fila de linhas: funciona tanto digitando no terminal quanto com respostas redirecionadas.
const lines = [];
const waiting = [];
let closed = false;
rl.on('line', (l) => (waiting.length ? waiting.shift()(l) : lines.push(l)));
rl.on('close', () => {
  closed = true;
  while (waiting.length) waiting.shift()('');
});

function ask(question, { secret = false, fallback = '' } = {}) {
  process.stdout.write(question);
  if (secret && isTTY) muted = true;
  return new Promise((resolve) => {
    const done = (answer) => {
      if (muted) {
        muted = false;
        process.stdout.write('\n');
      } else if (!isTTY) process.stdout.write('\n');
      resolve(answer.trim() || fallback);
    };
    if (lines.length) done(lines.shift());
    else if (closed) done('');
    else waiting.push(done);
  });
}

async function value(envName, question, opts) {
  if (process.env[envName]) return process.env[envName];
  return ask(question, opts);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function senderHelp(provider, typed) {
  const lines = [`   ✖ "${typed}" não é um e-mail.`];
  if (/_domainkey|^resend\.|^send\./i.test(typed)) {
    lines.push('     Isso é o nome de um registro DNS do Resend, não o remetente.');
  }
  if (provider === 'resend') {
    lines.push(
      '     Use um endereço no domínio que você verificou no Resend (Domains), ex.: nao-responda@seudominio.com.br',
      '     Sem domínio próprio? Rode de novo escolhendo "brevo": ele aceita seu Gmail como remetente verificado.',
    );
  } else {
    lines.push('     Use o e-mail cadastrado em Senders no Brevo (pode ser o seu Gmail), ex.: voce@gmail.com');
  }
  return lines.join('\n');
}

/** Remetente do SMTP: precisa ser um e-mail de verdade (a API rejeita qualquer outra coisa). */
async function senderEmail(provider) {
  const fromEnv = process.env.SMTP_SENDER_EMAIL?.trim();
  if (fromEnv) {
    if (!EMAIL_RE.test(fromEnv)) throw new Error(`SMTP_SENDER_EMAIL inválido.\n${senderHelp(provider, fromEnv)}`);
    return fromEnv;
  }
  const example = provider === 'resend' ? 'nao-responda@seudominio.com.br' : 'voce@gmail.com';
  for (let attempt = 0; attempt < 3; attempt++) {
    const typed = await ask(`   E-mail remetente (ex.: ${example}): `);
    if (!typed) return '';
    if (EMAIL_RE.test(typed)) return typed;
    console.log(senderHelp(provider, typed));
  }
  throw new Error('Remetente inválido. Nada foi alterado.');
}

/** A API devolve alguns números como texto (ex.: smtp_port); compara pelo valor. */
const sameValue = (a, b) =>
  JSON.stringify(a) === JSON.stringify(b) ||
  (a != null && b != null && typeof a !== 'object' && typeof b !== 'object' && String(a) === String(b));

const mask = (v) => (typeof v === 'string' && v.length > 6 ? `${v.slice(0, 3)}…${v.slice(-2)}` : '••••');
const template = (name) => readFileSync(join(ROOT, 'supabase', 'templates', name), 'utf8');

// ---------------------------------------------------------------------------
// Management API
// ---------------------------------------------------------------------------

async function api(method, token, body) {
  const res = await fetch(`${API}/v1/projects/${PROJECT_REF}/config/auth`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    const hint =
      res.status === 401
        ? ' (token inválido ou expirado)'
        : res.status === 403
          ? ' (sua conta não tem acesso a este projeto)'
          : res.status === 400
            ? ' (a API recusou a alteração inteira — nada foi mudado no projeto)'
            : '';
    throw new Error(`${method} config/auth → HTTP ${res.status}${hint}: ${text.slice(0, 300)}`);
  }
  return text ? JSON.parse(text) : {};
}

// ---------------------------------------------------------------------------

async function main() {
  console.log('\n  ArenaFit · configuração de autenticação do Supabase');
  console.log(`  Projeto: ${PROJECT_REF}${DRY_RUN ? '  (simulação — nada será alterado)' : ''}\n`);

  const token = await value(
    'SUPABASE_ACCESS_TOKEN',
    '1) Token de acesso do Supabase (crie em https://supabase.com/dashboard/account/tokens): ',
    { secret: true },
  );
  if (!token) throw new Error('O token de acesso é obrigatório.');

  process.stdout.write('   Verificando o token… ');
  const current = await api('GET', token);
  console.log('ok\n');

  // --- SMTP ---------------------------------------------------------------
  const provider = (
    await value('SMTP_PROVIDER', '2) Provedor de e-mail [resend / brevo / none] (Enter = resend): ', { fallback: 'resend' })
  ).toLowerCase();
  let smtp = null;
  if (provider !== 'none') {
    const preset = SMTP_PRESETS[provider];
    if (!preset) throw new Error(`Provedor desconhecido: ${provider}`);
    const user = preset.user ?? (await value('SMTP_USER', '   Login SMTP do Brevo (e-mail da conta): '));
    const pass = await value('SMTP_PASSWORD', `   ${preset.hint}: `, { secret: true });
    const sender = await senderEmail(provider);
    if (!user || !pass || !sender) throw new Error('Preencha login, senha/chave e remetente do SMTP, ou escolha "none".');
    smtp = { host: preset.host, port: preset.port, user, pass, sender };
  }

  // --- Google -------------------------------------------------------------
  const googleId = await value('GOOGLE_CLIENT_ID', '\n3) Google Client ID (Enter para pular): ');
  const googleSecret = googleId ? await value('GOOGLE_CLIENT_SECRET', '   Google Client Secret: ', { secret: true }) : '';
  if (googleId && !googleSecret) throw new Error('Informe o Client Secret do Google.');

  // --- Monta a alteração --------------------------------------------------
  const patch = {
    // URLs de retorno (deep links)
    site_url: 'arenafit://auth-callback',
    uri_allow_list: ['arenafit://auth-callback', 'exp://**', 'http://localhost:8081/**'].join(','),
    // Cadastro por e-mail com confirmação e código de 6 dígitos
    external_email_enabled: true,
    mailer_autoconfirm: false,
    mailer_secure_email_change_enabled: true,
    mailer_otp_length: 6,
    mailer_otp_exp: 3600,
    // Senha: 8+ caracteres com letras e números (igual a src/lib/password.ts)
    password_min_length: 8,
    password_required_characters: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ:0123456789',
    // Templates em português
    mailer_subjects_confirmation: 'Seu código de confirmação do ArenaFit',
    mailer_templates_confirmation_content: template('confirmation.html'),
    mailer_subjects_recovery: 'Código para redefinir sua senha do ArenaFit',
    mailer_templates_recovery_content: template('recovery.html'),
    mailer_subjects_email_change: 'Confirme seu novo e-mail no ArenaFit',
    mailer_templates_email_change_content: template('email_change.html'),
  };
  if (smtp) {
    Object.assign(patch, {
      smtp_host: smtp.host,
      smtp_port: String(smtp.port), // a API exige texto
      smtp_user: smtp.user,
      smtp_pass: smtp.pass,
      smtp_admin_email: smtp.sender,
      smtp_sender_name: 'ArenaFit',
      smtp_max_frequency: 60,
      rate_limit_email_sent: 30,
    });
  }
  if (googleId) {
    Object.assign(patch, { external_google_enabled: true, external_google_client_id: googleId, external_google_secret: googleSecret });
  }

  // Só envia campos que a API do projeto reconhece (protege contra mudanças de nome).
  const unknown = Object.keys(patch).filter((k) => !(k in current));
  for (const k of unknown) delete patch[k];

  // --- Resumo ---------------------------------------------------------------
  console.log('\n  Alterações:');
  for (const [k, v] of Object.entries(patch)) {
    const shown = SECRET_KEYS.has(k) ? mask(v) : k.endsWith('_content') ? `(template HTML, ${v.length} caracteres)` : JSON.stringify(v);
    const same = !SECRET_KEYS.has(k) && sameValue(current[k], v);
    console.log(`   ${same ? '=' : '•'} ${k}: ${shown}${same ? '  (já estava assim)' : ''}`);
  }
  if (unknown.length) console.log(`\n   ⚠ Ignorados (a API não reconhece): ${unknown.join(', ')}`);
  if (!smtp) console.log('\n   ⚠ Sem SMTP próprio: e-mails só chegam para membros da sua organização no Supabase.');
  if (!googleId) console.log('   ⚠ Login com Google não configurado (rode de novo quando tiver as credenciais).');

  if (DRY_RUN) {
    console.log('\n  Simulação concluída. Nada foi alterado.\n');
    return;
  }
  if (!ASSUME_YES) {
    const ok = (await ask('\n  Aplicar? [s/N] ')).toLowerCase();
    if (!['s', 'sim', 'y', 'yes'].includes(ok)) {
      console.log('  Cancelado.\n');
      return;
    }
  }

  await api('PATCH', token, patch);
  const after = await api('GET', token);
  const mismatched = Object.keys(patch).filter(
    (k) => !SECRET_KEYS.has(k) && !sameValue(after[k], patch[k]),
  );
  if (mismatched.length) {
    console.log(`\n  ⚠ Aplicado, mas estes campos voltaram diferentes: ${mismatched.join(', ')}`);
  } else {
    console.log('\n  ✔ Autenticação configurada e conferida.');
  }
  console.log('  Próximo passo: crie uma conta no app com um e-mail seu e confira o código.\n');
}

main()
  .catch((e) => {
    console.error(`\n  ✖ ${e.message}\n`);
    process.exitCode = 1;
  })
  .finally(() => rl.close());
