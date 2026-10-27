// Home — порт App() из прототипа (MetaBol.txt:2555–3057).
// DECISION (§7): локальные useState-массивы заменены на React Query хуки;
// showToast — на ToastProvider; localStorage-персист — на Supabase.
import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useBaseline, useInBodyLogs, useCreateInBodyLog, useUpdateInBodyLog, useDeleteInBodyLog } from '@/hooks/useInBodyLogs';
import { useAllFoodLogs, useCreateFoodLog, useUpdateFoodLog, useDeleteFoodLog } from '@/hooks/useFoodLogs';
import { useRecentActivities, useCreateActivity, useUpdateActivity, useDeleteActivity } from '@/hooks/useActivities';
import { useDishes, useSaveDish, useDeleteDish } from '@/hooks/useDishes';
import { useActiveGoal, useSetGoal } from '@/hooks/useGoal';
import { useDailyHistory } from '@/hooks/useDailyHistory';
import { useTodayData, useSaveYesterday } from '@/hooks/useSimToday';
import { computePlan } from '@/math/goal';
import { simulateDay, type SimResult } from '@/math/simulation';
import { MetabolismMap } from '@/features/map/MetabolismMap';
import { ActivityHistory, entryLabel } from '@/features/history/ActivityHistory';
import { GoalTab } from '@/features/goal/GoalTab';
import { DishesTab } from '@/features/dishes/DishesTab';
import { DishEditor, type DishDraft } from '@/features/dishes/DishEditor';
import { Journal } from '@/features/journal/Journal';
import { HelpContent, HelpTab } from '@/features/help/HelpTab';
import { ActivityLogger } from '@/features/logger/ActivityLogger';
import { InBodyEditor, type InBodyDraft } from '@/features/inbody/InBody';
import { MobileNav, MobileProfile } from '@/components/MobileNav';
import { Skeleton, useToast } from '@/components/ui';
import { NumberInput } from '@/components/NumberInput';
import type { Activity, Baseline, Dish, FoodLog, Goal, InBodyEntry, LogEntry } from '@/types/domain';

type WebTab = 'map' | 'goal' | 'dishes' | 'journal' | 'help';
type MobileTab = 'map' | 'goal' | 'dishes' | 'journal' | 'profile';

