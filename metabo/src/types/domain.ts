// Доменные типы (плоские, как в прототипе) — конвертация из строк Supabase в lib/converters.ts
import type { Gender, ActivityLevel, TargetType, ActivitySubtype } from './db';

export interface Macros {
  protein: number;
  fat: number;
  carbs: number;
}

/** Плоский baseline (в терминах прототипа): последний inbody_log + поля профиля */
export interface Baseline {
  id?: string;              // id последнего inbody-замера
  name: string;
  age: number;
  gender: Gender;
  height: number;           // см
  weight: number;           // кг
  fatPercent: number;
  musclePercent: number;
  activityLevel: ActivityLevel;
  bmr: number;
  bmi: number | null;
}

/** Приём пищи в терминах прототипа (timestamp — миллисекунды) */
export interface FoodLog {
  id: string;
  type: 'food';
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  timestamp: number;
}

/** Активность в терминах прототипа */
export interface Activity {
  id: string;
  type: 'workout' | 'sleep' | 'other';
  subtype: ActivitySubtype | null;
  duration?: number;        // мин
  calories?: number;
  hours?: number;
  quality?: number;
  timestamp: number;
}

export type LogEntry = FoodLog | Activity;

export interface Dish {
  id: string;
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface InBodyEntry {
  id: string;
  date: string;             // ISO timestamptz
  weight: number;
  fatPercent: number;
  musclePercent: number;
  bmr: number;
  bmi: number | null;
}

export interface GoalAssessment {
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
  realisticDate: string;    // ISO
  daysAvailable: number;
  originalDate: string;     // ISO
}

export interface Goal {
  id?: string;
  targetType: TargetType;
  targetValue: number;
  targetDate: string;       // ISO
  assessment: GoalAssessment;
  createdAt: string;        // ISO
}

export interface DailyHistoryEntry {
  date: string;             // ISO
  weight: number;
  fatPercent: number;
  musclePercent: number;
  caloriesConsumed: number;
  balance: number;
  fatOxidized: number | null;
  fatStored: number | null;
  muscleNet: number | null;
}
