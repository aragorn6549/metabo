// ActivityLogger — модалка с 4 табами (Еда/Тренировка/Сон/Прочее). Перенос UI 1:1 (§8.4).
// DECISION: мет-константы и названия типов активностей вынесены в lib/constants.ts (ACTIVITY_PRESETS),
// калории через calcMETCalories (math/tdee.ts) — значения идентичны прототипу.
import { useState } from 'react';
import { NumberInput } from '@/components/NumberInput';
import { ACTIVITY_PRESETS, SLEEP_QUALITY_LABELS } from '@/lib/constants';
import { calcMETCalories } from '@/math/tdee';
import type { Activity, Baseline, Dish, FoodLog, LogEntry } from '@/types/domain';

export type LoggerTab = 'food' | 'workout' | 'sleep' | 'other';

interface FormState {
  food: { name: string; calories: number | ''; protein: number | ''; fat: number | ''; carbs: number | '' };
  workout: { subtype: string; duration: number | ''; calories: number | '' };
  sleep: { hours: number | ''; quality: number | '' };
  other: { subtype: string; duration: number | '' };
}

interface Props {
  onClose: () => void;
  onSave: (entry: FoodLog | Activity) => void;
  baseline: Baseline;
  editingEntry: LogEntry | null;
  dishes: Dish[];
}

const SPORT_SUBTYPES = ['volleyball', 'padel', 'tennis', 'football', 'basketball'];

