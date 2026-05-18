"use client";

import React, { useState, useEffect } from "react";
import * as XLSX from 'xlsx';
import { 
  X, 
  Loader2, 
  Calendar, 
  Award, 
  TrendingUp, 
  User, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  CalendarDays,
  Download,
  Filter,
  History,
  CalendarDays as DayIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface StaffLedgerModalProps {
  staff: any;
  onClose: () => void;
}

export default function StaffLedgerModal({ staff, onClose }: StaffLedgerModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [scope, setScope] = useState<"all" | "yearly" | "monthly" | "daily">("monthly");
  const [filter, setFilter] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchStaffStats();
  }, [staff.id, filter, scope]);

  const fetchStaffStats = async () => {
    setLoading(true);
    try {
      const url = `/api/staff/${staff.id}/attendance?scope=${scope}&year=${filter.year}&month=${filter.month}&date=${filter.date}`;
      const res = await fetch(url);
      const result = await res.json();
      setData(result);
    } catch (error) {
      toast.error("Failed to load staff ledger");
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!data?.logs?.length) {
      toast.error("No data to export");
      return;
    }
    const dataToExport = data.logs.map((log: any) => ({
      "Date": new Date(log.date).toLocaleDateString(),
      "Status": log.status,
      "Remarks": log.remarks || ""
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${staff.name}_Attendance`);
    XLSX.writeFile(wb, `${staff.name}_Attendance_${scope}.xlsx`);
    toast.success("Staff ledger exported!");
  };

  const getStatusCount = (status: string, useAllTime = false) => {
    const source = useAllTime ? data?.allTimeStats : data?.filteredStats;
    return source?.find((s: any) => s.status === status)?.count || 0;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-2 sm:p-6 animate-in fade-in duration-300">
      <div className="bg-white rounded-[24px] sm:rounded-[32px] w-full max-w-6xl max-h-[95vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-6 border-b border-border flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-2xl font-black shadow-lg shadow-primary/20">
              {staff.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 font-outfit">{staff.name}</h3>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">{staff.permissions?.template || "Staff Member"}</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Scope Switcher */}
            <div className="bg-white p-1 rounded-xl flex gap-1 border border-border shadow-sm">
              {(["all", "yearly", "monthly", "daily"] as const).map((s) => (
                <button 
                  key={s}
                  onClick={() => setScope(s)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                    scope === s ? "bg-primary text-white shadow-md" : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {s.replace('all', 'All Time')}
                </button>
              ))}
            </div>

            {/* Dynamic Filters */}
            <div className="flex items-center gap-2 bg-white border border-border rounded-xl p-1 shadow-sm">
              {(scope === "monthly" || scope === "yearly") && (
                <select 
                  value={filter.year} 
                  onChange={(e) => setFilter(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                  className="bg-transparent text-sm font-bold px-2 outline-none border-none"
                >
                  {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              )}
              {scope === "monthly" && (
                <select 
                  value={filter.month} 
                  onChange={(e) => setFilter(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                  className="bg-transparent text-sm font-bold px-2 outline-none border-none border-l border-border ml-1"
                >
                  {Array.from({ length: 12 }).map((_, i) => (
                    <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('en', { month: 'short' })}</option>
                  ))}
                </select>
              )}
              {scope === "daily" && (
                <input 
                  type="date" 
                  value={filter.date} 
                  onChange={(e) => setFilter(prev => ({ ...prev, date: e.target.value }))}
                  className="bg-transparent text-sm font-bold px-2 outline-none border-none"
                />
              )}
              {scope === "all" && <span className="px-4 py-1 text-[10px] font-black text-muted-foreground uppercase">Showing Everything</span>}
            </div>

            <button 
              onClick={exportToExcel}
              className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/10 flex items-center gap-2 text-xs font-black"
            >
              <Download className="w-4 h-4" /> <span className="hidden sm:inline">EXPORT</span>
            </button>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-all text-muted-foreground hover:text-slate-900 ml-2">
              <X className="w-8 h-8" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-muted-foreground font-bold uppercase text-xs tracking-widest animate-pulse">Analyzing Period Records...</p>
            </div>
          ) : (
            <>
              {/* Filtered Summary */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-primary" />
                  <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    {scope === 'all' ? 'Lifetime Statistics' : `Statistics for selected ${scope}`}
                  </h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <SummaryCard title="Present" value={getStatusCount('PRESENT')} icon={CheckCircle2} color="text-emerald-600" bg="bg-emerald-50" />
                  <SummaryCard title="Absent" value={getStatusCount('ABSENT')} icon={XCircle} color="text-red-600" bg="bg-red-50" />
                  <SummaryCard title="Leave" value={getStatusCount('LEAVE')} icon={AlertCircle} color="text-amber-600" bg="bg-amber-50" />
                  <SummaryCard title="Holiday" value={getStatusCount('HOLIDAY')} icon={CalendarDays} color="text-purple-600" bg="bg-purple-50" />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Activity Log */}
                <Card className="lg:col-span-2 border-none bg-slate-50/50">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                         <History className="w-5 h-5 text-primary" />
                         Record History
                      </CardTitle>
                      <CardDescription>
                        {scope === 'all' ? 'Showing last 50 entries' : `Detailed records for selected ${scope}`}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-white/50 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border">
                            <th className="text-left py-4 px-6">Date</th>
                            <th className="text-left py-4 px-6">Status</th>
                            <th className="text-left py-4 px-6">Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {data?.logs?.length > 0 ? data.logs.map((log: any) => (
                            <tr key={log.id} className="hover:bg-white transition-colors">
                              <td className="py-4 px-6 font-bold text-slate-700">
                                {new Date(log.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </td>
                              <td className="py-4 px-6">
                                <StatusBadge status={log.status} />
                              </td>
                              <td className="py-4 px-6 text-muted-foreground italic text-xs">
                                {log.remarks || "-"}
                              </td>
                            </tr>
                          )) : (
                            <tr>
                              <td colSpan={3} className="py-12 text-center text-muted-foreground italic text-xs font-bold uppercase tracking-widest">No records found for this period</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Right Panel Info */}
                <div className="space-y-6">
                  <Card className="border-none bg-primary text-primary-foreground p-6 shadow-xl shadow-primary/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                    <TrendingUp className="w-10 h-10 mb-4 text-white/50" />
                    <h4 className="text-sm font-bold uppercase tracking-widest opacity-80">Scorecard</h4>
                    <p className="text-4xl font-black mt-1 font-outfit">
                      {Math.round((getStatusCount('PRESENT', true) / Math.max(getStatusCount('PRESENT', true) + getStatusCount('ABSENT', true), 1)) * 100)}%
                    </p>
                    <p className="text-[10px] mt-2 opacity-60 font-medium">Overall lifetime attendance reliability</p>
                  </Card>

                  <Card className="border-none shadow-sm p-6 bg-white">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                       <Award className="w-4 h-4 text-primary" />
                       Staff Details
                    </h4>
                    <div className="space-y-4">
                      <DetailRow label="Employee ID" value={staff.id.substring(0, 8).toUpperCase()} />
                      <DetailRow label="Work Email" value={staff.email} />
                      <DetailRow label="Joined On" value={new Date(staff.created_at).toLocaleDateString()} />
                      <DetailRow label="Account Status" value={staff.is_active ? "Active" : "Disabled"} />
                    </div>
                  </Card>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon: Icon, color, bg }: any) {
  return (
    <Card className="border-none shadow-sm">
      <CardContent className="p-5">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", bg)}>
          <Icon className={cn("w-5 h-5", color)} />
        </div>
        <h4 className="text-2xl font-black text-slate-900">{value}</h4>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">{title}</p>
      </CardContent>
    </Card>
  );
}

function DetailRow({ label, value }: any) {
  return (
    <div>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-sm font-bold text-slate-800">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: any = {
    PRESENT: { label: "Present", class: "bg-emerald-100 text-emerald-700" },
    ABSENT: { label: "Absent", class: "bg-red-100 text-red-700" },
    LEAVE: { label: "Leave", class: "bg-amber-100 text-amber-700" },
    HOLIDAY: { label: "Holiday", class: "bg-purple-100 text-purple-700" },
  };
  const cfg = configs[status] || { label: status, class: "bg-slate-100 text-slate-700" };
  return (
    <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight", cfg.class)}>
      {cfg.label}
    </span>
  );
}
