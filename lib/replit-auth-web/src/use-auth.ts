import { useCallback, useEffect, useState } from "react";
import type { AuthUser } from "@workspace/api-client-react";

export type { AuthUser };

type AuthState = {
  user: AuthUser | null;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
};

export function useAuth(basePath: string): AuthState {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const returnTo = basePath.replace(/\/+$/, "") || "/";

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/user", { credentials: "include", cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`Authentication status returned ${response.status}`);
        return response.json() as Promise<{ user: AuthUser | null }>;
      })
      .then(({ user: authenticatedUser }) => {
        if (cancelled) return;
        setUser(authenticatedUser ?? null);
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setUser(null);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(() => {
    window.location.href = `/api/login?returnTo=${encodeURIComponent(returnTo)}`;
  }, [returnTo]);

  const logout = useCallback(() => {
    window.location.href = `/api/logout?returnTo=${encodeURIComponent(returnTo)}`;
  }, [returnTo]);

  return { user, isLoading, login, logout };
}