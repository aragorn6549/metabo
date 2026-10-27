import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, db } from '@/lib/supabase';
import { toGoal } from '@/lib/converters';
import { useAuthStore } from '@/store/authStore';
import type { GoalRow } from '@/types/db';
import type { Goal } from '@/types/domain';

export const goalKey = ['goal'] as const;

/** Одна активная цель (§7.4; partial unique index в БД гарантирует единственность) */
export function useActiveGoal() {
  const userId = useAuthStore(s => s.user?.id);
  return useQuery({
    queryKey: goalKey,
    queryFn: async () => {
      const { data, error } = await db().from('goals').select('*').eq('is_active', true).maybeSingle();
      if (error) throw new Error(error.message);
      return data ? toGoal(data as GoalRow) : null;
    },
    enabled: !!userId,
  });
}

export function useSetGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (g: Goal) => {
      // деактивируем прежнюю, вставляем новую со снапшотом assessment
      await db().from('goals').update({ is_active: false }).eq('is_active', true);
      const { data, error } = await db().from('goals').insert({
        target_type: g.targetType, target_value: g.targetValue,
        target_date: g.targetDate.slice(0, 10), assessment: g.assessment, is_active: true,
      }).select().single();
      if (error) throw new Error(error.message);
      return toGoal(data!);
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: goalKey }); void qc.invalidateQueries({ queryKey: ['daily_history'] }); },
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await db().from('goals').delete().eq('is_active', true);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: goalKey }),
  });
}
