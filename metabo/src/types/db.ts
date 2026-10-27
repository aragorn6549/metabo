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
  Relationships: [{ foreignKeyName: 'profiles_id_fkey'; columns: ['id']; isOneToOne: false; referencedRelation: 'users'; referencedColumns: ['id'] }];
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
  Relationships: [{ foreignKeyName: 'inbody_logs_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'users'; referencedColumns: ['id'] }];
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
  Relationships: [{ foreignKeyName: 'food_logs_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'users'; referencedColumns: ['id'] }];
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
  Relationships: [{ foreignKeyName: 'activities_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'users'; referencedColumns: ['id'] }];
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
  Relationships: [{ foreignKeyName: 'dishes_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'users'; referencedColumns: ['id'] }];
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
  Relationships: [{ foreignKeyName: 'goals_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'users'; referencedColumns: ['id'] }];
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
  Relationships: [{ foreignKeyName: 'daily_history_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'users'; referencedColumns: ['id'] }];
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

// DECISION: supabase-js v2.109 требует маркер __InternalSupabase (см. postgrest-js/dist/cjs/types.d.ts) —
// без него все Insert/Update выводятся как never.
export type Database = {
  __InternalSupabase: { PostgrestVersion: '12' };
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: { id?: string; email?: string; name?: string | null; age?: number | null; gender?: Gender | null; height_cm?: number | null; activity_level?: ActivityLevel | null; is_demo?: boolean };
        Update: { name?: string | null; age?: number | null; gender?: Gender | null; height_cm?: number | null; activity_level?: ActivityLevel | null; is_demo?: boolean };
      };
      inbody_logs: {
        Row: InbodyLog;
        Insert: { user_id?: string; measured_at: string; weight_kg: number; fat_percent: number; muscle_percent: number; bmr: number; bmi?: number | null };
        // DECISION: Update-типы — только изменяемые поля (без id/user_id/created_at),
        // иначе supabase-js выводит never для .update(Partial<Row>).
        Update: { measured_at?: string; weight_kg?: number; fat_percent?: number; muscle_percent?: number; bmr?: number; bmi?: number | null };
      };
      food_logs: {
        Row: FoodLogRow;
        Insert: Omit<FoodLogRow, 'id' | 'created_at' | 'user_id'> & { user_id?: string };
        Update: { name?: string; calories?: number; protein?: number; fat?: number; carbs?: number; consumed_at?: string };
      };
      activities: {
        Row: ActivityRow;
        Insert: Omit<ActivityRow, 'id' | 'created_at' | 'user_id'> & { user_id?: string };
        Update: { type?: ActivityType; subtype?: ActivitySubtype | null; duration_min?: number | null; calories?: number | null; hours?: number | null; quality?: number | null; started_at?: string };
      };
      dishes: {
        Row: DishRow;
        Insert: Omit<DishRow, 'id' | 'created_at' | 'user_id'> & { user_id?: string };
        Update: { name?: string; calories?: number; protein?: number; fat?: number; carbs?: number };
      };
      goals: {
        Row: GoalRow;
        Insert: Omit<GoalRow, 'id' | 'created_at' | 'user_id'> & { user_id?: string };
        Update: { target_type?: TargetType; target_value?: number; target_date?: string; assessment?: GoalAssessmentJson; is_active?: boolean };
      };
      daily_history: {
        Row: DailyHistoryRow;
        Insert: Omit<DailyHistoryRow, 'id' | 'created_at' | 'user_id'> & { user_id?: string };
        Update: { day?: string; weight_kg?: number | null; fat_percent?: number | null; muscle_percent?: number | null; calories_consumed?: number | null; balance?: number | null; fat_oxidized?: number | null; fat_stored?: number | null; muscle_net?: number | null };
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
