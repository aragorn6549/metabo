// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { ErrorBoundary, ToastProvider } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { isSupabaseConfigured } from '@/lib/supabase';
import { App } from '@/App';
import '@/styles/global.css';

// Инициализация сессии Supabase до рендера (§4.2).
// Если ключи ещё не настроены — не трогаем сеть, gate-экран настройки сам перезагрузит
// страницу и инициирует auth после сохранения URL/ключа.
if (isSupabaseConfigured()) {
  void useAuthStore.getState().init();
} else {
  useAuthStore.setState({ loading: false });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
