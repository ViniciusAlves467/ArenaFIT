import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, type CheckinPayload, type NewGroupInput, type PrivatePatch, type ProfilePatch, type WorkoutTemplateInput } from '@/api';
import { useAuth } from '@/providers/AuthProvider';

export const qk = {
  me: ['me'] as const,
  myGroups: ['groups', 'mine'] as const,
  publicGroups: (q: string) => ['groups', 'public', q] as const,
  group: (id: string) => ['group', id] as const,
  ranking: (id: string) => ['group', id, 'ranking'] as const,
  feed: (id: string) => ['group', id, 'feed'] as const,
  exercises: ['exercises'] as const,
  emoji: ['daily-emoji'] as const,
  checkins: ['checkins', 'mine'] as const,
  cosmetics: ['cosmetics'] as const,
  owned: ['cosmetics', 'owned'] as const,
  achievements: ['achievements'] as const,
  templates: ['templates'] as const,
};

function useSignedIn() {
  return !!useAuth().session;
}

export const useMe = () => useQuery({ queryKey: qk.me, queryFn: api.getMe, enabled: useSignedIn() });
export const useMyGroups = () => useQuery({ queryKey: qk.myGroups, queryFn: api.listMyGroups, enabled: useSignedIn() });
export const usePublicGroups = (q: string) => useQuery({ queryKey: qk.publicGroups(q), queryFn: () => api.listPublicGroups(q) });
export const useGroup = (id: string) => useQuery({ queryKey: qk.group(id), queryFn: () => api.getGroup(id) });
export const useRanking = (id: string) => useQuery({ queryKey: qk.ranking(id), queryFn: () => api.getRanking(id) });
export const useFeed = (id: string) => useQuery({ queryKey: qk.feed(id), queryFn: () => api.getFeed(id) });
export const useExercises = () => useQuery({ queryKey: qk.exercises, queryFn: api.listExercises, staleTime: Infinity });
export const useDailyEmoji = () => useQuery({ queryKey: qk.emoji, queryFn: api.getDailyEmoji, staleTime: 10 * 60_000 });
export const useMyCheckins = () => useQuery({ queryKey: qk.checkins, queryFn: () => api.listMyCheckins(40), enabled: useSignedIn() });
export const useCosmetics = () => useQuery({ queryKey: qk.cosmetics, queryFn: api.listCosmetics, staleTime: 30 * 60_000 });
export const useOwnedCosmetics = () => useQuery({ queryKey: qk.owned, queryFn: api.listOwnedCosmetics });
export const useTemplates = () => useQuery({ queryKey: qk.templates, queryFn: api.listTemplates, enabled: useSignedIn() });
export const useAchievements = () => useQuery({ queryKey: qk.achievements, queryFn: api.listAchievements });

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ profile, priv }: { profile?: ProfilePatch; priv?: PrivatePatch }) => {
      if (priv) await api.updatePrivate(priv);
      if (profile) await api.updateProfile(profile);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.me }),
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NewGroupInput) => api.createGroup(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  });
}

export function useJoinGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (by: { id?: string; code?: string }) => api.joinGroup(by),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  });
}

export function useLeaveGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => api.leaveGroup(groupId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      qc.invalidateQueries({ queryKey: qk.me });
    },
  });
}

export function useVote(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ checkinId, vote }: { checkinId: string; vote: 'approve' | 'reject' | null }) => api.vote(checkinId, groupId, vote),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.feed(groupId) });
      qc.invalidateQueries({ queryKey: qk.ranking(groupId) });
    },
  });
}

export function useSubmitCheckin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CheckinPayload) => api.submitCheckin(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.me });
      qc.invalidateQueries({ queryKey: qk.checkins });
      qc.invalidateQueries({ queryKey: ['groups'] });
      qc.invalidateQueries({ queryKey: ['group'] });
      qc.invalidateQueries({ queryKey: qk.achievements });
    },
  });
}

export function usePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.purchaseCosmetic(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.owned });
      qc.invalidateQueries({ queryKey: qk.me });
    },
  });
}

export function useSaveTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: WorkoutTemplateInput) => api.saveTemplate(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.templates }),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.templates }),
  });
}
