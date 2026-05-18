"use client";

import React, { Suspense } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Loader2 } from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-[#f8fafc]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse font-black uppercase tracking-widest text-[10px]">Loading Dashboard...</p>
      </div>
    }>
      <DashboardLayout>{children}</DashboardLayout>
    </Suspense>
  );
}
