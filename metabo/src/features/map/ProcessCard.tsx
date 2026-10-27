// ProcessCard + MacroRow + FAT_HELP/MUSCLE_HELP — перенос 1:1 из прототипа (§8.2).
import { useEffect, useState, type ReactNode } from 'react';
import { formatTimer } from '@/lib/format';
import { MiniSparkline } from '@/features/map/Body3D';

interface ProcessCardProps {
  title: string;
  icon: string;
  color: 'fat' | 'muscle';
  currentDisplayRate: number;
  todayDisplayValue: number;
  planDisplayValue: number;
  currentHour: number;
  context: string;
  sparklineData?: { hour: number; value: number }[] | null;
  helpContent?: ReactNode;
  lipolysisRate?: number;
  esterificationRate?: number;
  fatDetail?: ReactNode;
}

export function ProcessCard({
  title, icon, color,
  currentDisplayRate, todayDisplayValue, planDisplayValue,
  currentHour, context, sparklineData, helpContent,
  lipolysisRate, esterificationRate, fatDetail,
}: ProcessCardProps) {
  const [showHelp, setShowHelp] = useState(false);
  const [secondsToNextHour, setSecondsToNextHour] = useState(() => {
    const now = new Date();
    return 3600 - ((now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) % 3600);
  });

  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date();
      setSecondsToNextHour(3600 - ((now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) % 3600));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const isFat = color === 'fat';
  const hasPlan = planDisplayValue !== 0;

  let isGood, isBad;
  if (isFat) {
    isGood = currentDisplayRate < -0.05;
    isBad = currentDisplayRate > 0.05;
  } else {
    isGood = currentDisplayRate > 0.05;
    isBad = currentDisplayRate < -0.05;
  }

  let rateBadge: { label: string; color: string }, rateColor: string, barClass: string;
  if (isFat) {
    if (currentDisplayRate < -1.0) {
      rateColor = 'var(--muscle-2)';
      rateBadge = { label: '▼▼ сжигание', color: 'var(--muscle-2)' };
    } else if (currentDisplayRate < -0.05) {
      rateColor = 'var(--muscle-2)';
      rateBadge = { label: '▼ сжигание', color: 'var(--muscle-2)' };
    } else if (currentDisplayRate <= 0.05) {
      rateColor = 'var(--muted)';
      rateBadge = { label: '● баланс', color: 'var(--muted)' };
    } else if (currentDisplayRate < 1.0) {
      rateColor = 'var(--lipo)';
      rateBadge = { label: '▲ накопление', color: 'var(--lipo)' };
    } else {
      rateColor = 'var(--lipo-2)';
      rateBadge = { label: '▲▲ хранение', color: 'var(--lipo-2)' };
    }
    barClass = isGood ? 'good' : isBad ? 'bad' : 'neutral';
  } else {
    if (currentDisplayRate > 0.2) {
      rateColor = 'var(--muscle-2)';
      rateBadge = { label: '▲ синтез', color: 'var(--muscle-2)' };
    } else if (currentDisplayRate > 0) {
      rateColor = 'var(--muscle)';
      rateBadge = { label: '● баланс', color: 'var(--muscle)' };
    } else {
      rateColor = 'var(--fat)';
      rateBadge = { label: '▼ катаболизм', color: 'var(--fat)' };
    }
    barClass = isGood ? 'good' : isBad ? 'bad' : 'neutral';
  }

  let status: { label: string; color: string } | null = null;
  let progressPct = 0;
  let expectedDisplay = 0;
  if (hasPlan) {
    const planProgress = Math.abs(todayDisplayValue) / Math.abs(planDisplayValue);
    const timeProgress = currentHour / 24;
    const diff = planProgress - timeProgress;
    if (todayDisplayValue * planDisplayValue < 0) {
      status = { label: '⏱ отставание', color: 'var(--fat)' };
    } else if (diff > 0.05) {
      status = { label: '✓ опережение', color: 'var(--muscle-2)' };
    } else if (diff < -0.05) {
      status = { label: '⏱ отставание', color: 'var(--fat)' };
    } else {
      status = { label: '● в графике', color: 'var(--goal)' };
    }
    progressPct = Math.min(120, planProgress * 100);
    expectedDisplay = planDisplayValue * timeProgress;
  }

  const displayRate = (currentDisplayRate >= 0 ? '+' : '−') + Math.abs(currentDisplayRate).toFixed(2);
  const todayAbs = Math.abs(todayDisplayValue);
  let todayLabel: string;
  if (isFat) {
    todayLabel = todayDisplayValue < 0 ? 'сожжено' : todayDisplayValue > 0 ? 'накоплено' : 'баланс';
  } else {
    todayLabel = todayDisplayValue > 0 ? 'синтез' : todayDisplayValue < 0 ? 'распад' : 'баланс';
  }
  const planDisplayStr = hasPlan
    ? `${planDisplayValue > 0 ? '+' : '−'}${Math.abs(planDisplayValue).toFixed(0)} г/день`
    : null;

  return (
    <div className="process-card">
      <div className="process-card-header">
        <div className="process-card-title">
          <span className="process-card-icon">{icon}</span>
          <span style={{ color: rateColor }}>{title}</span>
          {helpContent && (
            <button className="process-help-btn" onClick={() => setShowHelp(s => !s)}
              title="Что влияет на баланс?" aria-label="Справка">
              {showHelp ? '×' : '?'}
            </button>
          )}
        </div>
        <span className="process-rate-badge" style={{ color: rateBadge.color }}>{rateBadge.label}</span>
      </div>

      {showHelp && helpContent && (
        <div className="process-help-popup">{helpContent}</div>
      )}

      <div className="process-card-rate">
        <span className="rate-value" style={{ color: rateColor }}>{displayRate}</span>
        <span className="rate-unit">г/ч</span>
        {status && <span className="process-status" style={{ color: status.color }}>{status.label}</span>}
      </div>

      {isFat && lipolysisRate != null && esterificationRate != null && (
        <div className="process-breakdown">
          <div className="breakdown-row">
            <span>🟢 сжигается</span>
            <strong style={{ color: 'var(--muscle-2)' }}>−{lipolysisRate.toFixed(2)} г/ч</strong>
          </div>
          <div className="breakdown-row">
            <span>🔴 откладывается</span>
            <strong style={{ color: 'var(--lipo)' }}>+{esterificationRate.toFixed(2)} г/ч</strong>
          </div>
          <div className="breakdown-row total">
            <span>= чистый поток</span>
            <strong style={{ color: rateColor }}>{displayRate} г/ч</strong>
          </div>
        </div>
      )}

      <div className="process-timer">
        <span className="process-timer-icon">⟳</span>
        <span>след. обновление через {formatTimer(secondsToNextHour)}</span>
      </div>

      <div className="process-card-today">
        <span>{todayLabel}: <strong>{todayAbs.toFixed(1)}</strong> г</span>
        {hasPlan && <span className="process-card-plan">План: {planDisplayStr}</span>}
      </div>

      {hasPlan && (
        <>
          <div className="bar-track">
            <div className={`bar-fill ${barClass}`} style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }} />
          </div>
          <div className="process-card-expected">
            Ожидалось: {expectedDisplay.toFixed(1)} г · {((currentHour / 24) * 100).toFixed(0)}% дня
          </div>
        </>
      )}

      {fatDetail && <div className="process-detail">{fatDetail}</div>}

      {sparklineData && sparklineData.length > 1 && (
        <div className="sparkline-wrapper">
          <MiniSparkline data={sparklineData} color={rateColor} width={100} height={28} />
          <span className="sparkline-label">6 часов</span>
        </div>
      )}

      <div className="process-context">
        <span className="process-context-icon">📍</span>
        <span>{context}</span>
      </div>
    </div>
  );
}

