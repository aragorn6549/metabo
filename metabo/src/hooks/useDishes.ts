import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, db } from '@/lib/supabase';
import { toDish } from '@/lib/converters';
import { useAuthStore } from '@/store/authStore';
import type { DishRow } from '@/types/db';
import type { Dish } from '@/types/domain';

export const dishesKey = ['dishes'] as const;

export function useDishes() {
  const userId = useAuthStore(s => s.user?.id);
  return useQuery({
    queryKey: dishesKey,
    queryFn: async () => {
      const { data, error } = await db().from('dishes').select('*').order('name');
      if (error) throw new Error(error.message);
      return (data as DishRow[]).map(toDish);
    },
    enabled: !!userId,
  });
}

export interface DishInput { name: string; calories: number; protein: number; fat: number; carbs: number }

/** upsert-логика как в прототипе: совпадение по name (регистронезависимо) → обновление */
export function useSaveDish() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...d }: DishInput & { id?: string }) => {
      if (id) {
        const { error } = await db().from('dishes').update({
          name: d.name, calories: d.calories, protein: d.protein, fat: d.fat, carbs: d.carbs,
        }).eq('id', id);
        if (error) throw new Error(error.message);
        return;
      }
      const { data: existing } = await db().from('dishes').select('*').ilike('name', d.name).maybeSingle();
      if (existing) {
        const { error } = await db().from('dishes').update({
          calories: d.calories, protein: d.protein, fat: d.fat, carbs: d.carbs,
        }).eq('id', existing.id);
        if (error) throw new Error(error.message);
        return;
      }
      const { error } = await db().from('dishes').insert(d);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: dishesKey }),
  });
}

export function useDeleteDish() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db().from('dishes').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: dishesKey }),
  });
}
