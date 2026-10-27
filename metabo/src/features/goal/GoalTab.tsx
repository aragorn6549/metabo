// GoalTab — форма цели + оценка реалистичности. UI 1:1 с прототипом (§8.5).
import { useMemo, useState } from 'react';
import { NumberInput } from '@/components/NumberInput';
import type { Baseline, Goal, TargetType } from '@/types/domain';
import { assessGoal, computePlan } from '@/math/goal';

type Plan = NonNullable<ReturnType<typeof computePlan>>;

interface Props {
  baseline: Baseline;
  tdee: number;
  goal: Goal | null;
  plan: Plan | null;
  onSetGoal: (g: Goal) => void;
}

export function GoalTab({ baseline, tdee, goal, plan, onSetGoal }: Props) {
  const [targetType, setTargetType] = useState<TargetType>(goal?.targetType || 'weight');
  const [targetValue, setTargetValue] = useState<number | ''>(goal?.targetValue ?? 72);
  const [targetDate, setTargetDate] = useState<string>(() => {
    if (goal?.targetDate) return new Date(goal.targetDate).toISOString().slice(0, 10);
    const d = new Date(); d.setMonth(d.getMonth() + 3); return d.toISOString().slice(0, 10);
  });
  const assessment = useMemo(() => {
    if (targetValue === '' || !targetDate) return null;
    return assessGoal({ targetType, targetValue: +targetValue, targetDate, baseline, tdee });
  }, [targetType, targetValue, targetDate, baseline, tdee]);

  const handleSave = () => {
    if (!assessment) return;
    onSetGoal({
      targetType, targetValue: +targetValue,
      targetDate: new Date(targetDate + 'T12:00:00').toISOString(),
      assessment, createdAt: new Date().toISOString(),
    });
  };

  // план пересчитывается локально для предпросмотра (тот же computePlan, что и в App)
  const previewGoal: Goal | null = assessment
    ? { targetType, targetValue: +targetValue, targetDate: new Date(targetDate + 'T12:00:00').toISOString(), assessment, createdAt: new Date().toISOString() }
    : goal;
  const previewPlan = useMemo(() => computePlan(previewGoal, baseline), [previewGoal, baseline]);
  const shownPlan = (goal && assessment && previewGoal?.createdAt === goal.createdAt) ? plan : previewPlan;

  return (
    <div>
      <div className="goal-section">
        <div className="goal-header">
          <div className="goal-title">🎯 <span>Цель</span></div>
          {goal && <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            {goal.targetValue}{goal.assessment?.targetUnit} к {new Date(goal.targetDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>}
        </div>
        <div className="goal-grid">
          <div className="field"><label>Параметр</label>
            <select value={targetType} onChange={ev => setTargetType(ev.target.value as TargetType)}>
              <option value="weight">Вес (кг)</option>
              <option value="fatPercent">% жира</option>
              <option value="musclePercent">% мышц</option>
            </select></div>
          <div className="field"><label>Значение ({targetType === 'weight' ? 'кг' : '%'})</label>
            <NumberInput value={targetValue} onChange={v => setTargetValue(v)} /></div>
          <div className="field"><label>К дате</label>
            <input type="date" value={targetDate} onChange={ev => setTargetDate(ev.target.value)} /></div>
          <button className="btn goal" onClick={handleSave} style={{ width: 'auto', padding: '14px 24px' }}>Рассчитать</button>
        </div>
        {assessment && (
          <div className={`goal-result ${assessment.isFeasible ? 'feasible' : 'infeasible'}`}>
            <div className="goal-verdict">
              <div className={`verdict-icon ${assessment.isFeasible ? 'ok' : 'warn'}`}>{assessment.isFeasible ? '✓' : '!'}</div>
              <span style={{ color: assessment.isFeasible ? 'var(--muscle-2)' : 'var(--fat)' }}>
                {assessment.isFeasible ? 'Реалистично' : 'Слишком агрессивно'}
              </span>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--muted)' }}>{assessment.verdict}</div>
            <div className="goal-details">
              <div className="goal-detail"><div className="goal-detail-label">Сейчас</div>
                <div className="goal-detail-value">{assessment.currentValue.toFixed(1)}{assessment.targetUnit}</div></div>
              <div className="goal-detail"><div className="goal-detail-label">Цель</div>
                <div className="goal-detail-value goal-color">{assessment.targetValue}{assessment.targetUnit}</div></div>
              <div className="goal-detail"><div className="goal-detail-label">Дневной {assessment.direction === 'loss' ? 'дефицит' : 'профицит'}</div>
                <div className={`goal-detail-value ${assessment.isFeasible ? 'ok' : 'warn'}`}>
                  {assessment.dailyCalorieAdjustment > 0 ? '+' : ''}{assessment.dailyCalorieAdjustment} ккал</div></div>
              <div className="goal-detail"><div className="goal-detail-label">Реалистичная дата</div>
                <div className="goal-detail-value">
                  {assessment.realisticDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}</div></div>
            </div>
            {!assessment.isFeasible && (
              <div className="goal-warning">
                ⚠ {assessment.limitDescription}. Сдвиньте дату на{' '}
                <strong>{assessment.realisticDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>{' '}
                или менее амбициозную цель.
              </div>
            )}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 4 }}>
              <div className="stat-label" style={{ marginBottom: 10 }}>Дневные цели по КБЖУ</div>
              <div className="goal-details">
                <div className="goal-detail"><div className="goal-detail-label">Калории</div>
                  <div className="goal-detail-value goal-color">{assessment.targetCalories} ккал</div></div>
                <div className="goal-detail"><div className="goal-detail-label">Белки</div>
                  <div className="goal-detail-value">{assessment.targetProtein} г</div></div>
                <div className="goal-detail"><div className="goal-detail-label">Жиры</div>
                  <div className="goal-detail-value">{assessment.targetFat} г</div></div>
                <div className="goal-detail"><div className="goal-detail-label">Углеводы</div>
                  <div className="goal-detail-value">{assessment.targetCarbs} г</div></div>
              </div>
            </div>
            {shownPlan && (shownPlan.fatPerDay > 0 || shownPlan.musclePerDay > 0) && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 4 }}>
                <div className="stat-label" style={{ marginBottom: 10 }}>Дневные планы по составу тела</div>
                <div className="goal-details">
                  {shownPlan.fatPerDay > 0 && (
                    <div className="goal-detail"><div className="goal-detail-label">Сжигание жира</div>
                      <div className="goal-detail-value" style={{ color: 'var(--muscle-2)' }}>−{shownPlan.fatPerDay.toFixed(0)} г/день</div></div>
                  )}
                  {shownPlan.musclePerDay > 0 && (
                    <div className="goal-detail"><div className="goal-detail-label">Синтез мышц</div>
                      <div className="goal-detail-value" style={{ color: 'var(--muscle)' }}>+{shownPlan.musclePerDay.toFixed(1)} г/день</div></div>
                  )}
                  <div className="goal-detail"><div className="goal-detail-label">Дней до цели</div>
                    <div className="goal-detail-value">{assessment.daysAvailable}</div></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
