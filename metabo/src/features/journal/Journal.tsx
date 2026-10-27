// LineChart + ChartCard + ChartsView + Journal — UI 1:1 с прототипом (§8.6).
import { useMemo, useState } from 'react';
import { computePlanSeries } from '@/math/goal';
import { formatSigned } from '@/lib/format';
import { InBodyTab } from '@/features/inbody/InBody';
import type { SimResult } from '@/math/simulation';
import type { TodayData } from '@/features/map/MetabolismMap';
import type { Baseline, DailyHistoryEntry, Goal, InBodyEntry } from '@/types/domain';

interface Point { label: string; value: number }

export function LineChart({ data, color = '#8b5cf6', height = 200, id, goalLine, planData }: {
  data: Point[]; color?: string; height?: number; id: string;
  goalLine?: number | null; planData?: (number | null)[] | null;
}) {
  const width = 600, pad = { top: 15, right: 20, bottom: 30, left: 45 };
  const innerW = width - pad.left - pad.right, innerH = height - pad.top - pad.bottom;
  if (data.length < 2) return <div className="empty-state" style={{ padding: 30 }}>Недостаточно данных</div>;
  const planValues = planData ? planData.filter(v => v != null && !isNaN(v)) : [];
  const all = [...data.map(d => d.value), ...(goalLine != null ? [goalLine] : []), ...planValues as number[]];
  const minV = Math.min(...all), maxV = Math.max(...all);
  const range = (maxV - minV) || 1, minY = minV - range * 0.15, maxY = maxV + range * 0.15;
  const points = data.map((d, i) => ({
    x: pad.left + (i / (data.length - 1)) * innerW,
    y: pad.top + (1 - (d.value - minY) / (maxY - minY)) * innerH, ...d,
  }));
  const pathD = points.map((p, i) => (i === 0 ? 'M' : 'L') + ` ${p.x} ${p.y}`).join(' ');
  const areaD = pathD + ` L ${points[points.length - 1].x} ${pad.top + innerH} L ${pad.left} ${pad.top + innerH} Z`;
  const goalY = goalLine != null ? pad.top + (1 - (goalLine - minY) / (maxY - minY)) * innerH : null;
  let planPathD: string | null = null;
  if (planData && planValues.length >= 2) {
    const pts: { x: number; y: number }[] = [];
    planData.forEach((val, i) => {
      if (val == null || isNaN(val)) return;
      pts.push({
        x: pad.left + (i / (data.length - 1)) * innerW,
        y: pad.top + (1 - (val - minY) / (maxY - minY)) * innerH,
      });
    });
    if (pts.length >= 2) planPathD = pts.map((p, i) => (i === 0 ? 'M' : 'L') + ` ${p.x} ${p.y}`).join(' ');
  }
  const zeroY = minY < 0 && maxY > 0 ? pad.top + (1 - (0 - minY) / (maxY - minY)) * innerH : null;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="line-chart">
      <defs><linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.3" />
        <stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient></defs>
      {[0, 0.25, 0.5, 0.75, 1].map(t => {
        const y = pad.top + t * innerH, val = maxY - t * (maxY - minY);
        return (<g key={t}>
          <line className="chart-grid" x1={pad.left} y1={y} x2={width - pad.right} y2={y} />
          <text className="chart-axis-label" x={pad.left - 8} y={y + 3} textAnchor="end">{val.toFixed(1)}</text>
        </g>);
      })}
      {zeroY != null && (
        <line x1={pad.left} y1={zeroY} x2={width - pad.right} y2={zeroY}
          stroke="var(--border)" strokeWidth="1" strokeDasharray="2 3" opacity="0.7" />
      )}
      {goalY != null && goalY >= pad.top && goalY <= pad.top + innerH && (
        <g>
          <line x1={pad.left} y1={goalY} x2={width - pad.right} y2={goalY}
            stroke="#eab308" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.5" />
          <text x={width - pad.right - 4} y={goalY - 6} textAnchor="end" fill="#eab308"
            fontSize="10" fontWeight="700" fontFamily="inherit">ЦЕЛЬ {goalLine}</text>
        </g>
      )}
      {planPathD && (
        <path d={planPathD} fill="none" stroke="#eab308" strokeWidth="2"
          strokeDasharray="4 3" strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />
      )}
      <path d={areaD} fill={`url(#grad-${id})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3.5" fill={color} />
          {i % Math.ceil(points.length / 7) === 0 && (
            <text className="chart-axis-label" x={p.x} y={height - 8} textAnchor="middle">{p.label}</text>
          )}
        </g>
      ))}
    </svg>
  );
}

function ChartCard({ title, subtitle, data, color, id, goalLine, planData }: {
  title: string; subtitle: string; data: Point[]; color: string; id: string;
  goalLine?: number | null; planData?: (number | null)[] | null;
}) {
  const hasGoalLine = goalLine != null;
  const hasPlan = planData && planData.some(v => v != null && !isNaN(v));
  return (
    <div className="chart-card">
      <div className="chart-title">
        <span>{title} <span>{subtitle}</span></span>
        <div className="chart-legend">
          <div className="legend-item"><div className="legend-line" style={{ borderTopColor: color }} /><span style={{ color: 'var(--muted)' }}>факт</span></div>
          {hasPlan && <div className="legend-item"><div className="legend-line dashed" style={{ borderTopColor: '#eab308' }} /><span style={{ color: 'var(--muted)' }}>план</span></div>}
          {hasGoalLine && <div className="legend-item"><div className="legend-line dashed" style={{ borderTopColor: '#eab308', opacity: 0.5 }} /><span style={{ color: 'var(--muted)' }}>цель</span></div>}
        </div>
      </div>
      <LineChart id={id} data={data} color={color} goalLine={goalLine} planData={planData} />
    </div>
  );
}

type HistRow = DailyHistoryEntry & { prev?: DailyHistoryEntry | null };

function ChartsView({ history, goal, baseline, sim, todayData }: {
  history: DailyHistoryEntry[]; goal: Goal | null; baseline: Baseline | null;
  sim: SimResult | null; todayData: TodayData | null;
}) {
  const [filter, setFilter] = useState<'day' | 'week' | 'month'>('week');
  const data = useMemo(() => {
    const days = filter === 'week' ? 7 : filter === 'month' ? 30 : 1;
    return history.slice(-days);
  }, [history, filter]);
  if (history.length < 2) {
    return (
      <div className="journal">
        <div className="journal-filters">
          {(['day', 'week', 'month'] as const).map(f => (
            <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'day' ? 'День' : f === 'week' ? 'Неделя' : 'Месяц'}
            </button>
          ))}
        </div>
        <div className="empty-state"><h3>Мало данных</h3><p>Добавь активности для аналитики</p></div>
      </div>
    );
  }
  const fmt = (d: { date: string }) => new Date(d.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

  const currentDayEntry: DailyHistoryEntry | null = sim && todayData && baseline ? {
    date: new Date().toISOString(),
    weight: baseline.weight, fatPercent: baseline.fatPercent, musclePercent: baseline.musclePercent,
    caloriesConsumed: todayData.caloriesConsumed, balance: todayData.balance,
    fatOxidized: sim.fatOxidized, fatStored: sim.fatStored, muscleNet: Math.max(0, sim.muscleToday),
  } : null;

  const allData: DailyHistoryEntry[] = currentDayEntry ? [...data, currentDayEntry] : data;

  const gw = goal && goal.targetType === 'weight' ? goal.targetValue : null;
  const gf = goal && goal.targetType === 'fatPercent' ? goal.targetValue : null;
  const gm = goal && goal.targetType === 'musclePercent' ? goal.targetValue : null;
  const planW = goal && baseline ? computePlanSeries(allData, goal, baseline, 'weight') : null;
  const planF = goal && baseline ? computePlanSeries(allData, goal, baseline, 'fatPercent') : null;
  const planM = goal && baseline ? computePlanSeries(allData, goal, baseline, 'musclePercent') : null;

  const hasLipidData = allData.some(d => d.fatOxidized != null);
  const hasMuscleNetData = allData.some(d => d.muscleNet != null);

  return (
    <div className="journal">
      <div className="journal-filters">
        {(['day', 'week', 'month'] as const).map(f => (
          <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'day' ? 'День' : f === 'week' ? 'Неделя' : 'Месяц'}
          </button>
        ))}
      </div>
      <ChartCard title="Вес" subtitle="· кг" id="w"
        data={allData.map(d => ({ label: fmt(d), value: d.weight }))}
        color="#8b5cf6" goalLine={gw} planData={planW} />
      <ChartCard title="% жира" subtitle="· динамика" id="f"
        data={allData.map(d => ({ label: fmt(d), value: d.fatPercent }))}
        color="#f97316" goalLine={gf} planData={planF} />
      <ChartCard title="% мышц" subtitle="· динамика" id="m"
        data={allData.map(d => ({ label: fmt(d), value: d.musclePercent }))}
        color="#3b82f6" goalLine={gm} planData={planM} />

      {hasLipidData && (
        <>
          <ChartCard title="🔥 Липолиз" subtitle="· окисление жира, г/день" id="fo"
            data={allData.map(d => ({ label: fmt(d), value: d.fatOxidized || 0 }))}
            color="#f97316" />
          <ChartCard title="🔴 Липогенез" subtitle="· отложение жира, г/день" id="fs"
            data={allData.map(d => ({ label: fmt(d), value: d.fatStored || 0 }))}
            color="#dc2626" />
        </>
      )}

      {hasMuscleNetData && (
        <ChartCard title="💪 Синтез мышц (net)" subtitle="· г/день" id="mn"
          data={allData.map(d => ({ label: fmt(d), value: d.muscleNet || 0 }))}
          color="#3b82f6" />
      )}

      <div className="chart-card">
        <div className="chart-title"><span>Энергобаланс <span>· ккал/день</span></span></div>
        <LineChart id="b" data={allData.map(d => ({ label: fmt(d), value: d.balance }))} color="#22c55e" />
      </div>
      <div className="chart-card" style={{ overflowX: 'auto' }}>
        <table className="log-table">
          <thead><tr>
            <th>Дата</th><th>Вес</th><th>% жира</th><th>% мышц</th>
            <th>Ккал</th><th>Баланс</th>
            {hasLipidData && <><th>Липолиз</th><th>Липогенез</th></>}
          </tr></thead>
          <tbody>
            {allData.slice().reverse().map((d: HistRow, i) => (
              <tr key={i}>
                <td>{fmt(d)}</td><td>{d.weight.toFixed(1)}</td>
                <td style={{ color: '#f97316' }}>{d.fatPercent.toFixed(1)}%</td>
                <td style={{ color: '#3b82f6' }}>{d.musclePercent.toFixed(1)}%</td>
                <td>{Math.round(d.caloriesConsumed)}</td>
                <td style={{ color: d.balance < 0 ? '#f97316' : '#22c55e' }}>{formatSigned(d.balance)}</td>
                {hasLipidData && <>
                  <td style={{ color: '#f97316' }}>{(d.fatOxidized || 0).toFixed(0)} г</td>
                  <td style={{ color: '#dc2626' }}>{(d.fatStored || 0).toFixed(0)} г</td>
                </>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface JournalProps {
  history: DailyHistoryEntry[]; goal: Goal | null; baseline: Baseline | null;
  sim: SimResult | null; todayData: TodayData | null;
  inbodyLogs: InBodyEntry[];
  onEditInbody: (e: InBodyEntry) => void;
  onDeleteInbody: (e: InBodyEntry) => void;
  onAddInbody: () => void;
}

export function Journal(p: JournalProps) {
  const [subTab, setSubTab] = useState<'charts' | 'inbody'>('charts');
  return (
    <div>
      <div className="subtabs">
        <button className={`subtab ${subTab === 'charts' ? 'active' : ''}`} onClick={() => setSubTab('charts')}>
          📊 Графики
        </button>
        <button className={`subtab ${subTab === 'inbody' ? 'active' : ''}`} onClick={() => setSubTab('inbody')}>
          📋 Замеры InBody
        </button>
      </div>
      {subTab === 'charts' && (
        <ChartsView history={p.history} goal={p.goal} baseline={p.baseline} sim={p.sim} todayData={p.todayData} />
      )}
      {subTab === 'inbody' && (
        <InBodyTab inbodyLogs={p.inbodyLogs} baseline={p.baseline}
          onEdit={p.onEditInbody} onDelete={p.onDeleteInbody} onAdd={p.onAddInbody} />
      )}
    </div>
  );
}
