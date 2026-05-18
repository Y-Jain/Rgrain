"use client";

import React from "react";
import SuperAdminLayout from "@/components/layout/SuperAdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";

import { 
  History as HistoryIcon,
  Search as SearchIcon,
  Filter as FilterIcon,
  Download as DownloadIcon,
  AlertTriangle as AlertIcon,
  User as UserIcon,
  Building2 as BuildingIcon,
  Globe as GlobeIcon,
  Lock as LockIcon,
  ArrowRight as ArrowIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const mockAuditLogs = [
  { id: "LOG-1024", timestamp: "2024-04-22 14:32:10", user: "Ashok Sharma", role: "Admin", branch: "Karnal Mandi", action: "Payment Modified", details: "₹45,000 → ₹48,500", severity: "high", ip: "192.168.1.45" },
  { id: "LOG-1023", timestamp: "2024-04-22 14:15:05", user: "Global Owner", role: "Super Admin", branch: "System", action: "Branch Created", details: "Sirsa Branch (BR-004)", severity: "medium", ip: "103.45.21.9" },
  { id: "LOG-1022", timestamp: "2024-04-22 13:58:22", user: "Vikram Singh", role: "Admin", branch: "Sonepat Godown", action: "Stock Outward", details: "Dispatch #DIS-442", severity: "low", ip: "192.168.1.88" },
  { id: "LOG-1021", timestamp: "2024-04-22 13:45:00", user: "Amit Singh", role: "Staff", branch: "Karnal Mandi", action: "Login Failed", details: "Attempt #3", severity: "high", ip: "42.106.19.4" },
  { id: "LOG-1020", timestamp: "2024-04-22 13:20:15", user: "Pritam Kaur", role: "Admin", branch: "Ambala City", action: "Settings Changed", details: "Rate Master Updated", severity: "medium", ip: "192.168.2.12" },
];

export default function AuditLogsPage() {
  return (
    <SuperAdminLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-outfit">System Audit Logs</h1>
          <p className="text-slate-500 text-sm">Immutable trail of every critical action performed across the platform.</p>
        </div>
        <button 
          onClick={() => toast.success("Preparing Audit Log Export (XLSX)...")}
          className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white rounded-xl text-sm font-bold hover:bg-slate-50 transition-all text-slate-700 shadow-sm"
        >
          <DownloadIcon className="w-4 h-4" />
          Export XLSX
        </button>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-sm">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Filter by action or user..." 
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm"
                />
              </div>
              <button 
                onClick={() => toast.info("Advanced audit filters coming soon.")}
                className="inline-flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"
              >
                <FilterIcon className="w-3.5 h-3.5" />
                Advanced Filters
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-full text-[10px] font-black uppercase tracking-tight border border-red-100">
                <AlertIcon className="w-3 h-3" />
                3 High Risk Events Today
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 uppercase text-[10px] font-black tracking-widest border-b border-slate-100">
                  <th className="text-left py-4 px-6">Timestamp</th>
                  <th className="text-left py-4 px-6">Identity</th>
                  <th className="text-left py-4 px-6">Location</th>
                  <th className="text-left py-4 px-6">Action & Details</th>
                  <th className="text-left py-4 px-6">Context</th>
                  <th className="text-right py-4 px-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {mockAuditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{log.timestamp.split(' ')[1]}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{log.timestamp.split(' ')[0]}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                          <UserIcon className="w-4 h-4 text-slate-500" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-700">{log.user}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">{log.role}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-slate-500">
                        {log.branch === "System" ? <GlobeIcon className="w-4 h-4" /> : <BuildingIcon className="w-4 h-4" />}
                        <span className="font-medium">{log.branch}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1">
                        <span className={cn(
                          "font-bold",
                          log.severity === "high" ? "text-red-600" : "text-slate-900"
                        )}>
                          {log.action}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded w-fit">
                          {log.details}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                        <GlobeIcon className="w-3 h-3" />
                        {log.ip}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tight",
                        log.severity === "high" ? "bg-red-100 text-red-700" : 
                        log.severity === "medium" ? "bg-amber-100 text-amber-700" : 
                        "bg-green-100 text-green-700"
                      )}>
                        {log.severity}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-6 border-t border-slate-100 flex items-center justify-center bg-slate-50/30">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <LockIcon className="w-3 h-3" />
              Logs are cryptographically sealed and immutable.
            </div>
          </div>
        </CardContent>
      </Card>
    </SuperAdminLayout>
  );
}
