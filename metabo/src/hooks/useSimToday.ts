// Дневные итоги: simulateDay за сегодня + сохранение закрытых дней в daily_history (§7.5).
import { useEffect, useRef } from 'react';
import { useUpsertDailyHistory } from '@/hooks/useDailyHistory';
import type { Activity, Baseline, FoodLog } from '@/types/domain';
import { simulateDay, type SimResult } from '@/math/simulation';
import type { TodayData } from '@/features/map/MetabolismMap';

export function useSimToday(foodLogs: FoodLog[], activities: Activity[], balance: number): SimResult | null {
  const simRef = useRef<SimResult | null>(null);
  const depsKey = `${foodLogs.length}:${activities.length}:${balance}`;
  useEffect(() => {
    // пересимуляция при изменении данных (в прототипе — useMemo + tick раз в минуту)
    simRef.current = simulateDay(foodLogs, activities, balance);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsKey]);
  return simulateDay(foodLogs, activities, balance);
}

/** Сохраняет вчерашний день один раз за сессию (день «закрывается» после полуночи). */
export function useSaveYesterday(baseline: Baseline | null, todayData: TodayData | null,
  foodLogs: FoodLog[], activities: Activity[]) {
  const upsert = useUpsertDailyHistory();
  const savedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!baseline || !todayData) return;
    const y = new Date(); y.setDate(y.getDate() - 1); y.setHours(12, 0, 0, 0);
    const dayKey = y.toISOString().slice(0, 10);
    if (savedRef.current === dayKey) return;
    const dayStart = new Date(y); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 86400e3);
    const yFoods = foodLogs.filter(f => f.timestamp >= Number(dayStart) && f.timestamp < Number(dayEnd));
    const yActs = activities.filter(a => a.timestamp >= Number(dayStart) && a.timestamp < Number(dayEnd));
    if (yFoods.length === 0 && yActs.length === 0) return; // нечего сохранять
    savedRef.current = dayKey;
    const wCal = yActs.filter(a => a.type === 'workout').reduce((s, a) => s + (+a.calories || 0), 0);
    const macros = yFoods.reduce((acc, f) => ({
      protein: acc.protein + (+f.protein || 0), fat: acc.fat + (+f.fat || 0), carbs: acc.carbs + (+f.carbs || 0),
    }), { protein: 0, fat: 0, carbs: 0 });
    const calC = yFoods.reduce((s, f) => s + (+f.calories || 0), 0);
    const sleepH = yActs.filter(a => a.type === 'sleep').reduce((s, a) => s + (+a.hours || 0), 0) || 8;
    const tdee = require('@/math/bmr').calculateTDEE(baseline.bmr, baseline.activityLevel, wCal, macros);
    const balance = calC - tdee;
    const sim = simulateDay(yFoods, yActs, balance);
    void upsert.mutateAsync({
      date: dayKey, weight: baseline.weight, fatPercent: baseline.fatPercent,
      musclePercent: baseline.musclePercent, caloriesConsumed: calC, balance,
      fatOxidized: sim.fatOxidized, fatStored: sim.fatStored, muscleNet: Math.max(0, sim.muscleToday),
    }).catch(e => console.warn('save yesterday:', e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseline, todayData, foodLogs, activities]);
}