export function ActivityLogger({ onClose, onSave, baseline, editingEntry, dishes }: Props) {
  const [tab, setTab] = useState<LoggerTab>(editingEntry ? editingEntry.type : 'food');
  const [foodStep, setFoodStep] = useState<'pick' | 'edit'>(editingEntry?.type === 'food' ? 'edit' : 'pick');
  const [form, setForm] = useState<FormState>(() => {
    const base: FormState = {
      food: { name: '', calories: 0, protein: 0, fat: 0, carbs: 0 },
      workout: { subtype: 'strength', duration: 60, calories: 400 },
      sleep: { hours: 8, quality: 4 },
      other: { subtype: 'walk', duration: 30 },
    };
    if (!editingEntry) return base;
    if (editingEntry.type === 'food') base.food = { name: editingEntry.name || '', calories: editingEntry.calories ?? 0, protein: editingEntry.protein ?? 0, fat: editingEntry.fat ?? 0, carbs: editingEntry.carbs ?? 0 };
    else if (editingEntry.type === 'workout') base.workout = { subtype: editingEntry.subtype || 'strength', duration: editingEntry.duration ?? 60, calories: editingEntry.calories ?? 0 };
    else if (editingEntry.type === 'sleep') base.sleep = { hours: editingEntry.hours ?? 8, quality: editingEntry.quality ?? 4 };
    else if (editingEntry.type === 'other') base.other = { subtype: editingEntry.subtype || 'walk', duration: editingEntry.duration ?? 30 };
    return base;
  });

  const tabs: { id: LoggerTab; label: string }[] = [
    { id: 'food', label: '🍽 Еда' }, { id: 'workout', label: '🏋️ Тренировка' },
    { id: 'sleep', label: '😴 Сон' }, { id: 'other', label: '🚶 Прочее' },
  ];
  const isSport = SPORT_SUBTYPES.includes(form.workout.subtype);

  const updateWorkout = (field: 'subtype' | 'duration' | 'calories', value: number | '' | string) => {
    setForm(prev => {
      const w = { ...prev.workout, [field]: value };
      if (field === 'subtype' || field === 'duration') {
        const preset = ACTIVITY_PRESETS.find(p => p.subtype === w.subtype);
        if (SPORT_SUBTYPES.includes(w.subtype) && w.duration && preset?.met) {
          w.calories = calcMETCalories(preset.met, baseline.weight, +w.duration);
        }
      }
      return { ...prev, workout: w };
    });
  };
  const update = <K extends keyof FormState>(s: K, f: keyof FormState[K], v: number | '' | string) =>
    setForm(prev => ({ ...prev, [s]: { ...prev[s], [f]: v } }));

  const selectDish = (d: Dish) => {
    setForm(prev => ({ ...prev, food: { name: d.name, calories: d.calories, protein: d.protein, fat: d.fat, carbs: d.carbs } }));
    setFoodStep('edit');
  };

  const startNewDish = () => {
    setForm(prev => ({ ...prev, food: { name: '', calories: 0, protein: 0, fat: 0, carbs: 0 } }));
    setFoodStep('edit');
  };

  const handleSubmit = () => {
    const raw = form[tab];
    const normalized: Record<string, number | string> = {};
    Object.keys(raw).forEach(k => {
      const val = (raw as Record<string, unknown>)[k];
      if (typeof val === 'string' && val !== '') {
        const n = parseFloat(val.replace(',', '.'));
        normalized[k] = Number.isNaN(n) ? 0 : n;
      } else if (val === '') {
        normalized[k] = 0;
      } else {
        normalized[k] = val as number;
      }
    });
    const entry = {
      ...normalized,
      id: editingEntry?.id,
      type: tab,
      timestamp: editingEntry ? editingEntry.timestamp : Date.now(),
    } as FoodLog | Activity;
    onSave(entry);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={ev => ev.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            {editingEntry ? 'Редактирование' : 'Добавить активность'}
            {editingEntry && <span className="badge">edit</span>}
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="logger-tabs">
          {tabs.map(t => (
            <button key={t.id} className={`logger-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>
        <div className="modal-body">
          {/* FOOD — pick step */}
          {tab === 'food' && foodStep === 'pick' && (
            <div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
                {(dishes && dishes.length > 0) ? 'Выбери блюдо из каталога' : 'Каталог пуст — добавь первое блюдо'}
              </div>
              {dishes && dishes.length > 0 && (
                <div className="dish-picker-list">
                  {dishes.map(d => (
                    <button key={d.id} className="dish-pick-item" onClick={() => selectDish(d)}>
                      <div className="dish-pick-name">{d.name}</div>
                      <div className="dish-pick-macros">
                        {Math.round(d.calories || 0)} ккал · Б {(+d.protein || 0).toFixed(0)} · Ж {(+d.fat || 0).toFixed(0)} · У {(+d.carbs || 0).toFixed(0)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <button className="btn secondary" onClick={startNewDish}>+ Новое блюдо</button>
            </div>
          )}

          {/* FOOD — edit step */}
          {tab === 'food' && foodStep === 'edit' && (
            <div>
              {form.food.name && (
                <button className="btn secondary"
                  onClick={() => setFoodStep('pick')}
                  style={{ marginBottom: 12, padding: '8px 14px', width: 'auto', fontSize: 13 }}>
                  ← Изменить блюдо
                </button>
              )}
              <div className="form-grid">
                <div className="field full"><label>Название</label>
                  <input value={form.food.name} onChange={ev => update('food', 'name', ev.target.value)} placeholder="Куриная грудка с рисом" autoFocus /></div>
                <div className="field"><label>Калории</label>
                  <NumberInput value={form.food.calories} onChange={v => update('food', 'calories', v)} /></div>
                <div className="field"><label>Белки (г)</label>
                  <NumberInput value={form.food.protein} onChange={v => update('food', 'protein', v)} /></div>
                <div className="field"><label>Жиры (г)</label>
                  <NumberInput value={form.food.fat} onChange={v => update('food', 'fat', v)} /></div>
                <div className="field"><label>Углеводы (г)</label>
                  <NumberInput value={form.food.carbs} onChange={v => update('food', 'carbs', v)} /></div>
              </div>
              {form.food.name && !(dishes || []).find(d => d.name.toLowerCase() === form.food.name.trim().toLowerCase()) && (
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 12, fontStyle: 'italic' }}>
                  💡 Новое блюдо будет добавлено в каталог
                </div>
              )}
            </div>
          )}

          {tab === 'workout' && (
            <div className="form-grid">
              <div className="field full"><label>Тип тренировки</label>
                <select value={form.workout.subtype} onChange={ev => updateWorkout('subtype', ev.target.value)}>
                  {ACTIVITY_PRESETS.filter(p => p.kind === 'workout').map(p => (
                    <option key={p.subtype} value={p.subtype}>
                      {p.label}{p.met && SPORT_SUBTYPES.includes(p.subtype) ? ` (MET ${p.met.toFixed(1)})` : ''}
                    </option>
                  ))}
                </select></div>
              <div className="field full"><label>Длительность (мин)</label>
                <NumberInput value={form.workout.duration} onChange={v => updateWorkout('duration', v)} /></div>
              <div className="field full"><label>Калории {isSport ? '· авто по МЕТ' : '· из трекера'}</label>
                <NumberInput value={form.workout.calories} onChange={v => update('workout', 'calories', v)} /></div>
            </div>
          )}
          {tab === 'sleep' && (
            <div className="form-grid">
              <div className="field full"><label>Длительность (часы)</label>
                <NumberInput value={form.sleep.hours} onChange={v => update('sleep', 'hours', v)} /></div>
              <div className="field full"><label>Качество (1-5) — {SLEEP_QUALITY_LABELS[Math.min(4, Math.max(0, (+form.sleep.quality || 1) - 1))]}</label>
                <NumberInput value={form.sleep.quality} onChange={v => update('sleep', 'quality', v)} /></div>
            </div>
          )}
          {tab === 'other' && (
            <div className="form-grid">
              <div className="field full"><label>Тип</label>
                <select value={form.other.subtype} onChange={ev => update('other', 'subtype', ev.target.value)}>
                  {ACTIVITY_PRESETS.filter(p => p.kind === 'other').map(p => (
                    <option key={p.subtype} value={p.subtype}>{p.label}</option>
                  ))}
                </select></div>
              <div className="field full"><label>Длительность (мин)</label>
                <NumberInput value={form.other.duration} onChange={v => update('other', 'duration', v)} /></div>
            </div>
          )}
          {!(tab === 'food' && foodStep === 'pick') && (
            <button className="btn" style={{ marginTop: 24 }} onClick={handleSubmit}>
              {editingEntry ? 'Сохранить изменения' : 'Сохранить'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
