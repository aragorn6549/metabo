import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toBaseline, toInBody } from '@/lib/converters';
import { useAuthStore } from '@/store/authStore';
import { profileKey } from '@/hooks/useProfile';
import type { InbodyLog } from '@/types/db';
import type { Baseline, InBodyEntry } from '@/types/domain';
import { calcBMI, calculateBMR } from '@/math/bmr';

export const inbodyKey = ['inbody_logs'] as const;

export function useInBodyLogs() {
  const userId = useAuthStore(s => s.user?.id);
  return useQuery({
    queryKey: [...inbodyKey, 'all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('inbody_logs').select('*').order('measured_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data as InbodyLog[]).map(toInBody);
    },
    enabled: !!userId,
  });
}

/** baseline = последний замер + профиль (§7.1) */
export function useBaseline(): { baseline: Baseline | null; isLoading: boolean } {
  const logsQ = useInBodyLogs();
  const { data: profile } = useProfileForBaseline();
  if (logsQ.isLoading) return { baseline: null, isLoading: true };
  const latest = logsQ.data?.[logsQ.data.length - 1];
  if (!latest || !profile) return { baseline: null, isLoading: false };
  return {
    baseline: {
      id: latest.id, name: profile.name ?? '', age: profile.age ?? 30,
      gender: profile.gender ?? 'male', height: profile.height_cm ?? 0,
      weight: latest.weight, fatPercent: latest.fatPercent, musclePercent: latest.musclePercent,
      activityLevel: profile.activity_level ?? 'moderate', bmr: latest.bmr, bmi: latest.bmi,
    },
    isLoading: false,
  };
}

// отдельный лёгкий запрос профиля (без импорта хука, чтобы не циклить ключи)
import { useQuery as useQ } from '@tanstack/react-query';
import type { Profile } from '@/types/db';
function useProfileForBaseline() {
  const userId = useAuthStore(s => s.user?.id);
  return useQ({
    queryKey: profileKey,
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId!).maybeSingle();
      return (data ?? null) as Profile | null;
    },
    enabled: !!userId,
  });
}

export interface NewInBody { date: string; weight: number; fatPercent: number; musclePercent: number }

export function useCreateInBodyLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (e: NewInBody) => {
      const { data: profile } = await supabase.from('profiles').select('*').single();
      if (!profile) throw new Error('Профиль не найден');
      const p = profile as unknown as Profile;
      const bmr = Math.round(calculateBMR(e.weight, p.height_cm ?? 0, p.age ?? 30, p.gender ?? 'male'));
      const bmi = calcBMI(e.weight, p.height_cm ?? 0);
      const { data, error } = await (supabase.from('inbody_logs') as any).insert({
        measured_at: new Date(e.date).toISOString(),
        weight_kg: e.weight, fat_percent: e.fatPercent, muscle_percent: e.musclePercent,
        bmr, bmi,
      }).select().single();
      if (error) throw new Error(error.message);
      return toInBody(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: inbodyKey });
      void qc.invalidateQueries({ queryKey: ['daily_history'] });
    },
  });
}

export function useUpdateInBodyLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...e }: NewInBody & { id: string }) => {
      const { error } = await (supabase.from('inbody_logs') as any).update({
        measured_at: new Date(e.date).toISOString(),
        weight_kg: e.weight, fat_percent: e.fatPercent, muscle_percent: e.musclePercent,
      }).eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: inbodyKey }),
  });
}

export function useDeleteInBodyLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('inbody_logs').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: inbodyKey }),
  });
}
void toBaseline;
