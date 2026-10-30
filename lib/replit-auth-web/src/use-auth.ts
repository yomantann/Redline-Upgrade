import { useCallback, useEffect, useState } from "react";
import type { AuthUser } from "@workspace/api-client-react";

export type { AuthUser };
export const AUTH_USER_UPDATED_EVENT = "redline:auth-user-updated";

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
    let requestVersion = 0;
    const refresh = async (showLoading: boolean) => {
      const version = ++requestVersion;
      if (showLoading) setIsLoading(true);
      try {
        const response = await fetch("/api/auth/user", { credentials: "include", cache: "no-store" });
        if (!response.ok) throw new Error(`Authentication status returned ${response.status}`);
        const { user: authenticatedUser } = await response.json() as { user: AuthUser | null };
        if (!cancelled && version === requestVersion) setUser(authenticatedUser ?? null);
      } catch {
        if (!cancelled && version === requestVersion) setUser(null);
      } finally {
        if (!cancelled && version === requestVersion) setIsLoading(false);
      }
    };
    const refreshAfterProfileUpdate = () => { void refresh(false); };
    void refresh(true);
    window.addEventListener(AUTH_USER_UPDATED_EVENT, refreshAfterProfileUpdate);

    return () => {
      cancelled = true;
      window.removeEventListener(AUTH_USER_UPDATED_EVENT, refreshAfterProfileUpdate);
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