/** Профиль-редактор (имя/возраст/рост/активность) — аналог «Изменить данные» прототипа */
function ProfileEditor({ baseline, onSave, onClose }: {
  baseline: Baseline; onSave: (p: { name: string; age: number; height: number; activityLevel: Baseline['activityLevel'] }) => void; onClose: () => void;
}) {
  const [name, setName] = useState(baseline.name);
  const [age, setAge] = useState<number | ''>(baseline.age);
  const [height, setHeight] = useState<number | ''>(baseline.height);
  const [activityLevel, setActivityLevel] = useState(baseline.activityLevel);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Данные профиля</div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="field full"><label>Имя</label>
              <input value={name} onChange={e => setName(e.target.value)} /></div>
            <div className="field"><label>Возраст</label>
              <NumberInput value={age} onChange={v => setAge(v === '' ? '' : +v)} /></div>
            <div className="field"><label>Рост (см)</label>
              <NumberInput value={height} onChange={v => setHeight(v === '' ? '' : +v)} /></div>
            <div className="field full"><label>Уровень активности</label>
              <select value={activityLevel} onChange={e => setActivityLevel(e.target.value as Baseline['activityLevel'])}>
                <option value="sedentary">Сидячий</option>
                <option value="light">Лёгкая (1-3 дня/нед)</option>
                <option value="moderate">Умеренная (3-5)</option>
                <option value="high">Высокая (6-7)</option>
                <option value="extreme">Экстремальная</option>
              </select></div>
          </div>
          <button className="btn" style={{ marginTop: 8 }}
            onClick={() => onSave({ name, age: +age || 0, height: +height || 0, activityLevel })}>
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

export function Home() {
  const toast = useToast();
  const user = useAuthStore(s => s.user);
  const signOut = useAuthStore(s => s.signOut);
  const { data: profile } = useProfile();
  const { baseline, isLoading: baselineLoading } = useBaseline();
  const inbodyQ = useInBodyLogs();
  const foodQ = useAllFoodLogs();
  const actsQ = useRecentActivities(60);
  const dishesQ = useDishes();
  const goalQ = useActiveGoal();
  const historyQ = useDailyHistory(90);

  const createInbody = useCreateInBodyLog();
  const updateInbody = useUpdateInBodyLog();
  const deleteInbody = useDeleteInBodyLog();
  const createFood = useCreateFoodLog();
  const updateFood = useUpdateFoodLog();
  const deleteFood = useDeleteFoodLog();
  const createAct = useCreateActivity();
  const updateAct = useUpdateActivity();
  const deleteAct = useDeleteActivity();
  const saveDish = useSaveDish();
  const deleteDish = useDeleteDish();
  const setGoal = useSetGoal();
  const updateProfileMut = useUpdateProfile();

  const [tab, setTab] = useState<WebTab>('map');
  const [mobileTab, setMobileTab] = useState<MobileTab>('map');
  const [loggerOpen, setLoggerOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LogEntry | null>(null);
  const [dishEditorOpen, setDishEditorOpen] = useState(false);
  const [dishEditorDish, setDishEditorDish] = useState<Dish | null>(null);
  const [inbodyEditorOpen, setInbodyEditorOpen] = useState(false);
  const [inbodyEditorEntry, setInbodyEditorEntry] = useState<InBodyEntry | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // §8.2: пересчёт симуляции раз в минуту (как tick в прототипе)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const foodLogs = useMemo(() => [...(foodQ.data ?? [])].sort((a, b) => b.timestamp - a.timestamp), [foodQ.data]);
  const activities = useMemo(() => [...(actsQ.data ?? [])].sort((a, b) => a.timestamp - b.timestamp), [actsQ.data]);
  const dishes = dishesQ.data ?? [];
  const inbodyLogs = inbodyQ.data ?? [];
  const goal = goalQ.data ?? null;
  const history = historyQ.data ?? [];

  const todayData = useTodayData(baseline, foodLogs, activities);
  // DECISION: useMemo с явной зависимостью от tick — пересчёт «часов» раз в минуту, как в прототипе
  const simulation = useMemo<SimResult | null>(
    () => (todayData ? simulateDay(foodLogs, activities, todayData.balance) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [foodLogs, activities, todayData?.balance, tick],
  );
  const plan = useMemo(() => computePlan(goal, baseline), [goal, baseline]);
  useSaveYesterday(baseline, todayData, foodLogs, activities);

  const hasAnyData = foodLogs.length > 0 || activities.length > 0;
  const goToGoal = () => { setTab('goal'); setMobileTab('goal'); };

  // ---- обработчики (портированы из прототипа, setState → мутации) ----
  const openLoggerNew = () => { setEditingEntry(null); setLoggerOpen(true); };
  const openLoggerEdit = (entry: LogEntry) => { setEditingEntry(entry); setLoggerOpen(true); };
  const closeLogger = () => { setLoggerOpen(false); setEditingEntry(null); };

  const handleSave = (entry: FoodLog | Activity) => {
    if (editingEntry) {
      if (entry.type === 'food') {
        const e = entry as FoodLog;
        updateFood.mutate({ id: editingEntry.id, name: e.name, calories: e.calories, protein: e.protein, fat: e.fat, carbs: e.carbs, timestamp: e.timestamp });
      } else {
        const a = entry as Activity;
        updateAct.mutate({ id: editingEntry.id, type: a.type, subtype: a.subtype ?? undefined, duration: a.duration, calories: a.calories, hours: a.hours, quality: a.quality, timestamp: a.timestamp });
      }
      toast('✓ Изменения сохранены');
    } else if (entry.type === 'food') {
      const e = entry as FoodLog;
      createFood.mutate({ name: e.name, calories: e.calories, protein: e.protein, fat: e.fat, carbs: e.carbs, timestamp: e.timestamp });
      toast(`✓ ${e.name || 'Приём пищи'} · ${e.calories || 0} ккал`);
      // автосохранение нового блюда в каталог (1:1 с прототипом)
      const trimmed = (e.name || '').trim();
      if (trimmed && !dishes.some(d => d.name.toLowerCase() === trimmed.toLowerCase())) {
        saveDish.mutate({ name: trimmed, calories: e.calories, protein: e.protein, fat: e.fat, carbs: e.carbs });
      }
    } else {
      const a = entry as Activity;
      createAct.mutate({ type: a.type, subtype: a.subtype ?? undefined, duration: a.duration, calories: a.calories, hours: a.hours, quality: a.quality, timestamp: a.timestamp });
      toast(`✓ ${a.type === 'workout' ? 'Тренировка' : a.type === 'sleep' ? 'Сон' : 'Активность'}`);
    }
    closeLogger();
  };

  const handleDelete = (entry: LogEntry) => {
    if (entry.type === 'food') deleteFood.mutate(entry.id);
    else deleteAct.mutate(entry.id);
    toast(`Удалено: ${entryLabel(entry)}`, 'danger');
  };

  const handleSetGoal = (g: Goal) => {
    setGoal.mutate(g);
    toast(`🎯 Цель: ${g.targetValue}${g.assessment?.targetUnit || ''}`, 'goal');
  };

  const openDishEditor = (dish: Dish | null) => { setDishEditorDish(dish); setDishEditorOpen(true); };
  const closeDishEditor = () => { setDishEditorOpen(false); setDishEditorDish(null); };
  const handleSaveDish = (dish: DishDraft) => {
    saveDish.mutate({ id: dish.id, name: dish.name, calories: dish.calories, protein: dish.protein, fat: dish.fat, carbs: dish.carbs });
    toast(dish.id ? `✓ Обновлено: ${dish.name}` : `✓ Добавлено: ${dish.name}`);
    closeDishEditor();
  };
  const handleDeleteDish = (dish: Dish) => {
    deleteDish.mutate(dish.id);
    toast(`Удалено: ${dish.name}`, 'danger');
  };

  const openInbodyEditorNew = () => { setInbodyEditorEntry(null); setInbodyEditorOpen(true); };
  const openInbodyEditorEdit = (entry: InBodyEntry) => { setInbodyEditorEntry(entry); setInbodyEditorOpen(true); };
  const closeInbodyEditor = () => { setInbodyEditorOpen(false); setInbodyEditorEntry(null); };

  const handleSaveInbody = (entry: InBodyDraft) => {
    const payload = { date: entry.date, weight: entry.weight, fatPercent: entry.fatPercent, musclePercent: entry.musclePercent };
    if (entry.id) {
      updateInbody.mutate({ id: entry.id, ...payload });
      toast('✓ Замер обновлён');
    } else {
      createInbody.mutate(payload);
      toast('✓ Замер добавлен');
    }
    closeInbodyEditor();
  };
  const handleDeleteInbody = (entry: InBodyEntry) => {
    deleteInbody.mutate(entry.id);
    toast('Замер удалён', 'danger');
  };

  const handleLogout = async () => { await signOut(); };

  // ---- guard-состояния ----
  if (baselineLoading || foodQ.isLoading || profile === undefined) {
    return (
      <div className="app">
        <div className="header"><div className="logo">Meta<span>bo</span></div></div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Skeleton h={120} /><Skeleton h={220} /><Skeleton h={80} />
        </div>
      </div>
    );
  }
  if (!baseline || !todayData) {
    // нет ни одного замера — онбординг открывается редиректом в ProtectedLayout; на всякий случай заглушка
    return <div className="screen center"><div className="card">Нет базовых данных. Заполните профиль.</div></div>;
  }

  const userEmail = user?.email ?? user?.id ?? '';
  const userName = profile?.name || userEmail.split('@')[0] || '?';

  const modals = (
    <>
      {loggerOpen && <ActivityLogger baseline={baseline} editingEntry={editingEntry}
        dishes={dishes} onClose={closeLogger} onSave={handleSave} />}
      {dishEditorOpen && <DishEditor dish={dishEditorDish} onSave={handleSaveDish} onClose={closeDishEditor} />}
      {inbodyEditorOpen && <InBodyEditor entry={inbodyEditorEntry} baseline={baseline}
        onSave={handleSaveInbody} onClose={closeInbodyEditor} />}
      {profileOpen && (
        <ProfileEditor baseline={baseline} onClose={() => setProfileOpen(false)}
          onSave={(p) => {
            updateProfileMut.mutate({
              name: p.name || null, age: p.age || null,
              height_cm: p.height || null, activity_level: p.activityLevel,
            });
            toast('✓ Профиль обновлён');
            setProfileOpen(false);
          }} />
      )}
      {helpOpen && (
        <div className="modal-backdrop" onClick={() => setHelpOpen(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">📖 Справка</div>
              <button className="close-btn" onClick={() => setHelpOpen(false)}>×</button>
            </div>
            <div className="modal-body"><HelpContent /></div>
          </div>
        </div>
      )}
    </>
  );

  const mapBlock = (
    <>
      <MetabolismMap baseline={baseline} todayData={todayData} sim={simulation} plan={plan}
        hasAnyData={hasAnyData} goal={goal}
        foodLogs={foodLogs} activities={activities}
        onOpenLogger={openLoggerNew} onGoToGoal={goToGoal} />
      <ActivityHistory foodLogs={foodLogs} activities={activities}
        onEdit={openLoggerEdit} onDelete={handleDelete} />
    </>
  );

  if (isMobile) {
    return (
      <div className="app">
        <div className="mobile-header">
          <div className="logo">Meta<span>bo</span></div>
          <div className="mobile-user">
            <div className="mobile-avatar" style={{ cursor: 'pointer' }} onClick={() => setMobileTab('profile')}>
              {userName.charAt(0).toUpperCase()}
            </div>
            <span>{userEmail.split('@')[0] || 'демо'}</span>
          </div>
        </div>
        <div className="mobile-content">
          {mobileTab === 'map' && mapBlock}
          {mobileTab === 'goal' && (
            <><div className="mobile-page-title">Цель</div>
              <GoalTab baseline={baseline} tdee={todayData.tdee} goal={goal} plan={plan} onSetGoal={handleSetGoal} /></>
          )}
          {mobileTab === 'dishes' && (
            <DishesTab dishes={dishes} onEditDish={openDishEditor} onDeleteDish={handleDeleteDish}
              onAddDish={() => openDishEditor(null)} />
          )}
          {mobileTab === 'journal' && (
            <><div className="mobile-page-title">Журнал</div>
              <Journal history={history} goal={goal} baseline={baseline} sim={simulation} todayData={todayData}
                inbodyLogs={inbodyLogs} onEditInbody={openInbodyEditorEdit}
                onDeleteInbody={handleDeleteInbody} onAddInbody={openInbodyEditorNew} /></>
          )}
          {mobileTab === 'profile' && (
            <MobileProfile user={userEmail} baseline={baseline} goal={goal}
              onLogout={() => void handleLogout()} onUpdateBaseline={openInbodyEditorNew}
              onOpenHelp={() => setHelpOpen(true)} />
          )}
        </div>
        <MobileNav tab={mobileTab} onTab={setMobileTab} onAdd={openLoggerNew} />
        {modals}
      </div>
    );
  }

  return (
    <div className="app">
      <div className="header">
        <div className="logo">Meta<span>bo</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="tabs">
            <button className={`tab ${tab === 'map' ? 'active' : ''}`} onClick={() => setTab('map')}>Карта</button>
            <button className={`tab ${tab === 'goal' ? 'active' : ''}`} onClick={() => setTab('goal')}>Цель</button>
            <button className={`tab ${tab === 'dishes' ? 'active' : ''}`} onClick={() => setTab('dishes')}>Рацион</button>
            <button className={`tab ${tab === 'journal' ? 'active' : ''}`} onClick={() => setTab('journal')}>Журнал</button>
            <button className={`tab ${tab === 'help' ? 'active' : ''}`} onClick={() => setTab('help')}>📖 Справка</button>
          </div>
          <div className="mobile-avatar" style={{ cursor: 'pointer' }} title={userEmail} onClick={() => setProfileOpen(true)}>
            {userName.charAt(0).toUpperCase()}
          </div>
          <button className="close-btn" onClick={() => void handleLogout()} title="Выйти">⏻</button>
        </div>
      </div>
      {tab === 'map' && mapBlock}
      {tab === 'goal' && (
        <GoalTab baseline={baseline} tdee={todayData.tdee} goal={goal} plan={plan} onSetGoal={handleSetGoal} />
      )}
      {tab === 'dishes' && (
        <DishesTab dishes={dishes} onEditDish={openDishEditor} onDeleteDish={handleDeleteDish}
          onAddDish={() => openDishEditor(null)} />
      )}
      {tab === 'journal' && (
        <Journal history={history} goal={goal} baseline={baseline} sim={simulation} todayData={todayData}
          inbodyLogs={inbodyLogs} onEditInbody={openInbodyEditorEdit}
          onDeleteInbody={handleDeleteInbody} onAddInbody={openInbodyEditorNew} />
      )}
      {tab === 'help' && <HelpTab />}
      {modals}
    </div>
  );
}

// отдельная функция не нужна — simulateDay вызывается напрямую в useMemo выше
