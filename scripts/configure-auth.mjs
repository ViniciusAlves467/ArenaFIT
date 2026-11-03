#!/usr/bin/env node
/**
 * Configura a autenticação do projeto Supabase do ArenaFit: login SOMENTE com Google.
 *   1. URLs de retorno (app, Expo Go e web)
 *   2. Desliga o cadastro/login por e-mail (sem SMTP, sem custo)
 *   3. Liga o provedor Google com o Client ID e o Secret do Google Cloud
 *
 * Usa a Management API oficial (PATCH /v1/projects/{ref}/config/auth).
 * Nada é salvo em disco: as chaves são lidas do ambiente ou digitadas na hora.
 *
 * Uso:  npm run configure:auth                (interativo)
 *       npm run configure:auth -- --dry-run   (só mostra o que mudaria)
 *       npm run configure:auth -- --yes       (não pede confirmação)
 *
 * Variáveis opcionais (para pular as perguntas):
 *   SUPABASE_ACCESS_TOKEN, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 */
import { createInterface } from 'node:readline';

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? 'xainescjcawmvarsjumc';
const API = process.env.SUPABASE_API_URL ?? 'https://api.supabase.com';
const CALLBACK = `https://${PROJECT_REF}.supabase.co/auth/v1/callback`;
const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const ASSUME_YES = args.has('--yes');

const SECRET_KEYS = new Set(['external_google_secret']);

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

function ask(question, { secret = false } = {}) {
  process.stdout.write(question);
  if (secret && isTTY) muted = true;
  return new Promise((resolve) => {
    const done = (answer) => {
      if (muted) {
        muted = false;
        process.stdout.write('\n');
      } else if (!isTTY) process.stdout.write('\n');
      resolve(answer.trim());
    };
    if (lines.length) done(lines.shift());
    else if (closed) done('');
    else waiting.push(done);
  });
}

async function value(envName, question, opts) {
  if (process.env[envName]) return process.env[envName].trim();
  return ask(question, opts);
}

const mask = (v) => (typeof v === 'string' && v.length > 6 ? `${v.slice(0, 3)}…${v.slice(-2)}` : '••••');

/** A API devolve alguns valores em outro tipo (ex.: número como texto); compara pelo valor. */
const sameValue = (a, b) =>
  JSON.stringify(a) === JSON.stringify(b) ||
  (a != null && b != null && typeof a !== 'object' && typeof b !== 'object' && String(a) === String(b));

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
  console.log('\n  ArenaFit · login com Google no Supabase');
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

  console.log(`   No Google Cloud, a credencial "Aplicativo da Web" precisa ter este URI de redirecionamento:\n   ${CALLBACK}\n`);
  const googleId = await value('GOOGLE_CLIENT_ID', '2) Google Client ID (termina com .apps.googleusercontent.com): ');
  if (!googleId) throw new Error('O Client ID do Google é obrigatório: ele será o único jeito de entrar no app.');
  if (!/\.apps\.googleusercontent\.com$/.test(googleId)) {
    throw new Error(`"${googleId}" não parece um Client ID do Google (deve terminar com .apps.googleusercontent.com).`);
  }
  const googleSecret = await value('GOOGLE_CLIENT_SECRET', '   Google Client Secret (começa com GOCSPX-): ', { secret: true });
  if (!googleSecret) throw new Error('Informe o Client Secret do Google.');

  // --- Monta a alteração --------------------------------------------------
  const patch = {
    // URLs de retorno (deep links)
    site_url: 'arenafit://auth-callback',
    uri_allow_list: ['arenafit://auth-callback', 'exp://**', 'http://localhost:8081/**'].join(','),
    // Conta criada no primeiro login com Google
    disable_signup: false,
    // Sem cadastro/login por e-mail: nenhum e-mail é enviado, então não precisa de SMTP
    external_email_enabled: false,
    // Google
    external_google_enabled: true,
    external_google_client_id: googleId,
    external_google_secret: googleSecret,
  };

  // Só envia campos que a API do projeto reconhece (protege contra mudanças de nome).
  const unknown = Object.keys(patch).filter((k) => !(k in current));
  for (const k of unknown) delete patch[k];

  // --- Resumo ---------------------------------------------------------------
  console.log('\n  Alterações:');
  for (const [k, v] of Object.entries(patch)) {
    const shown = SECRET_KEYS.has(k) ? mask(v) : JSON.stringify(v);
    const same = !SECRET_KEYS.has(k) && sameValue(current[k], v);
    console.log(`   ${same ? '=' : '•'} ${k}: ${shown}${same ? '  (já estava assim)' : ''}`);
  }
  if (unknown.length) console.log(`\n   ⚠ Ignorados (a API não reconhece): ${unknown.join(', ')}`);

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
  const mismatched = Object.keys(patch).filter((k) => !SECRET_KEYS.has(k) && !sameValue(after[k], patch[k]));
  if (mismatched.length) {
    console.log(`\n  ⚠ Aplicado, mas estes campos voltaram diferentes: ${mismatched.join(', ')}`);
  } else {
    console.log('\n  ✔ Login com Google configurado e conferido.');
  }
  console.log('  Próximo passo: abra o app e toque em "Continuar com Google".\n');
}

main()
  .catch((e) => {
    console.error(`\n  ✖ ${e.message}\n`);
    process.exitCode = 1;
  })
  .finally(() => rl.close());
