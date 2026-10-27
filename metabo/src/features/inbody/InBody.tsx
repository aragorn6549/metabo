// InBodyEditor + InBodyTab — UI 1:1 с прототипом (§8.6).
import { useState } from 'react';
import { NumberInput } from '@/components/NumberInput';
import { calculateBMR } from '@/math/bmr';
import { formatDayLabel, plural } from '@/lib/format';
import type { Baseline, InBodyEntry } from '@/types/domain';

export interface InBodyDraft { id?: string; date: string; weight: number; fatPercent: number; musclePercent: number; bmr: number; bmi: number | null }

interface EditorProps {
  entry: InBodyEntry | null;
  baseline: Baseline | null;
  onSave: (e: InBodyDraft) => void;
  onClose: () => void;
}

export function InBodyEditor({ entry, baseline, onSave, onClose }: EditorProps) {
  const isEdit = !!entry?.id;
  const autoBmi = (w: number, h: number) => w > 0 && h > 0 ? +(w / Math.pow(h / 100, 2)).toFixed(1) : 0;
  type FormState = { id?: string; date: string; weight: number; fatPercent: number; musclePercent: number; bmr: number; bmi: number | null };
  const [form, setForm] = useState<FormState>(() => {
    if (entry) {
      const d = new Date(entry.date);
      const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return { ...entry, date: local };
    }
    return {
      date: new Date().toISOString().slice(0, 10),
      weight: baseline?.weight || 0,
      fatPercent: baseline?.fatPercent || 0,
      musclePercent: baseline?.musclePercent || 0,
      bmr: baseline?.bmr || calculateBMR(baseline?.weight ?? 70, baseline?.height ?? 175, baseline?.age ?? 30, baseline?.gender ?? 'male'),
      bmi: baseline?.bmi || autoBmi(baseline?.weight ?? 0, baseline?.height ?? 0),
    };
  });
  const [err, setErr] = useState('');
  const update = (f: keyof FormState, v: number | string | null) =>
    setForm(prev => ({ ...prev, [f]: v }));

  const setWeight = (v: number | '') => {
    const w = typeof v === 'number' ? v : 0;
    setForm(prev => ({
      ...prev,
      weight: w,
      bmi: (w > 0 && baseline?.height) ? autoBmi(w, baseline.height) : prev.bmi,
    }));
  };

  const handleSubmit = () => {
    if (!form.weight || !form.fatPercent) { setErr('Заполните вес и % жира'); return; }
    setErr('');
    const d = new Date(form.date + 'T12:00:00');
    onSave({
      id: entry?.id,
      date: d.toISOString(),
      weight: +form.weight,
      fatPercent: +form.fatPercent,
      musclePercent: +form.musclePercent,
      bmr: +form.bmr,
      bmi: form.bmi != null ? +form.bmi : null,
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{isEdit ? 'Редактировать замер' : 'Новый замер InBody'}</div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="field full">
              <label>Дата</label>
              <input type="date" value={form.date} onChange={e => update('date', e.target.value)} />
            </div>
            <div className="field"><label>Вес (кг)</label>
              <NumberInput value={form.weight} onChange={setWeight} /></div>
            <div className="field"><label>% жира</label>
              <NumberInput value={form.fatPercent} onChange={v => update('fatPercent', v)} /></div>
            <div className="field"><label>% мышц</label>
              <NumberInput value={form.musclePercent} onChange={v => update('musclePercent', v)} /></div>
            <div className="field"><label>BMR (ккал)</label>
              <NumberInput value={form.bmr} onChange={v => update('bmr', v)} /></div>
            <div className="field full"><label>ИМТ</label>
              <NumberInput value={form.bmi ?? ''} onChange={v => update('bmi', v === '' ? null : v)} /></div>
          </div>
          {err && <div className="auth-error" style={{ marginBottom: 16 }}>⚠ {err}</div>}
          <button className="btn" style={{ marginTop: 8 }} onClick={handleSubmit}>
            {isEdit ? 'Сохранить' : 'Добавить замер'}
          </button>
        </div>
      </div>
    </div>
  );
}

function InBodyValue({ label, value, delta, unit, color, decimals = 1 }: {
  label: string; value: string; delta: number | null; unit: string;
  color: 'normal' | 'inverse' | 'neutral'; decimals?: number;
}) {
  let deltaEl = null;
  if (delta != null && Math.abs(delta) > 0.001) {
    const sign = delta > 0 ? '+' : '−';
    const abs = Math.abs(delta).toFixed(decimals);
    let cls = 'delta-neutral';
    if (color === 'normal') cls = delta > 0 ? 'delta-good' : 'delta-bad';
    else if (color === 'inverse') cls = delta < 0 ? 'delta-good' : 'delta-bad';
    deltaEl = <span className={`delta-badge ${cls}`}>{sign}{abs}{unit}</span>;
  }
  return (
    <div className="inbody-value-box">
      <div className="inbody-value-label">{label}</div>
      <div className="inbody-value-main">
        <span className="inbody-value-number">{value}</span>
        {deltaEl}
      </div>
    </div>
  );
}

interface TabProps {
  inbodyLogs: InBodyEntry[];
  baseline: Baseline | null;
  onEdit: (e: InBodyEntry) => void;
  onDelete: (e: InBodyEntry) => void;
  onAdd: () => void;
}

export function InBodyTab({ inbodyLogs, onEdit, onDelete, onAdd }: TabProps) {
  const sortedAsc = [...inbodyLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const withDeltas = sortedAsc.map((log, i) => ({
    ...log,
    prev: i > 0 ? sortedAsc[i - 1] : null as InBodyEntry | null,
  }));
  const display = [...withDeltas].reverse();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Замеры InBody</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            {inbodyLogs.length} {plural(inbodyLogs.length, ['измерение', 'измерения', 'измерений'])} · дельты относительно предыдущего
          </div>
        </div>
        <button className="btn" style={{ width: 'auto', padding: '10px 20px' }} onClick={onAdd}>+ Замер</button>
      </div>
      {display.length === 0 ? (
        <div className="empty-state">
          <h3>Пока нет замеров</h3>
          <p>Добавьте первый замер кнопкой «+ Замер»</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {display.map((log, idx) => {
            const isCurrent = idx === 0;
            return (
              <div key={log.id} className="inbody-card">
                <div className="inbody-header">
                  <div>
                    <div className="inbody-date">
                      {formatDayLabel(new Date(log.date))}
                      {isCurrent && <span className="inbody-current-badge">текущий</span>}
                    </div>
                    <div className="inbody-date-full">
                      {new Date(log.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                  <div className="entry-actions">
                    <button onClick={() => onEdit(log)} title="Редактировать">✎</button>
                    <button className="danger" onClick={() => onDelete(log)} title="Удалить">×</button>
                  </div>
                </div>
                <div className="inbody-values">
                  <InBodyValue label="Вес" value={`${(log.weight || 0).toFixed(1)} кг`}
                    delta={log.prev ? log.weight - log.prev.weight : null}
                    unit=" кг" color="neutral" decimals={1} />
                  <InBodyValue label="% жира" value={`${(log.fatPercent || 0).toFixed(1)}%`}
                    delta={log.prev ? log.fatPercent - log.prev.fatPercent : null}
                    unit="%" color="inverse" decimals={1} />
                  <InBodyValue label="% мышц" value={`${(log.musclePercent || 0).toFixed(1)}%`}
                    delta={log.prev ? log.musclePercent - log.prev.musclePercent : null}
                    unit="%" color="normal" decimals={1} />
                  <InBodyValue label="BMR" value={`${Math.round(log.bmr || 0)} ккал`}
                    delta={log.prev ? log.bmr - log.prev.bmr : null}
                    unit=" ккал" color="normal" decimals={0} />
                  <InBodyValue label="ИМТ" value={log.bmi != null ? log.bmi.toFixed(1) : '—'}
                    delta={log.prev && log.prev.bmi && log.bmi ? log.bmi - log.prev.bmi : null}
                    unit="" color="neutral" decimals={1} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
