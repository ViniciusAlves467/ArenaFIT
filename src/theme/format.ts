const nf = new Intl.NumberFormat('pt-BR');

export const formatNumber = (n: number) => nf.format(Math.round(n));

export const formatPercent = (ratio: number, digits = 1) =>
  `${(ratio * 100).toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;

export const formatDecimal = (n: number, digits = 1) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });

export function ordinal(n: number) {
  return `${n}º`;
}

export function relativeTime(iso: string, now = new Date()): string {
  const diff = (now.getTime() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  const days = Math.floor(diff / 86400);
  if (days === 1) return 'ontem';
  if (days < 7) return `${days} dias`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function formatPace(durationMin: number, distanceKm: number) {
  if (!(durationMin > 0) || !(distanceKm > 0)) return null;
  const pace = durationMin / distanceKm;
  const min = Math.floor(pace);
  const sec = Math.round((pace - min) * 60);
  return `${min}:${String(sec === 60 ? 0 : sec).padStart(2, '0')} /km`;
}

export function daysLeft(endsOn: string | null, today = new Date()) {
  if (!endsOn) return null;
  const end = new Date(`${endsOn}T23:59:59`);
  return Math.max(0, Math.ceil((end.getTime() - today.getTime()) / 86_400_000));
}

/** Data local no formato YYYY-MM-DD. */
export function localDay(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 5) return 'Boa noite';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}
