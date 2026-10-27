// Конвертеры Supabase-строк ↔ доменные типы прототипа.
import type { Database, Gender, ActivityLevel } from '@/types/db';
import type {
  Activity, Baseline, DailyHistoryEntry, Dish, FoodLog, Goal, InBodyEntry,
} from '@/types/domain';

type Tables = Database['public']['Tables'];

export const toFoodLog = (r: Tables['food_logs']['Row']): FoodLog => ({
  id: r.id, type: 'food', name: r.name,
  calories: +r.calories || 0, protein: +r.protein || 0,
  fat: +r.fat || 0, carbs: +r.carbs || 0,
  timestamp: new Date(r.consumed_at).getTime(),
});

export const toActivity = (r: Tables['activities']['Row']): Activity => ({
  id: r.id, type: r.type, subtype: r.subtype,
  duration: r.duration_min ?? undefined,
  calories: r.calories != null ? +r.calories : undefined,
  hours: r.hours != null ? +r.hours : undefined,
  quality: r.quality ?? undefined,
  timestamp: new Date(r.started_at).getTime(),
});

export const toDish = (r: Tables['dishes']['Row']): Dish => ({
  id: r.id, name: r.name,
  calories: +r.calories || 0, protein: +r.protein || 0,
  fat: +r.fat || 0, carbs: +r.carbs || 0,
});

export const toInBody = (r: Tables['inbody_logs']['Row']): InBodyEntry => ({
  id: r.id, date: r.measured_at,
  weight: +r.weight_kg, fatPercent: +r.fat_percent,
  musclePercent: +r.muscle_percent, bmr: +r.bmr,
  bmi: r.bmi != null ? +r.bmi : null,
});

export const toDailyHistory = (r: Tables['daily_history']['Row']): DailyHistoryEntry => ({
  date: new Date(r.day + 'T12:00:00').toISOString(),
  weight: +(r.weight_kg ?? 0), fatPercent: +(r.fat_percent ?? 0),
  musclePercent: +(r.muscle_percent ?? 0),
  caloriesConsumed: +(r.calories_consumed ?? 0), balance: +(r.balance ?? 0),
  fatOxidized: r.fat_oxidized != null ? +r.fat_oxidized : null,
  fatStored: r.fat_stored != null ? +r.fat_stored : null,
  muscleNet: r.muscle_net != null ? +r.muscle_net : null,
});

export const toGoal = (r: Tables['goals']['Row']): Goal => ({
  id: r.id, targetType: r.target_type, targetValue: +r.target_value,
  targetDate: r.target_date, assessment: r.assessment as Goal['assessment'],
  createdAt: r.created_at,
});

/** baseline = последний inbody_log + поля профиля (§7.1) */
export const toBaseline = (
  latest: Tables['inbody_logs']['Row'] | undefined,
  profile: Tables['profiles']['Row'] | null,
): Baseline | null => {
  if (!latest || !profile) return null;
  return {
    id: latest.id,
    name: profile.name ?? '',
    age: profile.age ?? 30,
    gender: (profile.gender ?? 'male') as Gender,
    height: +(profile.height_cm ?? 0),
    weight: +latest.weight_kg,
    fatPercent: +latest.fat_percent,
    musclePercent: +latest.muscle_percent,
    activityLevel: (profile.activity_level ?? 'moderate') as ActivityLevel,
    bmr: +latest.bmr,
    bmi: latest.bmi != null ? +latest.bmi : null,
  };
};
