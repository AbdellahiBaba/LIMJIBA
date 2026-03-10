import { createContext, useContext, useState, useEffect, useRef, useCallback, createElement, type ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

interface User {
  id: string;
  username: string;
  isAdmin: boolean;
  displayName?: string;
  role?: string;
  permissions?: string;
}

export function hasPermission(user: User | null, module: string): boolean {
  if (!user) return false;
  if (user.isAdmin) return true;
  try {
    const perms: string[] = JSON.parse(user.permissions || "[]");
    return perms.includes(module);
  } catch {
    return false;
  }
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_TIMEOUT = 30 * 60 * 1000;
const WARNING_BEFORE = 5 * 60 * 1000;
const WARNING_AT = SESSION_TIMEOUT - WARNING_BEFORE;
const HEARTBEAT_INTERVAL = 5 * 60 * 1000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [error, setError] = useState<string | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef(Date.now());
  const { toast } = useToast();

  const { data: sessionData, isLoading: isSessionLoading, refetch } = useQuery<{ isAuthenticated: boolean; user?: User }>({
    queryKey: ["/api/auth/session"],
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const isAuthenticated = sessionData?.isAuthenticated || false;

  const clearTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    warningTimerRef.current = null;
    expiryTimerRef.current = null;
    heartbeatRef.current = null;
  }, []);

  const handleSessionExpired = useCallback(async () => {
    clearTimers();
    try {
      await apiRequest("POST", "/api/auth/logout", {});
    } catch {}
    queryClient.invalidateQueries({ queryKey: ["/api/auth/session"] });
    queryClient.clear();
    toast({
      title: "Session Expired",
      description: "You have been logged out due to inactivity.",
      variant: "destructive",
      duration: 10000,
    });
  }, [clearTimers, toast]);

  const touchServerRef = useRef<() => Promise<void>>(async () => {});

  const resetTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);

    warningTimerRef.current = setTimeout(() => {
      toast({
        title: "Session Expiring Soon",
        description: "Your session will expire in 5 minutes due to inactivity.",
        variant: "destructive",
        duration: WARNING_BEFORE,
        action: createElement(ToastAction, {
          altText: "Stay logged in",
          onClick: () => {
            lastActivityRef.current = Date.now();
            touchServerRef.current();
          },
          "data-testid": "button-extend-session",
        }, "Stay Logged In"),
      });
    }, WARNING_AT);

    expiryTimerRef.current = setTimeout(() => {
      handleSessionExpired();
    }, SESSION_TIMEOUT);
  }, [handleSessionExpired, toast]);

  touchServerRef.current = async () => {
    try {
      const res = await refetch();
      if (res.data?.isAuthenticated) {
        resetTimers();
      } else {
        handleSessionExpired();
      }
    } catch {
      handleSessionExpired();
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      clearTimers();
      return;
    }

    lastActivityRef.current = Date.now();
    resetTimers();

    heartbeatRef.current = setInterval(() => {
      const idleTime = Date.now() - lastActivityRef.current;
      if (idleTime < WARNING_AT) {
        refetch().catch(() => {});
      }
    }, HEARTBEAT_INTERVAL);

    const activityEvents = ["mousedown", "keydown", "scroll", "touchstart"];

    const handleActivity = () => {
      const now = Date.now();
      const timeSinceLast = now - lastActivityRef.current;
      if (timeSinceLast > 30000) {
        lastActivityRef.current = now;
        resetTimers();
      }
    };

    activityEvents.forEach(event => window.addEventListener(event, handleActivity, { passive: true }));

    return () => {
      activityEvents.forEach(event => window.removeEventListener(event, handleActivity));
      clearTimers();
    };
  }, [isAuthenticated, resetTimers, clearTimers, refetch]);

  const loginMutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const response = await apiRequest("POST", "/api/auth/login", { username, password });
      return response.json();
    },
    onError: (error: any) => {
      setError(error.message || "Login failed");
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/logout", {});
      return response.json();
    },
    onSuccess: () => {
      clearTimers();
      queryClient.invalidateQueries({ queryKey: ["/api/auth/session"] });
      queryClient.clear();
    },
  });

  const login = async (username: string, password: string) => {
    setError(null);
    await loginMutation.mutateAsync({ username, password });
    await refetch();
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  return (
    <AuthContext.Provider
      value={{
        user: sessionData?.user || null,
        isAuthenticated,
        isLoading: isSessionLoading || loginMutation.isPending,
        login,
        logout,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
