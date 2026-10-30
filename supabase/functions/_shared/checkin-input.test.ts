import { describe, expect, it } from 'vitest';

import { checkGroupRequirements, validateCheckinPayload } from './checkin-input.ts';

const userId = '11111111-1111-1111-1111-111111111111';
const now = new Date('2026-10-30T12:00:00Z');
const groupId = '22222222-2222-2222-2222-222222222222';

describe('validateCheckinPayload', () => {
  it('aceita um treino de musculação válido', () => {
    const r = validateCheckinPayload(
      { type: 'strength', title: ' Peito ', exercises: [{ exerciseId: 'bench_press_barbell', sets: [{ loadKg: 60, reps: 8 }] }], groupIds: [groupId, groupId] },
      { userId, now },
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.title).toBe('Peito');
      expect(r.value.groupIds).toEqual([groupId]);
    }
  });

  it('exige duração e distância no cardio', () => {
    const r = validateCheckinPayload({ type: 'run' }, { userId, now });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toHaveLength(2);
  });

  it('rejeita foto fora da pasta do usuário', () => {
    const r = validateCheckinPayload({ type: 'rest', photoPath: 'outro-usuario/foto.jpg' }, { userId, now });
    expect(r.ok).toBe(false);
  });

  it('rejeita check-in retroativo além de 36 h e no futuro', () => {
    const old = validateCheckinPayload({ type: 'rest', performedAt: '2026-10-28T00:00:00Z' }, { userId, now });
    const future = validateCheckinPayload({ type: 'rest', performedAt: '2026-10-30T13:00:00Z' }, { userId, now });
    expect(old.ok).toBe(false);
    expect(future.ok).toBe(false);
  });

  it('rejeita repetições não inteiras e carga fora do limite', () => {
    const r = validateCheckinPayload(
      { type: 'strength', exercises: [{ exerciseId: 'x', sets: [{ loadKg: 900, reps: 7.5 }] }] },
      { userId, now },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toHaveLength(2);
  });
});

describe('checkGroupRequirements', () => {
  const group = { id: groupId, name: 'Turma', require_photo: true, require_location: true };

  it('exige foto, emoji do dia e localização', () => {
    expect(checkGroupRequirements({ type: 'rest' }, [group], '🤘')).toHaveLength(3);
  });

  it('passa quando tudo foi enviado', () => {
    const payload = { type: 'rest' as const, photoPath: `${userId}/a.jpg`, emoji: '🤘', location: { lat: -23.5, lng: -46.6 } };
    expect(checkGroupRequirements(payload, [group], '🤘')).toEqual([]);
  });
});

describe('variantes e elevação', () => {
  it('ciclismo assume "road" por padrão e aceita elevação', () => {
    const r = validateCheckinPayload({ type: 'cycle', durationMin: 60, distanceKm: 25, elevationM: 300 }, { userId, now });
    expect(r.ok && r.value.variant).toBe('road');
    expect(r.ok && r.value.elevationM).toBe(300);
  });

  it('rejeita variante de outra modalidade e elevação fora do ciclismo', () => {
    expect(validateCheckinPayload({ type: 'swim', durationMin: 30, distanceKm: 1, variant: 'road' }, { userId, now }).ok).toBe(false);
    expect(validateCheckinPayload({ type: 'run', durationMin: 30, distanceKm: 5, elevationM: 100 }, { userId, now }).ok).toBe(false);
  });
});
