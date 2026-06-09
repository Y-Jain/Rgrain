"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { 
  LayoutDashboard, 
  Scale, 
  Package, 
  Users, 
  CheckCircle, 
  Warehouse, 
  BookOpen, 
  BarChart3, 
  Settings, 
  Menu, 
  X, 
  LogOut,
  Bell,
  Search,
  TrendingUp,
  CalendarCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/store/auth-store";
import { motion, AnimatePresence } from "framer-motion";

// Mapping of permission templates to permitted modules
const templatePermissions: Record<string, string[]> = {
  "Weighman": ["Weighbridge", "Farmers"],
  "Cashier": ["Farmers", "Ledger", "Approvals"],
  "Godown Keeper": ["Stock", "Small Scale"],
  "Small Scale": ["Small Scale", "Farmers"],
  "General Labor": [],
};

const sidebarItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Weighbridge", href: "/dashboard/weighbridge", icon: Scale, module: "Weighbridge" },
  { name: "Small Scale", href: "/dashboard/small-scale", icon: Package, module: "Small Scale" },
  { name: "Farmers", href: "/dashboard/farmers", icon: Users, module: "Farmers" },
  { name: "Approvals", href: "/dashboard/approvals", icon: CheckCircle, module: "Approvals" },
  { name: "Stock", href: "/dashboard/stock", icon: Warehouse, module: "Stock" },
  { name: "Ledger", href: "/dashboard/ledger", icon: BookOpen, module: "Ledger" },
  // { name: "Reports",    href: "/dashboard/reports",    icon: BarChart3,      roles: ["superadmin", "admin"] },
  { name: "Rates",      href: "/dashboard/rates",      icon: TrendingUp,     roles: ["superadmin", "admin"] },
  { name: "Attendance", href: "/dashboard/staff?tab=attendance", icon: CalendarCheck, roles: ["superadmin", "admin"] },
  { name: "Staff",      href: "/dashboard/staff",      icon: Settings,       roles: ["superadmin", "admin"] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");
  const { user, logout } = useAuthStore();

  // Handle initialization and persistence
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      
      if (mobile) {
        setIsSidebarOpen(false);
      } else {
        const savedState = localStorage.getItem("sidebar-open");
        if (savedState !== null) {
          setIsSidebarOpen(savedState === "true");
        } else {
          setIsSidebarOpen(true);
        }
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebar = () => {
    const newState = !isSidebarOpen;
    setIsSidebarOpen(newState);
    if (!isMobile) {
      localStorage.setItem("sidebar-open", newState.toString());
    }
  };

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

  const filteredItems = sidebarItems.filter(item => {
    // 1. Role-based check (Superadmin/Admin)
    if (item.roles) {
      return user && item.roles.includes(user.role);
    }

    // 2. Dashboard is always visible for Admin/Superadmin
    if (item.name === "Dashboard") {
      return user && (user.role === "admin" || user.role === "superadmin");
    }

    // 3. For Staff, check template permissions
    if (user?.role === "staff") {
      const template = (user.permissions as any)?.template;
      if (template) {
        const list = typeof template === 'string' ? template.split(',').map(t => t.trim()) : [];
        return list.some(tmpl => templatePermissions[tmpl] && item.module && templatePermissions[tmpl].includes(item.module));
      }
      return false; // Staff without template see only dashboard
    }

    // 4. Default for Admin/Superadmin (if item has no roles restriction)
    return true;
  });

  return (
    <div className="flex h-screen bg-background overflow-hidden font-outfit">
      {/* Sidebar Backdrop (Mobile only) */}
      <AnimatePresence>
        {isMobile && isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside 
        animate={{
          width: isSidebarOpen ? 288 : 80,
          x: isMobile && !isSidebarOpen ? -288 : 0
        }}
        transition={{ type: "spring", stiffness: 350, damping: 35 }}
        className={cn(
          "bg-card border-r border-border flex flex-col z-[70] h-full overflow-hidden",
          isMobile && "fixed inset-y-0 left-0 shadow-[20px_0_50px_-10px_rgba(0,0,0,0.3)]"
        )}
      >
        <div className={cn(
          "flex items-center justify-between gap-3 transition-all duration-300",
          isSidebarOpen ? "p-8" : "p-5 justify-center"
        )}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground font-black shadow-lg shadow-primary/20 shrink-0">
              GP
            </div>
            <AnimatePresence mode="wait">
              {isSidebarOpen && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col"
                >
                  <span className="font-black text-xl tracking-tighter whitespace-nowrap overflow-hidden">
                    Grain Portal
                  </span>
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">Management v1.0</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {isMobile && isSidebarOpen && (
            <button aria-label="Close Sidebar" onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-muted rounded-xl transition-colors">
              <X className="w-6 h-6 text-muted-foreground" />
            </button>
          )}
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto scrollbar-none">
          {filteredItems.map((item) => {
            const itemUrl = new URL(item.href, "http://localhost");
            const itemPath = itemUrl.pathname;
            const itemTab = itemUrl.searchParams.get("tab");
            
            const isActive = itemTab 
              ? (pathname === itemPath && currentTab === itemTab)
              : (pathname === itemPath && !currentTab);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => isMobile && setIsSidebarOpen(false)}
                className={cn(
                  "flex items-center rounded-2xl transition-all duration-300 group relative",
                  isSidebarOpen ? "px-4 py-3 gap-4" : "p-3 justify-center",
                  isActive 
                    ? "text-primary-foreground font-black" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute inset-0 bg-primary rounded-2xl shadow-lg shadow-primary/20"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                
                <item.icon className={cn("w-5 h-5 shrink-0 transition-transform group-hover:scale-110 relative z-10", isActive ? "text-white" : "text-muted-foreground group-hover:text-foreground")} />
                
                <AnimatePresence mode="wait">
                  {isSidebarOpen && (
                    <motion.span 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.15 }}
                      className="text-sm tracking-tight relative z-10 whitespace-nowrap overflow-hidden"
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>
                
                {!isSidebarOpen && !isMobile && (
                  <div className="absolute left-16 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 whitespace-nowrap pointer-events-none z-[80] shadow-xl">
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        <div className={cn(
          "border-t border-border transition-all duration-300",
          isSidebarOpen ? "p-6" : "p-4 flex justify-center"
        )}>
          <button
            onClick={handleLogout}
            className={cn(
              "flex items-center rounded-2xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all group relative font-bold",
              isSidebarOpen ? "px-4 py-3 gap-4 w-full" : "p-3 justify-center"
            )}
          >
            <LogOut className="w-5 h-5 shrink-0 transition-transform group-hover:-translate-x-1" />
            <AnimatePresence mode="wait">
              {isSidebarOpen && (
                <motion.span 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                  className="text-sm whitespace-nowrap overflow-hidden"
                >
                  Logout Session
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Navbar */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-border/50 flex items-center justify-between px-4 sm:px-8 shrink-0 z-40">
          <div className="flex items-center gap-3 sm:gap-6">
            <button 
              aria-label="Toggle Sidebar"
              onClick={toggleSidebar}
              className="p-3 bg-muted/50 hover:bg-primary/10 hover:text-primary rounded-2xl transition-all shadow-sm group"
            >
              <Menu className="w-6 h-6 transition-transform group-hover:scale-110" />
            </button>
            
            {/* Logo in Header (Mobile only) */}
            {isMobile && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-black text-xs">
                  GP
                </div>
                <span className="font-black text-sm tracking-tighter">Grain Portal</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button aria-label="Notifications" className="p-3 hover:bg-muted rounded-2xl relative transition-all group border border-transparent hover:border-border">
              <Bell className="w-5 h-5 text-muted-foreground group-hover:text-foreground" />
              <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-white animate-pulse" />
            </button>
            
            <div className="h-10 w-px bg-border/50 mx-1 sm:mx-2" />
            
            <div className="relative">
              <button 
                aria-label="User Menu"
                aria-expanded={showUserDropdown}
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1.5 rounded-2xl transition-all outline-none"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-black leading-none text-slate-900 uppercase tracking-tight">{user?.name || "User Account"}</p>
                  <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mt-1.5">{(user?.permissions as any)?.template || user?.role || "Operator"}</p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10 text-primary font-black shadow-inner shadow-primary/5">
                  {user?.name?.charAt(0) || "U"}
                </div>
              </button>

              {showUserDropdown && (
                <>
                  {/* Click-outside backdrop */}
                  <div className="fixed inset-0 z-50 cursor-default" onClick={() => setShowUserDropdown(false)} />
                  
                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-[60] animate-in fade-in slide-in-from-top-2 duration-200">
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors font-bold text-left"
                    >
                      <LogOut className="w-4 h-4 shrink-0" />
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Content Scroll Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-10 bg-[#f8fafc] relative">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
