import { createContext, useContext, useState, ReactNode } from "react";
import type { UserRole } from "@/data/runTypes";

interface AuthUser {
  name: string;
  role: UserRole;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (name: string, role: UserRole) => void;
  logout: () => void;
  canLogEvents: boolean;
  isManager: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem("bioprocess_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = (name: string, role: UserRole) => {
    const u = { name, role };
    setUser(u);
    localStorage.setItem("bioprocess_user", JSON.stringify(u));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("bioprocess_user");
  };

  const canLogEvents = user?.role === "operator" || user?.role === "manager";
  const isManager = user?.role === "manager";

  return (
    <AuthContext.Provider value={{ user, login, logout, canLogEvents, isManager }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
