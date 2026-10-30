import { isSupabaseConfigured } from '@/lib/supabase';

import { demoApi } from './demo-api';
import { supabaseApi } from './supabase-api';
import type { Api } from './types';

export const api: Api = isSupabaseConfigured ? supabaseApi : demoApi;
export const isDemo = api.mode === 'demo';

export * from './types';
