import type { CheckinResult } from '@/api';

/** Passa o resultado do check-in para a tela de resultado sem serializar na URL. */
let last: CheckinResult | null = null;

export const setLastCheckinResult = (r: CheckinResult) => {
  last = r;
};
export const getLastCheckinResult = () => last;
