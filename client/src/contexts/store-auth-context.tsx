import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";

interface StoreCustomer {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  address?: string;
}

interface StoreAuthContextType {
  customer: StoreCustomer | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: { email: string; password: string; fullName: string; phone?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  error: string | null;
}

const StoreAuthContext = createContext<StoreAuthContextType | undefined>(undefined);

export function StoreAuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<StoreCustomer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const res = await fetch("/api/store/auth/session");
      const data = await res.json();
      if (data.isAuthenticated && data.customer) {
        setCustomer(data.customer);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    setError(null);
    const res = await apiRequest("POST", "/api/store/auth/login", { email, password });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Login failed");
    }
    const data = await res.json();
    setCustomer(data);
  }

  async function signup(signupData: { email: string; password: string; fullName: string; phone?: string }) {
    setError(null);
    const res = await apiRequest("POST", "/api/store/auth/signup", signupData);
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Signup failed");
    }
    const data = await res.json();
    setCustomer(data);
  }

  async function logout() {
    await apiRequest("POST", "/api/store/auth/logout");
    setCustomer(null);
  }

  async function refreshProfile() {
    try {
      const res = await fetch("/api/store/auth/profile");
      if (res.ok) {
        const data = await res.json();
        setCustomer(data);
      }
    } catch {}
  }

  return (
    <StoreAuthContext.Provider
      value={{
        customer,
        isAuthenticated: !!customer,
        isLoading,
        login,
        signup,
        logout,
        refreshProfile,
        error,
      }}
    >
      {children}
    </StoreAuthContext.Provider>
  );
}

export function useStoreAuth() {
  const context = useContext(StoreAuthContext);
  if (!context) {
    throw new Error("useStoreAuth must be used within a StoreAuthProvider");
  }
  return context;
}
