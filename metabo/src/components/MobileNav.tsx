// MobileNav + MobileProfile — UI 1:1 с прототипом (§8.8 мобильный UX).
import type { Baseline, Goal } from '@/types/domain';

type MobileTab = 'map' | 'goal' | 'dishes' | 'journal' | 'profile';

const IconMap = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>;
const IconGoal = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>;
const IconJournal = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>;
const IconMenu = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" /></svg>;

export function MobileNav({ tab, onTab, onAdd }: { tab: MobileTab; onTab: (t: MobileTab) => void; onAdd: () => void }) {
  return (
    <div className="mobile-nav">
      <button className={`mobile-nav-item ${tab === 'map' ? 'active' : ''}`} onClick={() => onTab('map')}><IconMap />Карта</button>
      <button className={`mobile-nav-item ${tab === 'goal' ? 'active' : ''}`} onClick={() => onTab('goal')}><IconGoal />Цель</button>
      <button className="mobile-nav-add" onClick={onAdd} aria-label="Добавить">+</button>
      <button className={`mobile-nav-item ${tab === 'dishes' ? 'active' : ''}`} onClick={() => onTab('dishes')}><IconMenu />Рацион</button>
      <button className={`mobile-nav-item ${tab === 'journal' ? 'active' : ''}`} onClick={() => onTab('journal')}><IconJournal />Журнал</button>
    </div>
  );
}

interface ProfileProps {
  user: string;
  baseline: Baseline;
  goal: Goal | null;
  onLogout: () => void;
  onUpdateBaseline: () => void;
  onOpenHelp: () => void;
}

export function MobileProfile({ user, baseline, goal, onLogout, onUpdateBaseline, onOpenHelp }: ProfileProps) {
  return (
    <div>
      <div className="mobile-page-title">Профиль</div>
      <div className="profile-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div className="mobile-avatar" style={{ width: 48, height: 48, fontSize: 18 }}>
            {(user || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{baseline.name || 'Пользователь'}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{user}</div>
          </div>
        </div>
        <div className="profile-row"><span className="profile-row-label">Возраст</span>
          <span className="profile-row-value">{baseline.age} лет</span></div>
        <div className="profile-row"><span className="profile-row-label">Рост</span>
          <span className="profile-row-value">{baseline.height} см</span></div>
        <div className="profile-row"><span className="profile-row-label">Вес</span>
          <span className="profile-row-value">{baseline.weight} кг</span></div>
        <div className="profile-row"><span className="profile-row-label">% жира</span>
          <span className="profile-row-value" style={{ color: 'var(--fat)' }}>{baseline.fatPercent}%</span></div>
        <div className="profile-row"><span className="profile-row-label">% мышц</span>
          <span className="profile-row-value" style={{ color: 'var(--muscle)' }}>{baseline.musclePercent}%</span></div>
        <div className="profile-row"><span className="profile-row-label">BMR</span>
          <span className="profile-row-value">{Math.round(baseline.bmr)} ккал</span></div>
      </div>
      {goal && (
        <div className="profile-card">
          <div className="stat-label" style={{ marginBottom: 12 }}>🎯 Активная цель</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--goal)', marginBottom: 6 }}>
            {goal.targetValue}{goal.assessment?.targetUnit} · {goal.targetType === 'weight' ? 'вес' : goal.targetType === 'fatPercent' ? 'жир' : 'мышцы'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            к {new Date(goal.targetDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
        <button className="btn secondary" onClick={onOpenHelp}>📖 Справка по методам</button>
        <button className="btn secondary" onClick={onUpdateBaseline}>+ Новый замер InBody</button>
        <button className="btn danger" onClick={onLogout}>Выйти из аккаунта</button>
      </div>
    </div>
  );
}