export function MacroRow({ label, current, planned, color, unit = 'г' }: {
  label: string; current: number; planned: number; color: string; unit?: string;
}) {
  const pct = planned > 0 ? Math.min(100, (current / planned) * 100) : 0;
  return (
    <div className="macro-row">
      <div className="macro-row-header">
        <span className="macro-row-label">{label}</span>
        <span className="macro-row-value">
          <strong>{Math.round(current || 0)}</strong>
          {planned > 0 && <span className="macro-row-plan"> / {planned}{unit}</span>}
          {planned > 0 && <span className="macro-row-plan"> ({Math.round(pct)}%)</span>}
        </span>
      </div>
      {planned > 0 && (
        <div className="bar-track" style={{ height: 5 }}>
          <div className="bar-fill good" style={{ width: `${pct}%`, height: '100%' }} />
        </div>
      )}
    </div>
  );
}

// HELP CONTENT — тексты 1:1
export const FAT_HELP = (
  <>
    <h4 className="good">🔥 Жир сжигается больше (значение −)</h4>
    <ul>
      <li>3+ часа с последнего приёма пищи</li>
      <li>Энергетический дефицит</li>
      <li>После тренировки (пик 1–2 ч)</li>
      <li>Ночью (голодание + гормон роста)</li>
    </ul>
    <h4 className="bad">🔴 Откладывается больше (значение +)</h4>
    <ul>
      <li>1–3 часа после еды, особенно углеводов</li>
      <li>Профицит калорий</li>
      <li>Фруктоза или алкоголь (DNL)</li>
    </ul>
  </>
);

export const MUSCLE_HELP = (
  <>
    <h4 className="synth">💪 Синтез больше (значение +)</h4>
    <ul>
      <li>Была силовая тренировка (окно 24–36 ч)</li>
      <li>Приём белка ≥ 15 г (импульс 2–3 ч)</li>
      <li>Энергии достаточно (не в глубоком дефиците)</li>
      <li>Сон 7+ ч</li>
    </ul>
    <h4 className="catab">🔨 Распад больше (значение −)</h4>
    <ul>
      <li>Ночью (MPS подавлен до 15%)</li>
      <li>Голод 5+ часов</li>
      <li>Дефицит калорий</li>
      <li>Без силовых тренировок</li>
    </ul>
  </>
);
