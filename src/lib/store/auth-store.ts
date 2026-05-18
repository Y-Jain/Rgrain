import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Role = "superadmin" | "admin" | "staff";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  branchId?: string; // Admin and Staff are scoped to a branch
  branchName?: string;
  permissions?: {
    canApprove: boolean;
    canViewLedger: boolean;
    canPrintSlips: boolean;
    canManageStaff: boolean;
    canSetRates: boolean;
    canManageStock: boolean;
    canManageFarmers: boolean;
    canCreateSlips: boolean;
    canSmallScale: boolean;
    canLogVehicles: boolean;
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: "auth-storage",
    }
  )
);
