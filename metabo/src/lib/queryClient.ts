import { QueryClient } from '@tanstack/react-query';

// DECISION: staleTime 30с + retry 1 — данные меняются редко, а при offline-first не крутим запросы.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
});
