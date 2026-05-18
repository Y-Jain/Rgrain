"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  BarChart4, 
  Building2, 
  ShieldCheck, 
  CreditCard, 
  Palette, 
  FileLock2, 
  History, 
  Database, 
  Settings,
  LogOut,
  Bell,
  Search,
  Menu,
  X,
  ChevronRight,
  UserCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/store/auth-store";

const superAdminItems = [
  { name: "Analytics", href: "/superadmin/analytics", icon: BarChart4 },
  { name: "Branches", href: "/superadmin/branches", icon: Building2 },
  { name: "Admins", href: "/superadmin/admins", icon: ShieldCheck },
  { name: "Subscription", href: "/superadmin/subscription", icon: CreditCard },
  { name: "Branding", href: "/superadmin/branding", icon: Palette },
  { name: "Permissions", href: "/superadmin/permissions", icon: FileLock2 },
  { name: "Audit Logs", href: "/superadmin/audit", icon: History },
  { name: "Backup", href: "/superadmin/backup", icon: Database },
  { name: "Master Settings", href: "/superadmin/settings", icon: Settings },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      logout();
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed:", error);
      // Fallback: clear local state and redirect anyway
      logout();
      window.location.href = "/login";
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Super Admin Sidebar - Distinct Dark Theme */}
      <aside 
        className={cn(
          "bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col transition-all duration-300 ease-in-out z-30 shadow-2xl",
          isSidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className="p-6 flex items-center gap-3 border-b border-slate-800 bg-slate-950/50">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shrink-0 shadow-lg shadow-blue-900/20">
            HQ
          </div>
          {isSidebarOpen && (
            <div className="overflow-hidden">
              <span className="font-bold text-white text-lg tracking-tight block truncate">
                Central Command
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 block">
                Super Admin
              </span>
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {superAdminItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                  isActive 
                    ? "bg-blue-600 text-white font-semibold shadow-lg shadow-blue-900/40" 
                    : "hover:bg-slate-800 hover:text-white"
                )}
              >
                <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-white" : "text-slate-500 group-hover:text-blue-400")} />
                {isSidebarOpen && <span className="text-sm">{item.name}</span>}
                {!isSidebarOpen && (
                  <div className="absolute left-14 bg-slate-800 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-xl border border-slate-700">
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-950/20">
          <button
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-slate-400 hover:bg-red-900/20 hover:text-red-400 transition-all group relative",
            )}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span className="text-sm font-medium">Exit Console</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Super Admin Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-20">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full border border-slate-200">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">System Status: Optimal</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-xs font-bold text-slate-900">System Administrator</span>
              <span className="text-[10px] text-slate-500 font-medium">{user?.email}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white border border-slate-800 shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-[1600px] mx-auto space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
