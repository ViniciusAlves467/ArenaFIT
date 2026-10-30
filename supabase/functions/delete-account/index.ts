// Edge Function: exclusão da conta e de todos os dados pessoais (LGPD, art. 18, VI).
// Apaga as fotos do Storage e o usuário do Auth; o restante cai por ON DELETE CASCADE.
import { createClient } from 'npm:@supabase/supabase-js@2';

import { corsHeaders, json } from '../_shared/http.ts';

const BUCKET = 'checkin-photos';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Não autenticado' }, 401);
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return json({ error: 'Sessão inválida' }, 401);
  const userId = data.user.id;

  // Grupos dos quais é dono são excluídos junto (cascade em groups.owner_id).
  for (;;) {
    const { data: files } = await admin.storage.from(BUCKET).list(userId, { limit: 100 });
    if (!files?.length) break;
    await admin.storage.from(BUCKET).remove(files.map((f) => `${userId}/${f.name}`));
    if (files.length < 100) break;
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    console.error('deleteUser', deleteError);
    return json({ error: 'Não foi possível excluir a conta' }, 500);
  }
  return json({ ok: true });
});
