"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore, Role } from "@/lib/store/auth-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/Card";
import { Lock, Mail, Loader2, Wheat, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent, role?: Role) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // If role is passed via the dev shortcut buttons, we might still want to try to log in,
      // but in a real app, the role is determined by the DB. We'll use the API now.
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      setAuth(data.user, data.token || "");
      
      // Note: The auth-token cookie is set securely as HttpOnly by the API.
      // Setting it via document.cookie here overwrites it with 'undefined' (since data.token is undefined)
      // which causes Safari/iOS to fail authentication checks during routing.
      document.cookie = `user-role=${data.user.role}; path=/; max-age=3600`;

      toast.success(`Welcome back, ${data.user.name}!`);
      
      if (data.user.role === "superadmin") {
        window.location.href = "/superadmin/analytics";
      } else if (data.user.role === "staff") {
        const templatePermissions: Record<string, string[]> = {
          "Weighman": ["Weighbridge", "Farmers"],
          "Cashier": ["Farmers", "Ledger", "Approvals"],
          "Godown Keeper": ["Stock", "Small Scale"],
          "Small Scale": ["Small Scale", "Farmers"],
          "General Labor": [],
        };
        const moduleRoutes: Record<string, string> = {
          "Weighbridge": "/dashboard/weighbridge",
          "Small Scale": "/dashboard/small-scale",
          "Farmers": "/dashboard/farmers",
          "Ledger": "/dashboard/ledger",
          "Approvals": "/dashboard/approvals",
          "Stock": "/dashboard/stock",
        };
        const template = data.user.permissions?.template;
        const templates = typeof template === 'string' ? template.split(',').map((t: string) => t.trim()) : [];
        const allowedModules: string[] = [];
        templates.forEach((t: string) => {
          if (templatePermissions[t]) {
            allowedModules.push(...templatePermissions[t]);
          }
        });
        let firstRoute = "/dashboard";
        if (allowedModules.length > 0) {
          for (const mod of allowedModules) {
            if (moduleRoutes[mod]) {
              firstRoute = moduleRoutes[mod];
              break;
            }
          }
        }
        window.location.href = firstRoute;
      } else {
        window.location.href = "/dashboard";
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

      <Card className="w-full max-w-md relative z-10 shadow-2xl border-primary/10">
        <CardHeader className="space-y-4 pb-8 text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground shadow-lg transform -rotate-6">
              <Wheat className="w-10 h-10" />
            </div>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold tracking-tight font-outfit text-foreground">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Sign in to manage your grain business operations
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground ml-1" htmlFor="email">
                Email / Mobile Number
              </label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  id="email"
                  type="text"
                  placeholder="Enter email or mobile number"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label className="text-sm font-medium text-foreground" htmlFor="password">
                  Password
                </label>
                <Link 
                  href="/forgot-password"
                  className="text-xs font-medium text-primary hover:underline transition-all"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-12 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-muted rounded-lg transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-2 ml-1">
              <input 
                type="checkbox" 
                id="remember" 
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary" 
              />
              <label htmlFor="remember" className="text-sm font-medium text-muted-foreground">
                Remember this device
              </label>
            </div>
            {/* 
            <div className="grid grid-cols-3 gap-2 p-1 bg-muted rounded-xl">
              {(["superadmin", "admin", "staff"] as Role[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleLogin(new Event('submit') as any, r)}
                  className="py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-background transition-all border border-transparent hover:border-border"
                >
                  {r}
                </button>
              ))}
            </div>
            */}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 pb-8 text-center border-t border-border/50 pt-6">
          <p className="text-xs text-muted-foreground">
            Trusted by industrial grain facilities across the country.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
