// MetabolismMap — перенос 1:1 из прототипа (§8.2). Формулы интенсивностей не изменены.
import { Body3D } from '@/features/map/Body3D';
import { FAT_HELP, MUSCLE_HELP, MacroRow, ProcessCard } from '@/features/map/ProcessCard';
import { getContextText, type SimResult } from '@/math/simulation';
import { formatSigned } from '@/lib/format';
import type { Activity, FoodLog, Goal } from '@/types/domain';
import { computePlan } from '@/math/goal';

type Plan = NonNullable<ReturnType<typeof computePlan>>;

export interface TodayData {
  tdee: number;
  caloriesConsumed: number;
  balance: number;
  macros: { protein: number; fat: number; carbs: number };
  sleepHours: number;
  hasStrength: boolean;
}

interface Props {
  todayData: TodayData;
  sim: SimResult | null;
  plan: Plan | null;
  hasAnyData: boolean;
  goal: Goal | null;
  foodLogs: FoodLog[];
  activities: Activity[];
  onOpenLogger: () => void;
  onGoToGoal: () => void;
}

export function MetabolismMap({ todayData, sim, plan, hasAnyData, goal,
  foodLogs, activities, onOpenLogger, onGoToGoal }: Props) {
  const { tdee, caloriesConsumed, balance, macros, sleepHours, hasStrength } = todayData;
  const context = sim ? getContextText(foodLogs, activities, new Date()) : 'Загрузка...';
  const targetPlan = goal?.assessment || null;
  const plannedBalance = targetPlan ? targetPlan.dailyCalorieAdjustment : null;

  // Интенсивности свечения — формулы 1:1 из прототипа
  const fatIntensity = sim && sim.currentNetFatFlux > 0
    ? Math.min(0.9, sim.currentNetFatFlux / 1.0) : 0;
  const lipoIntensity = sim && sim.currentNetFatFlux < 0
    ? Math.min(0.9, -sim.currentNetFatFlux / 3.0) : 0;
  const muscleIntensity = sim && sim.currentMuscle > 0
    ? Math.min(0.9, sim.currentMuscle / 0.5) : 0;

  const fatDisplayRate = sim ? -sim.currentNetFatFlux : 0;
  const fatDisplayToday = sim ? -sim.netFatToday : 0;
  const fatPlanDisplay = plan?.fatPerDay ? -plan.fatPerDay : 0;

  const muscleDisplayRate = sim ? sim.currentMuscle : 0;
  const muscleDisplayToday = sim ? sim.muscleToday : 0;
  const musclePlanDisplay = plan?.musclePerDay || 0;

  const sparklineFat = sim ? sim.snapshots.slice(-24).map(s => ({
    hour: s.hour, value: -s.netFatFlux,
  })) : null;
  const sparklineMuscle = sim ? sim.snapshots.slice(-24).map(s => ({
    hour: s.hour, value: s.netMuscle,
  })) : null;

  const fatDetail = sim ? (
    <>
      <span>🔥 окислено сегодня: <strong>{sim.fatOxidized.toFixed(1)}</strong> г</span>
      <span>🔴 отложено сегодня: <strong>{sim.fatStored.toFixed(1)}</strong> г</span>
    </>
  ) : null;

  return (
    <div className="map-layout">
      <div className="map-panel">
        <Body3D fatIntensity={fatIntensity}
          muscleIntensity={muscleIntensity}
          lipogenesisIntensity={lipoIntensity}
          netFatToday={hasAnyData && sim ? sim.netFatToday : 0}
          muscleToday={hasAnyData && sim ? sim.muscleToday : 0} />
        {hasAnyData && sim ? (
          <div className="processes">
            <ProcessCard
              title="Жир · баланс" icon="🔥" color="fat"
              currentDisplayRate={fatDisplayRate}
              todayDisplayValue={fatDisplayToday}
              planDisplayValue={fatPlanDisplay}
              currentHour={sim.currentHour}
              context={context}
              sparklineData={sparklineFat}
              helpContent={FAT_HELP}
              lipolysisRate={sim.currentLipolysis}
              esterificationRate={sim.currentEsterification}
              fatDetail={fatDetail}
            />
            <ProcessCard
              title="Синтез мышц" icon="💪" color="muscle"
              currentDisplayRate={muscleDisplayRate}
              todayDisplayValue={muscleDisplayToday}
              planDisplayValue={musclePlanDisplay}
              currentHour={sim.currentHour}
              context={context}
              sparklineData={sparklineMuscle}
              helpContent={MUSCLE_HELP}
            />
          </div>
        ) : (
          <div style={{ marginTop: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13, maxWidth: 280, position: 'relative', zIndex: 2 }}>
            Добавь еду и тренировки, чтобы увидеть прогноз
          </div>
        )}
      </div>

      <div className="stats-panel">
        <div className="stat-card">
          <div className="stat-label">Энергобаланс</div>
          <div className={`stat-value ${balance < 0 ? 'negative' : balance > 0 ? 'positive' : ''}`}>
            {formatSigned(balance, 0)}<span className="stat-unit">ккал</span>
          </div>
          <div className="stat-sub">
            {balance < 0 ? 'Дефицит' : balance > 0 ? 'Профицит' : 'Поддержание'} ·
            Потреблено {Math.round(caloriesConsumed)} / TDEE {Math.round(tdee)}
          </div>
          {plannedBalance != null && (
            <div className="stat-sub" style={{ borderTop: '1px dashed var(--border)', paddingTop: 8, marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span>🎯 План ({targetPlan!.direction === 'loss' ? 'дефицит' : targetPlan!.direction === 'gain' ? 'профицит' : 'поддерж.'}):</span>
                <strong style={{ color: 'var(--goal)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatSigned(plannedBalance, 0)} ккал
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Норма калорий:</span>
                <strong style={{ color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                  {targetPlan!.targetCalories} ккал
                </strong>
              </div>
            </div>
          )}
        </div>

        <div className="stat-card">
          <div className="stat-label">КБЖУ сегодня {targetPlan && <span style={{ color: 'var(--goal)' }}>· план</span>}</div>
          <MacroRow label="Калории" current={caloriesConsumed}
            planned={targetPlan ? targetPlan.targetCalories : 0}
            color="linear-gradient(90deg,var(--accent),#6366f1)" unit=" ккал" />
          <MacroRow label="Белки" current={macros.protein}
            planned={targetPlan ? targetPlan.targetProtein : 0}
            color="linear-gradient(90deg,var(--muscle),var(--muscle-2))" />
          <MacroRow label="Жиры" current={macros.fat}
            planned={targetPlan ? targetPlan.targetFat : 0}
            color="linear-gradient(90deg,var(--fat),var(--fat-2))" />
          <MacroRow label="Углеводы" current={macros.carbs}
            planned={targetPlan ? targetPlan.targetCarbs : 0}
            color="linear-gradient(90deg,var(--goal),#f59e0b)" />
        </div>

        <div className="stat-card">
          <div className="stat-label">Сон</div>
          <div className="stat-value">{(sleepHours || 0).toFixed(1)}<span className="stat-unit">ч</span></div>
          <div className="stat-sub">
            {sleepHours >= 7 ? '✓ Достаточно' : '⚠ Меньше 7ч'} ·
            {hasStrength ? ' силовая была' : ' без силовой'}
          </div>
        </div>

        {!goal && <button className="btn goal" onClick={onGoToGoal}>🎯 Поставить цель</button>}
        <button className="btn" onClick={onOpenLogger}>+ Добавить активность</button>
      </div>
    </div>
  );
}
