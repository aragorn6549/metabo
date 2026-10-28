// Onboarding — UI 1:1 с прототипом. Запись: profiles (name/age/gender/height/activity) + первый inbody_logs (§8.1).
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { db, supabase } from '@/lib/supabase';
import { NumberInput } from '@/components/NumberInput';
import { useToast } from '@/components/ui';
import { calculateBMR, calcBMI } from '@/math/bmr';
import { useAuthStore } from '@/store/authStore';
import type { ActivityLevel, Gender } from '@/types/db';

interface FormState {
  name: string; age: number | ''; gender: Gender; height: number | '';
  weight: number | ''; fatPercent: number | ''; musclePercent: number | '';
  activityLevel: ActivityLevel;
}

const defaultForm = (): FormState => ({
  name: '', age: '', gender: 'male', height: '', weight: '',
  fatPercent: '', musclePercent: '', activityLevel: 'light',
});

export function Onboarding({ initial, onCancel }: {
  initial?: Partial<FormState> | null;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<FormState>(initial ? { ...defaultForm(), ...initial } as FormState : defaultForm());
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isDemoFlow = params.get('demo') === '1';
  const user = useAuthStore(s => s.user);

  const bmr = useMemo(() => calculateBMR(+form.weight, +form.height, +form.age, form.gender), [form]);
  const set = (k: keyof FormState, v: number | '' | string) => setForm(f => ({ ...f, [k]: v as never }));

  const save = async (asDemo?: boolean) => {
    if (!form.age || !form.height || !form.weight) { setErr('Заполните возраст, рост и вес'); return; }
    if (!user) return;
    setErr(''); setBusy(true);
    try {
      // upsert вместо update: строка profiles создаётся триггером только для email-пользователей;
      // анонимные демо-сессии его не получают — вставка под защитой политики profiles_insert_self.
      const { error: pErr } = await db().from('profiles').upsert({
        id: user.id,
        name: form.name || null, age: +form.age, gender: form.gender,
        height_cm: +form.height, activity_level: form.activityLevel,
      });
      if (pErr) throw new Error(pErr.message);

      const { error: iErr } = await db().from('inbody_logs').insert({
        measured_at: new Date().toISOString(),
        weight_kg: +form.weight, fat_percent: +form.fatPercent, muscle_percent: +form.musclePercent,
        bmr: Math.round(bmr), bmi: calcBMI(+form.weight, +form.height),
      });
      if (iErr) throw new Error(iErr.message);

      // Отмечаем онбординг пройденным, чтобы / не редиректило обратно сюда
      try {
        await supabase.auth.updateUser({ data: { onboarded: true } });
      } catch { /* не критично */ }

      // DECISION (§10): демо-сид — вызов SQL-функции seed_demo_data(uid) из миграции.
      if (asDemo ?? isDemoFlow) {
        const { error: sErr } = await db().rpc('seed_demo_data', { uid: user.id } as never);
        if (sErr) console.warn('seed_demo_data:', sErr.message);
      }
      toast('✓ Данные сохранены');
      navigate('/', { replace: true });
    } catch (e) {
      setErr(String((e as Error).message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="onboarding">
      <h1>{initial ? 'Обновить данные' : 'Metabo'}</h1>
      <p>{initial ? 'Внеси свежие данные InBody.' : 'Введи данные последнего замера InBody.'}</p>
      <form onSubmit={(ev) => { ev.preventDefault(); void save(); }}>
        <div className="form-grid">
          <div className="field full"><label>Имя</label>
            <input value={form.name} onChange={ev => set('name', ev.target.value)} placeholder="Александр" /></div>
          <div className="field"><label>Возраст</label>
            <NumberInput value={form.age} onChange={v => set('age', v)} /></div>
          <div className="field"><label>Пол</label>
            <select value={form.gender} onChange={ev => set('gender', ev.target.value)}>
              <option value="male">Мужской</option>
              <option value="female">Женский</option>
            </select></div>
          <div className="field"><label>Рост, см</label>
            <NumberInput value={form.height} onChange={v => set('height', v)} /></div>
          <div className="field"><label>Вес, кг</label>
            <NumberInput value={form.weight} onChange={v => set('weight', v)} /></div>
          <div className="field"><label>Жир, %</label>
            <NumberInput value={form.fatPercent} onChange={v => set('fatPercent', v)} /></div>
          <div className="field"><label>Мышцы, %</label>
            <NumberInput value={form.musclePercent} onChange={v => set('musclePercent', v)} /></div>
          <div className="field full"><label>Активность</label>
            <select value={form.activityLevel} onChange={ev => set('activityLevel', ev.target.value)}>
              <option value="sedentary">Минимальная (офис)</option>
              <option value="light">Лёгкая (1–3 трен./нед)</option>
              <option value="moderate">Средняя (3–5 трен./нед)</option>
              <option value="high">Высокая (6–7 трен./нед)</option>
              <option value="athlete">Атлет (2 раза в день)</option>
            </select></div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', margin: '14px 0' }}>
          Расчётный BMR: <b style={{ color: 'var(--text)' }}>{Math.round(bmr)} ккал</b>
        </div>
        {err && <div className="auth-error">⚠ {err}</div>}
        <button type="submit" className="btn" disabled={busy}>Начать</button>
        {onCancel && <button type="button" className="btn ghost" onClick={onCancel}>Отмена</button>}
      </form>
    </div>
  );
}
