// §14: эталонные тесты assessGoal — лимиты из прототипа.
import { describe, expect, it } from 'vitest';
import { assessGoal, computePlan } from '@/math/goal';
import { addDays } from 'date-fns';

const baseline = { weight: 90, fatPercent: 25, musclePercent: 45 };
const tdee = 2500;

describe('assessGoal', () => {
  it('сброс 5 кг за 10 недель — реалистично (~0.5 кг/нед)', () => {
    const a = assessGoal({ targetType: 'weight', targetValue: 85, targetDate: addDays(new Date(), 70), baseline, tdee });
    expect(a.isFeasible).toBe(true);
    expect(a.direction).toBe('loss');
    expect(a.weeklyRateNeeded).toBeCloseTo(0.5, 1);
    // дефицит ограничен [−25%, −15%] TDEE
    expect(a.dailyCalorieAdjustment).toBeGreaterThanOrEqual(-tdee * 0.25 - 1);
    expect(a.dailyCalorieAdjustment).toBeLessThanOrEqual(0);
    expect(a.targetCalories).toBe(Math.round(tdee + a.dailyCalorieAdjustment));
    // белок при похудении 2 г/кг
    expect(a.targetProtein).toBe(180);
    expect(a.targetFat).toBe(Math.round((a.targetCalories * 0.25) / 9));
  });

  it('сброс 20 кг за 4 недели — нереалистично, дата скорректирована', () => {
    const a = assessGoal({ targetType: 'weight', targetValue: 70, targetDate: addDays(new Date(), 28), baseline, tdee });
    expect(a.isFeasible).toBe(false);
    expect(new Date(a.realisticDate).getTime()).toBeGreaterThan(new Date(a.originalDate).getTime());
    expect(a.dailyCalorieAdjustment).toBeCloseTo(-tdee * 0.25, 0);
  });

  it('набор 2 кг мышц за месяц при 90 кг — реалистично (лимит 1.5%/мес = 1.35... но 2 кг > лимита → нет)', () => {
    const a = assessGoal({ targetType: 'musclePercent', targetValue: baseline.musclePercent + 2, targetDate: addDays(new Date(), 30), baseline, tdee });
    expect(a.isFeasible).toBe(false); // 1.8 кг/мес > 1.35 кг/мес
    expect(a.dailyCalorieAdjustment).toBe(300);
  });

  it('профицит умеренный: feasible gain даёт +200 ккал', () => {
    const a = assessGoal({ targetType: 'musclePercent', targetValue: baseline.musclePercent + 0.5, targetDate: addDays(new Date(), 60), baseline, tdee });
    expect(a.isFeasible).toBe(true);
    expect(a.dailyCalorieAdjustment).toBe(200);
  });

  it('computePlan: −5 кг за 70 дней → жир ~57 г/день (85%)', () => {
    const assessment = assessGoal({ targetType: 'weight', targetValue: 85, targetDate: addDays(new Date(), 70), baseline, tdee });
    const plan = computePlan({ targetType: 'weight', targetValue: 85, targetDate: '', assessment, createdAt: '' }, { ...baseline, name: '', age: 30, gender: 'male', height: 180, activityLevel: 'moderate', bmr: 1800, bmi: 27.8 } as never);
    expect(plan).not.toBeNull();
    expect(plan!.fatPerDay).toBeGreaterThan(50);
    expect(plan!.fatPerDay).toBeLessThan(65);
    expect(plan!.musclePerDay).toBe(0);
  });
});
