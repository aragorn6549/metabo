import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toActivity } from '@/lib/converters';
import { useAuthStore } from '@/store/authStore';
import type { ActivityRow, ActivityType, ActivitySubtype } from '@/types/db';
import type { Activity } from '@/types/domain';

export const activitiesKey = ['activities'] as const;

async function fetchRange(from: Date, to: Date): Promise<Activity[]> {
  const { data, error } = await supabase.from('activities')
    .select('*').gte('started_at', from.toISOString()).lt('started_at', to.toISOString())
    .order('started_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data as ActivityRow[]).map(toActivity);
}

/** Активности за сегодня */
export function useTodayActivities() {
  const userId = useAuthStore(s => s.user?.id);
  return useQuery({
    queryKey: [...activitiesKey, 'today'],
    queryFn: async () => {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const end = new Date(start); end.setDate(end.getDate() + 1);
      return fetchRange(start, end);
    },
    enabled: !!userId,
  });
}

/** Последние N активностей (лента истории) */
export function useRecentActivities(limit = 30) {
  const userId = useAuthStore(s => s.user?.id);
  return useQuery({
    queryKey: [...activitiesKey, 'recent', limit],
    queryFn: async () => {
      const { data, error } = await supabase.from('activities').select('*')
        .order('started_at', { ascending: false }).limit(limit);
      if (error) throw new Error(error.message);
      return (data as ActivityRow[]).map(toActivity);
    },
    enabled: !!userId,
  });
}

export interface NewActivity {
  type: ActivityType; subtype?: ActivitySubtype; duration?: number;
  calories?: number; hours?: number; quality?: number; timestamp?: number;
}

export function useCreateActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: NewActivity) => {
      const { data, error } = await (supabase.from('activities') as any).insert({
        type: a.type, subtype: a.subtype ?? null,
        duration_min: a.duration ?? null, calories: a.calories ?? null,
        hours: a.hours ?? null, quality: a.quality ?? null,
        started_at: new Date(a.timestamp ?? Date.now()).toISOString(),
      }).select().single();
      if (error) throw new Error(error.message);
      return toActivity(data);
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: activitiesKey }); void qc.invalidateQueries({ queryKey: ['daily_history'] }); },
  });
}

export function useDeleteActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('activities').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: activitiesKey }); void qc.invalidateQueries({ queryKey: ['daily_history'] }); },
  });
}
