// Форматтеры — из прототипа 1:1.
export function formatSigned(n: number, d = 0): string {
  return (n >= 0 ? '+' : '−') + Math.abs(n).toFixed(d);
}

export function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function plural(n: number, forms: [string, string, string]): string {
  if (n % 10 === 1 && n % 100 !== 11) return forms[0];
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return forms[1];
  return forms[2];
}

export function formatDayLabel(date: Date | string): string {
  const now = new Date();
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  if (d.getTime() === today.getTime()) return 'Сегодня';
  if (d.getTime() === yesterday.getTime()) return 'Вчера';
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}
