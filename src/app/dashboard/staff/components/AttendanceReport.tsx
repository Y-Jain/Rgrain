"use client";

import React, { useState, useEffect } from "react";
import * as XLSX from 'xlsx';
import { 
  Loader2, 
  TrendingUp, 
  UserCheck, 
  UserX, 
  Umbrella, 
  CalendarDays, 
  Download, 
  Calendar as CalendarIcon, 
  FilterX 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/store/auth-store";
import { toast } from "sonner";

const STATUS_CONFIG = {
  PRESENT: { label: "Present", color: "bg-emerald-500", light: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: UserCheck },
  ABSENT:  { label: "Absent",  color: "bg-red-500",    light: "bg-red-50 text-red-700 border-red-200",         icon: UserX },
  LEAVE:   { label: "Leave",   color: "bg-amber-500",  light: "bg-amber-50 text-amber-700 border-amber-200",   icon: Umbrella },
  HOLIDAY: { label: "Holiday", color: "bg-purple-500", light: "bg-purple-50 text-purple-700 border-purple-200",icon: CalendarDays },
};

export default function AttendanceReport({ staffList }: { staffList: any[] }) {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"monthly" | "daily">("monthly");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  });

  useEffect(() => {
    if (viewMode === "monthly") {
      fetchMonthlyAttendance();
    } else {
      fetchDailyAttendance();
    }
  }, [viewMonth, selectedDate, viewMode, user?.branchId]);

  const fetchMonthlyAttendance = async () => {
    if (!user?.branchId) return;
    setLoading(true);
    try {
      const attRes = await fetch(`/api/attendance?branchId=${user.branchId}&month=${viewMonth.month}&year=${viewMonth.year}`);
      const attData = await attRes.json();
      const holRes = await fetch(`/api/holidays?branchId=${user.branchId}`);
      const holData = await holRes.json();
      
      const monthHolidays = holData.filter((h: any) => {
        const d = new Date(h.date);
        return d.getMonth() + 1 === viewMonth.month && d.getFullYear() === viewMonth.year;
      });

      let mergedRecords = [...(Array.isArray(attData) ? attData : [])];
      monthHolidays.forEach((holiday: any) => {
        const holidayDate = holiday.date.split('T')[0];
        staffList.filter(s => s.is_active).forEach(staff => {
          const exists = mergedRecords.find(r => r.user_id === staff.id && r.date.split('T')[0] === holidayDate);
          if (!exists) {
            mergedRecords.push({ user_id: staff.id, date: holiday.date, status: 'HOLIDAY', remarks: holiday.description });
          }
        });
      });
      setRecords(mergedRecords);
    } catch { toast.error("Failed to load report"); }
    finally { setLoading(false); }
  };

  const fetchDailyAttendance = async () => {
    if (!user?.branchId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance?branchId=${user.branchId}&date=${selectedDate}`);
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch { toast.error("Failed to load daily report"); }
    finally { setLoading(false); }
  };

  const exportToExcel = () => {
    const dataToExport = staffSummary.map(staff => ({
      "Staff Name": staff.name,
      "Role": staff.permissions?.template || "Staff",
      "Present": staff.counts.PRESENT,
      "Absent": staff.counts.ABSENT,
      "Leave": staff.counts.LEAVE,
      "Holiday": staff.counts.HOLIDAY,
      "Attendance %": `${staff.attendancePct}%`
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance Report");
    XLSX.writeFile(wb, `Attendance_Report_${viewMonth.month}_${viewMonth.year}.xlsx`);
    toast.success("Excel report downloaded!");
  };

  // Build per-staff summary
  const staffSummary = staffList.filter(s => s.is_active).map(staff => {
    const staffRec = records.filter(r => r.user_id === staff.id);
    const counts = { PRESENT: 0, ABSENT: 0, LEAVE: 0, HOLIDAY: 0 };
    staffRec.forEach(r => { if (r.status in counts) counts[r.status as keyof typeof counts]++; });
    const attendancePct = Math.round((counts.PRESENT / Math.max(counts.PRESENT + counts.ABSENT + counts.LEAVE, 1)) * 100);
    return { ...staff, counts, total: staffRec.length, attendancePct };
  });

  const activeStaffCount = staffList.filter(s => s.is_active).length || 1;
  const stats = {
    PRESENT: records.filter(r => r.status === "PRESENT").length,
    ABSENT: records.filter(r => r.status === "ABSENT").length,
    LEAVE: records.filter(r => r.status === "LEAVE").length,
    HOLIDAY: Array.from(new Set(records.filter(r => r.status === "HOLIDAY").map(r => r.date.split('T')[0]))).length
  };

  const monthLabel = new Date(viewMonth.year, viewMonth.month - 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800">Attendance Intelligence</h2>
          <p className="text-sm text-muted-foreground">Comprehensive reporting and data export</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Mode Switcher */}
          <div className="bg-slate-100 p-1 rounded-xl flex gap-1 border border-slate-200">
            <button onClick={() => setViewMode("monthly")} className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all", viewMode === "monthly" ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-slate-700")}>Monthly</button>
            <button onClick={() => setViewMode("daily")} className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all", viewMode === "daily" ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-slate-700")}>Daily</button>
          </div>

          {viewMode === "monthly" ? (
            <div className="flex items-center gap-2 bg-white border border-border rounded-xl p-1 shadow-sm">
              <select 
                value={viewMonth.month} 
                onChange={(e) => setViewMonth(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                className="bg-transparent text-sm font-bold px-2 outline-none border-none"
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('en', { month: 'short' })}</option>
                ))}
              </select>
              <select 
                value={viewMonth.year} 
                onChange={(e) => setViewMonth(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                className="bg-transparent text-sm font-bold px-2 outline-none border-none"
              >
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-white border border-border rounded-xl p-1 px-3 shadow-sm">
              <CalendarIcon className="w-4 h-4 text-primary" />
              <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-sm font-bold outline-none border-none"
              />
            </div>
          )}

          <button 
            onClick={exportToExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
          >
            <Download className="w-4 h-4" /> Export Excel
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(["PRESENT", "ABSENT", "LEAVE", "HOLIDAY"] as const).map(status => {
          const cfg = STATUS_CONFIG[status];
          const count = stats[status];
          return (
            <Card key={status} className="border-none shadow-sm overflow-hidden relative">
              <div className={cn("absolute top-0 left-0 right-0 h-1", cfg.color)} />
              <CardContent className="pt-6 p-5">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3 border", cfg.light)}>
                  <cfg.icon className="w-5 h-5" />
                </div>
                <p className="text-3xl font-black text-slate-900">{count}</p>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">{cfg.label} {viewMode === 'monthly' ? 'Total' : 'Today'}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="border-b border-border/50 pb-6">
          <CardTitle>Staff Breakdown</CardTitle>
          <CardDescription>
            {viewMode === 'monthly' ? `Detailed attendance for ${monthLabel}` : `Attendance records for ${new Date(selectedDate).toLocaleDateString('en-IN', { dateStyle: 'long' })}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
          ) : staffSummary.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No data for selected period.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 text-muted-foreground uppercase text-[10px] font-black tracking-widest border-b border-border">
                    <th className="text-left py-4 px-6">Staff Member</th>
                    <th className="text-center py-4 px-4">{viewMode === 'monthly' ? 'Present' : 'Status'}</th>
                    {viewMode === 'monthly' && (
                      <>
                        <th className="text-center py-4 px-4">Absent</th>
                        <th className="text-center py-4 px-4">Leave</th>
                        <th className="text-center py-4 px-4">Holiday</th>
                        <th className="text-center py-4 px-6">Attendance %</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {staffSummary.map(staff => (
                    <tr key={staff.id} className="hover:bg-muted/10 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-sm">{staff.name.charAt(0)}</div>
                          <div>
                            <p className="font-bold text-slate-800">{staff.name}</p>
                            <p className="text-[10px] text-muted-foreground">{staff.permissions?.template || "Staff"}</p>
                          </div>
                        </div>
                      </td>
                      {viewMode === 'monthly' ? (
                        <>
                          <td className="text-center py-4 px-4"><span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 font-black text-sm border border-emerald-200">{staff.counts.PRESENT}</span></td>
                          <td className="text-center py-4 px-4"><span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-50 text-red-700 font-black text-sm border border-red-200">{staff.counts.ABSENT}</span></td>
                          <td className="text-center py-4 px-4"><span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-50 text-amber-700 font-black text-sm border border-amber-200">{staff.counts.LEAVE}</span></td>
                          <td className="text-center py-4 px-4"><span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-50 text-purple-700 font-black text-sm border border-purple-200">{staff.counts.HOLIDAY}</span></td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className={cn("h-full rounded-full transition-all duration-700", staff.attendancePct >= 90 ? "bg-emerald-500" : staff.attendancePct >= 75 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${staff.attendancePct}%` }} />
                              </div>
                              <span className={cn("text-xs font-black min-w-[40px] text-right", staff.attendancePct >= 90 ? "text-emerald-600" : staff.attendancePct >= 75 ? "text-amber-600" : "text-red-600")}>{staff.total > 0 ? `${staff.attendancePct}%` : "—"}</span>
                            </div>
                          </td>
                        </>
                      ) : (
                        <td className="text-center py-4 px-4">
                          {records.find(r => r.user_id === staff.id) ? (
                            <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border", STATUS_CONFIG[records.find(r => r.user_id === staff.id).status as keyof typeof STATUS_CONFIG]?.light)}>
                              {records.find(r => r.user_id === staff.id).status}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">No record</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
