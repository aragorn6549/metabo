import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, db } from '@/lib/supabase';
import { toFoodLog } from '@/lib/converters';
import { useAuthStore } from '@/store/authStore';
import type { FoodLogRow } from '@/types/db';
import type { FoodLog } from '@/types/domain';

export const foodLogsKey = ['food_logs'] as const;

async function fetchToday(userId: string): Promise<FoodLog[]> {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 1);
  const { data, error } = await db().from('food_logs')
    .select('*').gte('consumed_at', start.toISOString()).lt('consumed_at', end.toISOString())
    .order('consumed_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data as FoodLogRow[]).map(toFoodLog);
}

/** Приёмы пищи за сегодня (§7.2) */
export function useTodayFoodLogs() {
  const userId = useAuthStore(s => s.user?.id);
  return useQuery({ queryKey: [...foodLogsKey, 'today'], queryFn: () => fetchToday(userId!), enabled: !!userId });
}

/** Все приёмы пищи (журнал) */
export function useAllFoodLogs() {
  const userId = useAuthStore(s => s.user?.id);
  return useQuery({
    queryKey: [...foodLogsKey, 'all'],
    queryFn: async () => {
      const { data, error } = await db().from('food_logs').select('*').order('consumed_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data as FoodLogRow[]).map(toFoodLog);
    },
    enabled: !!userId,
  });
}

export interface NewFoodLog { name: string; calories: number; protein: number; fat: number; carbs: number; timestamp?: number }

export function useCreateFoodLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (log: NewFoodLog) => {
      const { data, error } = await db().from('food_logs').insert({
        name: log.name, calories: log.calories, protein: log.protein, fat: log.fat, carbs: log.carbs,
        consumed_at: new Date(log.timestamp ?? Date.now()).toISOString(),
      }).select().single();
      if (error) throw new Error(error.message);
      return toFoodLog(data!);
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: foodLogsKey }); void qc.invalidateQueries({ queryKey: ['daily_history'] }); },
  });
}

export function useUpdateFoodLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; name?: string; calories?: number; protein?: number; fat?: number; carbs?: number; timestamp?: number }) => {
      const body: Record<string, unknown> = { ...patch };
      if (patch.timestamp != null) body.consumed_at = new Date(patch.timestamp).toISOString();
      delete body.timestamp;
      const { error } = await db().from('food_logs').update(body).eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: foodLogsKey }); void qc.invalidateQueries({ queryKey: ['daily_history'] }); },
  });
}

export function useDeleteFoodLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db().from('food_logs').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: foodLogsKey }); void qc.invalidateQueries({ queryKey: ['daily_history'] }); },
  });
}
