// src/store/authStore.ts — полный исправленный файл (замените содержимое целиком).
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
      supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
        // DECISION (FIX «вход выполнен → редирект → пустая страница»):
        // при signIn сработавший на старте onAuthStateChange отдаёт событие INITIAL_SESSION
        // со СТАРЫМ токеном из sessionStorage. Если записать его в стор, только что
        // созданная сессия затирается, RequireAuth редиректит обратно на /login и всё
        // «зацикливается». Поэтому обновляем стор только если новая session !== текущей,
        // либо это явный выход (SIGNED_OUT).
        set((state) => {
          if (session === state.session) return state;
          if (!session && _event !== 'SIGNED_OUT' && state.session) return state;
          return { session, user: session?.user ?? null, loading: false };
        });
      });
    } catch {
      // Supabase ещё не настроен (нет URL) — gate-экран настройки покажет форму;
      // дальше просто редирим на /login без сессии.
      set({ session: null, user: null, loading: false });
    }
  },

  signIn: async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error && data.session) {
        // Принудительно обновляем стор сразу после успешного входа,
        // чтобы не зависеть от задержки onAuthStateChange (гонка промисов).
        set({ session: data.session, user: data.session.user, loading: false });
      }
      return { error: error?.message };
    } catch (e) {
      // Сетевая ошибка fetch (недоступен хост, CORS, битый URL) — иначе кнопка «молчит»
      return { error: 'Сбой соединения с сервером: ' + String((e as Error)?.message ?? e) };
    }
  },

  signUp: async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return { error: error.message };
      if (data.session) {
        // Email-подтверждение выключено — сессия есть сразу, обновляем стор немедленно.
        set({ session: data.session, user: data.session.user, loading: false });
      }
      // DECISION: если подтверждение email включено, session === null — просим подтвердить.
      return { needsConfirm: !data.session };
    } catch (e) {
      return { error: 'Сбой соединения с сервером: ' + String((e as Error)?.message ?? e) };
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
  },
}));
