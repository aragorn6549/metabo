// Константы, перенесённые 1:1 из прототипа MetaBol.txt (§8.2)
import type { ActivityLevel, ActivitySubtype, Gender, TargetType } from '@/types/db';

export const ACTIVITY_LEVELS: { value: ActivityLevel; label: string }[] = [
  { value: 'sedentary', label: 'Минимальная (офис)' },
  { value: 'light', label: 'Лёгкая (1–3 трен/нед)' },
  { value: 'moderate', label: 'Средняя (3–5 трен/нед)' },
  { value: 'high', label: 'Высокая (6–7 трен/нед)' },
  { value: 'extreme', label: 'Очень высокая (атлет)' },
];

export const GENDERS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Мужской' },
  { value: 'female', label: 'Женский' },
];

export const TARGET_TYPES: { value: TargetType; label: string; unit: string }[] = [
  { value: 'weight', label: 'Вес тела', unit: 'кг' },
  { value: 'fatPercent', label: 'Жир', unit: '%' },
  { value: 'musclePercent', label: 'Мышцы', unit: '%' },
];

export interface ActivityPreset {
  subtype: ActivitySubtype;
  label: string;
  icon: string;
  met?: number;          // для расчёта калорий через calcMETCalories
  defaultDuration?: number;
  kind: 'workout' | 'other';
}

export const ACTIVITY_PRESETS: ActivityPreset[] = [
  { subtype: 'strength', label: 'Силовая тренировка', icon: '🏋️', met: 6.0, defaultDuration: 60, kind: 'workout' },
  { subtype: 'cardio', label: 'Кардио', icon: '🏃', met: 8.0, defaultDuration: 40, kind: 'workout' },
  { subtype: 'volleyball', label: 'Волейбол', icon: '🏐', met: 4.0, defaultDuration: 90, kind: 'workout' },
  { subtype: 'padel', label: 'Падл', icon: '🎾', met: 6.0, defaultDuration: 60, kind: 'workout' },
  { subtype: 'tennis', label: 'Теннис', icon: '🎾', met: 7.0, defaultDuration: 60, kind: 'workout' },
  { subtype: 'football', label: 'Футбол', icon: '⚽', met: 7.0, defaultDuration: 60, kind: 'workout' },
  { subtype: 'basketball', label: 'Баскетбол', icon: '🏀', met: 6.5, defaultDuration: 60, kind: 'workout' },
  { subtype: 'walk', label: 'Прогулка', icon: '🚶', met: 3.5, defaultDuration: 30, kind: 'other' },
  { subtype: 'work_sit', label: 'Работа сидя', icon: '💻', met: 1.5, defaultDuration: 120, kind: 'other' },
  { subtype: 'work_stand', label: 'Работа стоя', icon: '🧍', met: 2.0, defaultDuration: 120, kind: 'other' },
  { subtype: 'chill', label: 'Отдых', icon: '🛋️', met: 1.3, defaultDuration: 60, kind: 'other' },
];

export const SLEEP_QUALITY_LABELS = ['Ужасный', 'Плохой', 'Нормальный', 'Хороший', 'Отличный'];

/** Витальные показатели для карточки «Сейчас» */
export interface Vitals {
  bpm: number;
  hrvsdnn: number;
  hrvrmssd: number;
  spo2: number;
  temp: number;
  respiratory: number;
}

/** Симуляция витальных показателей по контексту дня (в прототипе — getVitals) */
export function getVitals(
  hour: number,
  opts: { recentWorkout: boolean; recentMeal: boolean; sleeping: boolean },
): Vitals {
  let bpm = 62;
  if (hour >= 7 && hour < 12) bpm = 68;
  else if (hour >= 12 && hour < 18) bpm = 72;
  else if (hour >= 18 && hour < 23) bpm = 70;
  else bpm = 58; // ночь
  if (opts.sleeping) bpm = Math.min(bpm, 55);
  if (opts.recentWorkout) bpm += 12;
  if (opts.recentMeal) bpm += 5;
  const hrvsdnn = opts.recentWorkout ? 38 : opts.sleeping ? 78 : 58;
  const hrvrmssd = opts.recentWorkout ? 26 : opts.sleeping ? 62 : 42;
  return {
    bpm,
    hrvsdnn,
    hrvrmssd,
    spo2: 98,
    temp: +(36.5 + (opts.recentWorkout ? 0.3 : 0)).toFixed(1),
    respiratory: opts.sleeping ? 12 : 15,
  };
}
