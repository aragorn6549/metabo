// ActivityHistory — группировка по дням, аккордеон (сегодня раскрыт), ✎/× на записи. Перенос 1:1 (§8.4).
import { useMemo, useState } from 'react';
import type { Activity, FoodLog, LogEntry } from '@/types/domain';
import { formatDayLabel, formatTime, plural } from '@/lib/format';

const WORKOUT_NAMES: Record<string, string> = {
  strength: 'Силовая', cardio: 'Кардио', volleyball: 'Волейбол',
  padel: 'Падел', tennis: 'Теннис', football: 'Футбол', basketball: 'Баскетбол',
};
const OTHER_NAMES: Record<string, string> = {
  walk: 'Прогулка', work_sit: 'Работа сидячая', work_stand: 'Работа стоячая', chill: 'Спокойствие',
};

export function entryEmoji(e: LogEntry): string {
  return e.type === 'food' ? '🍽' : e.type === 'workout' ? '🏋️' : e.type === 'sleep' ? '😴' : '🚶';
}

export function entryLabel(e: LogEntry): string {
  if (e.type === 'food') return e.name || 'Приём пищи';
  if (e.type === 'workout') return (e.subtype && WORKOUT_NAMES[e.subtype]) || 'Тренировка';
  if (e.type === 'sleep') return 'Сон';
  return (e.subtype && OTHER_NAMES[e.subtype]) || 'Активность';
}

function entryMeta(e: LogEntry) {
  if (e.type === 'food') return <><strong>{e.calories || 0}</strong> ккал · Б <strong>{e.protein || 0}</strong> · Ж <strong>{e.fat || 0}</strong> · У <strong>{e.carbs || 0}</strong></>;
  if (e.type === 'workout') return <>{e.duration || 0} мин · <strong>{e.calories || 0}</strong> ккал</>;
  if (e.type === 'sleep') return <>{e.hours || 0} ч {e.quality ? `· качество ${e.quality}/5` : ''}</>;
  return <>{e.duration || 0} мин</>;
}

const TYPE_TITLES: Record<string, string> = {
  food: '🍽 Питание', workout: '🏋️ Тренировки', sleep: '😴 Сон', other: '🚶 Прочая активность',
};

interface Props {
  foodLogs: FoodLog[];
  activities: Activity[];
  onEdit: (entry: LogEntry) => void;
  onDelete: (entry: LogEntry) => void;
}

export function ActivityHistory({ foodLogs, activities, onEdit, onDelete }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const grouped = useMemo(() => {
    const map: Record<string, { dateKey: string; dateObj: Date; items: LogEntry[] }> = {};
    [...foodLogs, ...activities].forEach(item => {
      const d = new Date(item.timestamp);
      d.setHours(0, 0, 0, 0);
      const key = d.toDateString();
      if (!map[key]) map[key] = { dateKey: key, dateObj: d, items: [] };
      map[key].items.push(item);
    });
    const arr = Object.values(map);
    arr.forEach(g => g.items.sort((a, b) => b.timestamp - a.timestamp));
    return arr.sort((a, b) => Number(b.dateObj) - Number(a.dateObj));
  }, [foodLogs, activities]);

  const toggle = (key: string) => setExpanded(prev => ({
    ...prev, [key]: !(prev[key] ?? (key === new Date().toDateString())),
  }));
  const todayKey = new Date().toDateString();

  if (grouped.length === 0) return null;
  const totalRecords = grouped.reduce((s, g) => s + g.items.length, 0);

  return (
    <div className="history-list">
      <div className="history-list-header">
        <div className="history-list-title">
          История активностей <span>· {grouped.length} {plural(grouped.length, ['день', 'дня', 'дней'])}</span>
        </div>
        <div className="history-list-count">{totalRecords} {plural(totalRecords, ['запись', 'записи', 'записей'])}</div>
      </div>
      {grouped.map(g => {
        const isToday = g.dateKey === todayKey;
        const isOpen = expanded[g.dateKey] ?? isToday;
        const byType = {
          food: g.items.filter(e => e.type === 'food'),
          workout: g.items.filter(e => e.type === 'workout'),
          sleep: g.items.filter(e => e.type === 'sleep'),
          other: g.items.filter(e => e.type === 'other'),
        };
        const totalCals = (byType.food as FoodLog[]).reduce((s, f) => s + (+f.calories || 0), 0);
        return (
          <div key={g.dateKey} className="history-day">
            <button className="history-day-header" onClick={() => toggle(g.dateKey)}>
              <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                <span className={`history-day-chevron ${isOpen ? 'open' : ''}`}>›</span>
                <span className="history-day-title">{isToday ? 'Сегодня' : formatDayLabel(g.dateObj)}</span>
                <span className="history-day-count">{g.items.length} {plural(g.items.length, ['запись', 'записи', 'записей'])}</span>
              </div>
              {totalCals > 0 && (
                <span className="history-day-summary">{Math.round(totalCals)} ккал</span>
              )}
            </button>
            {isOpen && (
              <div className="history-day-body">
                {(['food', 'workout', 'sleep', 'other'] as const).map(k => {
                  const items = byType[k];
                  if (items.length === 0) return null;
                  return (
                    <div key={k} className="entry-group">
                      <div className="entry-group-label">{TYPE_TITLES[k]}</div>
                      {items.map(entry => (
                        <div key={entry.id} className="entry-row">
                          <div className="entry-info">
                            <div className="entry-label">
                              {entryEmoji(entry)} {entryLabel(entry)}
                              <span style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 500, marginLeft: 8 }}>
                                {formatTime(entry.timestamp)}
                              </span>
                            </div>
                            <div className="entry-meta">{entryMeta(entry)}</div>
                          </div>
                          <div className="entry-actions">
                            <button onClick={() => onEdit(entry)} title="Редактировать">✎</button>
                            <button className="danger" onClick={() => onDelete(entry)} title="Удалить">×</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
