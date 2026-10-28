// §4.2 AuthStore (zustand): сессия Supabase как единственный источник истины.
import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string; needsConfirm?: boolean }>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,

  init: async () => {
    try {
      const { data } = await supabase.auth.getSession();
      set({ session: data.session, user: data.session?.user ?? null, loading: false });
    } catch {
      // Supabase ещё не настроен (нет URL) — gate-экран настройки покажет форму;
      // дальше просто редирим на /login без сессии.
      set({ session: null, user: null, loading: false });
    }
  },

  signIn: async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      // FIX: НЕ полагаемся только на событие onAuthStateChange (в StrictMode подписка
      // могла теряться). Принудительно синхронизируем стор сразу после успешного входа —
      // RequireAuth тут же пропускает на /, App рендерит онбординг/Home.
      if (data.session) {
        set({ session: data.session, user: data.session.user, loading: false });
      } else {
        const { data: g } = await supabase.auth.getSession();
        if (g.session) set({ session: g.session, user: g.session.user, loading: false });
      }
      return {};
    } catch (e) {
      // Сетевая ошибка fetch (недоступен хост, CORS, битый URL) — иначе кнопка «молчит»
      return { error: 'Сбой соединения с сервером: ' + String((e as Error)?.message ?? e) };
    }
  },

  signUp: async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return { error: error.message };
      // DECISION: если подтверждение email включено, session === null — просим подтвердить.
      if (data.session) {
        set({ session: data.session, user: data.session.user, loading: false });
        return {};
      }
      return { needsConfirm: true };
    } catch (e) {
      return { error: 'Сбой соединения с сервером: ' + String((e as Error)?.message ?? e) };
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null });
  },
}));
