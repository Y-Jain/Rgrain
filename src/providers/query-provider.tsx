"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState, useEffect } from "react";
import { useAuthStore } from "@/lib/store/auth-store";

function AuthInterceptor({ children }: { children: ReactNode }) {
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (response.status === 401 && !window.location.pathname.startsWith('/login')) {
        // Clear local storage and redirect to login
        logout();
        window.location.href = "/login";
      }
      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [logout]);

  return <>{children}</>;
}

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: true,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthInterceptor>{children}</AuthInterceptor>
    </QueryClientProvider>
  );
}
