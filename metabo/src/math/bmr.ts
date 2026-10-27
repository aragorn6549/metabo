// Математика MetaBo — скопирована из прототипа 1:1 (readme1.md §6, «не менять»).
import type { ActivityLevel, Gender } from '@/types/db';
import type { Macros } from '@/types/domain';

/** BMR по Mifflin–St Jeor */
export function calculateBMR(w: number, h: number, a: number, g: Gender): number {
  if (!w || !h || !a) return 0;
  const b = 10 * w + 6.25 * h - 5 * a;
  return g === 'male' ? b + 5 : b - 161;
}

/** TEF — термический эффект пищи */
export function calculateTEF(p: number, c: number, f: number): number {
  return p * 4 * 0.3 + c * 4 * 0.1 + f * 9 * 0.03;
}

export const ACTIVITY_COEFFICIENTS: Record<ActivityLevel, number> = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, high: 1.725, extreme: 1.9,
};

export function calculateTDEE(
  bmr: number, level: ActivityLevel, workoutCal: number, m: Macros,
): number {
  const c = ACTIVITY_COEFFICIENTS[level] || 1.375;
  return bmr * c + calculateTEF(m.protein || 0, m.carbs || 0, m.fat || 0) + workoutCal;
}

export const MET_COEFFICIENTS = {
  volleyball: 4.0, padel: 6.0, tennis: 7.0, football: 7.0, basketball: 6.5,
} as const;

export function calcMETCalories(met: number, w: number, min: number): number {
  return Math.round(met * w * (min / 60));
}

export function calcBMI(weight: number, heightCm: number): number {
  if (!weight || !heightCm) return 0;
  return +(weight / Math.pow(heightCm / 100, 2)).toFixed(1);
}
