import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        // Don't retry on 401 (unauthorized) or 403 (forbidden) errors
        if ([401, 403].includes(error?.response?.status)) {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
});
