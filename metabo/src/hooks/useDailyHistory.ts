import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, startOfDay, subDays } from 'date-fns';
import { supabase, db } from '@/lib/supabase';
import { toDailyHistory } from '@/lib/converters';
import { useAuthStore } from '@/store/authStore';
import type { DailyHistoryRow } from '@/types/db';
import type { DailyHistoryEntry } from '@/types/domain';

export const historyKey = ['daily_history'] as const;

export function useDailyHistory(days = 90) {
  const userId = useAuthStore(s => s.user?.id);
  return useQuery({
    queryKey: [...historyKey, days],
    queryFn: async () => {
      const from = format(startOfDay(subDays(new Date(), days)), 'yyyy-MM-dd');
      const { data, error } = await db().from('daily_history').select('*')
        .gte('day', from).order('day', { ascending: true });
      if (error) throw new Error(error.message);
      return (data as DailyHistoryRow[]).map(toDailyHistory);
    },
    enabled: !!userId,
  });
}

/** Upsert итога дня (день считается на клиенте через simulateDay — §7.5) */
export function useUpsertDailyHistory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (e: Omit<DailyHistoryEntry, 'date'> & { date: string }) => {
      const day = format(new Date(e.date), 'yyyy-MM-dd');
      const body = {
        day, weight_kg: e.weight, fat_percent: e.fatPercent, muscle_percent: e.musclePercent,
        calories_consumed: e.caloriesConsumed, balance: e.balance,
        fat_oxidized: e.fatOxidized, fat_stored: e.fatStored, muscle_net: e.muscleNet,
      };
      // DECISION: onConflict='user_id,day' соответствует unique-индексу из миграции.
      const { error } = await db().from('daily_history').upsert(body, { onConflict: 'user_id,day' });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: historyKey }),
  });
}
