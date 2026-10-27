// Типы Supabase по схеме supabase/migrations/0001_init.sql.
// DECISION: вместо нативного генератора (нужен CLI + реальный проект) типы описаны вручную.
// ВАЖНО: Row-типы объявлены как type-алиасы (не interface) — это обязательное условие,
// чтобы supabase-js v2 корректно выводил типы .select()/.insert()/.update().
// В проде перегенерировать: npx supabase gen types typescript --project-id <id> > src/types/db.ts

export type Gender = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'high' | 'extreme';
export type TargetType = 'weight' | 'fatPercent' | 'musclePercent';
export type ActivityType = 'workout' | 'sleep' | 'other';
export type ActivitySubtype =
  | 'strength' | 'cardio' | 'volleyball' | 'padel' | 'tennis' | 'football' | 'basketball'
  | 'walk' | 'work_sit' | 'work_stand' | 'chill';

/** Совпадает с GoalAssessment из types/domain (снапшот assessGoal(), кладётся в goals.assessment jsonb) */
export type GoalAssessmentJson = {
  isFeasible: boolean;
  verdict: string;
  direction: 'loss' | 'gain' | 'maintain';
  targetType: TargetType;
  targetValue: number;
  targetUnit: string;
  currentValue: number;
  targetDelta: number;
  dailyCalorieAdjustment: number;
  targetCalories: number;
  targetProtein: number;
  targetFat: number;
  targetCarbs: number;
  weeklyRateNeeded: number;
  monthlyRateNeeded: number;
  limitDescription: string;
  realisticDate: string;
  daysAvailable: number;
  originalDate: string;
};

export type Profile = {
  id: string;
  email: string;
  name: string | null;
  age: number | null;
  gender: Gender | null;
  height_cm: number | null;
  activity_level: ActivityLevel | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
};

export type InbodyLog = {
  id: string;
  user_id: string;
  measured_at: string;
  weight_kg: number;
  fat_percent: number;
  muscle_percent: number;
  bmr: number;
  bmi: number | null;
  created_at: string;
};

export type FoodLogRow = {
  id: string;
  user_id: string;
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  consumed_at: string;
  created_at: string;
};

export type ActivityRow = {
  id: string;
  user_id: string;
  type: ActivityType;
  subtype: ActivitySubtype | null;
  duration_min: number | null;
  calories: number | null;
  hours: number | null;
  quality: number | null;
  started_at: string;
  created_at: string;
};

export type DishRow = {
  id: string;
  user_id: string;
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  created_at: string;
};

export type GoalRow = {
  id: string;
  user_id: string;
  target_type: TargetType;
  target_value: number;
  target_date: string; // date
  assessment: GoalAssessmentJson; // jsonb снапшот assessGoal()
  is_active: boolean;
  created_at: string;
};

export type DailyHistoryRow = {
  id: string;
  user_id: string;
  day: string; // date
  weight_kg: number | null;
  fat_percent: number | null;
  muscle_percent: number | null;
  calories_consumed: number | null;
  balance: number | null;
  fat_oxidized: number | null;
  fat_stored: number | null;
  muscle_net: number | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; email: string };
        Update: Partial<Profile>;
      };
      inbody_logs: {
        Row: InbodyLog;
        Insert: Partial<InbodyLog> & Omit<InbodyLog, 'id' | 'created_at'>;
        Update: Partial<InbodyLog>;
      };
      food_logs: {
        Row: FoodLogRow;
        Insert: Partial<FoodLogRow> & Omit<FoodLogRow, 'id' | 'created_at' | 'user_id'>;
        Update: Partial<FoodLogRow>;
      };
      activities: {
        Row: ActivityRow;
        Insert: Partial<ActivityRow> & Omit<ActivityRow, 'id' | 'created_at' | 'user_id'>;
        Update: Partial<ActivityRow>;
      };
      dishes: {
        Row: DishRow;
        Insert: Partial<DishRow> & Omit<DishRow, 'id' | 'created_at' | 'user_id'>;
        Update: Partial<DishRow>;
      };
      goals: {
        Row: GoalRow;
        Insert: Partial<GoalRow> & Omit<GoalRow, 'id' | 'created_at' | 'user_id'>;
        Update: Partial<GoalRow>;
      };
      daily_history: {
        Row: DailyHistoryRow;
        Insert: Partial<DailyHistoryRow> & Omit<DailyHistoryRow, 'id' | 'created_at' | 'user_id'>;
        Update: Partial<DailyHistoryRow>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      seed_demo_data: { Args: { uid: string }; Returns: undefined };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
