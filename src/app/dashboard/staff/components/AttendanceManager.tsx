"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/store/auth-store";
import { cn } from "@/lib/utils"; // Import class merger utility
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import * as XLSX from 'xlsx';
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Calendar, Save, Loader2, CheckCircle2, XCircle, AlertCircle, CalendarIcon, ChevronLeft, ChevronRight, Search } from "lucide-react";

export default function AttendanceManager({ staffList }: { staffList: any[] }) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<Record<string, { status: string, remarks: string }>>({});
  const [searchTerm, setSearchTerm] = useState("");

  // 1. Use React Query to fetch Holidays
  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays', user?.branchId],
    queryFn: async () => {
      if (!user?.branchId) return [];
      const res = await fetch(`/api/holidays?branchId=${user.branchId}`);
      const data = await res.json();
      return data.map((h: any) => h.date.split('T')[0]);
    },
    enabled: !!user?.branchId
  });

  // 2. Use React Query to fetch Attendance
  const { isLoading: loadingAttendance } = useQuery({
    queryKey: ['attendance', user?.branchId, selectedDate],
    queryFn: async () => {
      if (!user?.branchId) return {};
      const res = await fetch(`/api/attendance?branchId=${user.branchId}&date=${selectedDate}`);
      const data = await res.json();
      const attRecord: Record<string, any> = {};
      data.forEach((r: any) => {
        attRecord[r.user_id] = { status: r.status, remarks: r.remarks || "" };
      });
      setAttendance(attRecord);
      return attRecord;
    },
    enabled: !!user?.branchId
  });

  // 3. Use Mutation for Saving (Post-processing)
  const saveMutation = useMutation({
    mutationFn: async (records: any[]) => {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendanceRecords: records })
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Attendance saved successfully");
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: () => {
      toast.error("Failed to save attendance");
    }
  });

  const exportToExcel = () => {
    const dataToExport = staffList.filter(s => s.is_active).map(staff => ({
      "Date": selectedDate,
      "Staff Name": staff.name,
      "Role": staff.permissions?.template || "Staff",
      "Status": attendance[staff.id]?.status || "PRESENT",
      "Remarks": attendance[staff.id]?.remarks || ""
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daily Attendance");
    XLSX.writeFile(wb, `Attendance_${selectedDate}.xlsx`);
    toast.success("Daily attendance exported!");
  };

  const handleStatusChange = (staffId: string, status: string) => {
    setAttendance(prev => ({
      ...prev,
      [staffId]: { ...prev[staffId], status, remarks: prev[staffId]?.remarks || "" }
    }));
  };

  const handleRemarksChange = (staffId: string, remarks: string) => {
    setAttendance(prev => ({
      ...prev,
      [staffId]: { ...prev[staffId], status: prev[staffId]?.status || "PRESENT", remarks }
    }));
  };

  const handleSave = async () => {
    const isHoliday = holidays.includes(selectedDate);
    const records = staffList.map(staff => ({
      user_id: staff.id,
      date: selectedDate,
      status: isHoliday ? "HOLIDAY" : (attendance[staff.id]?.status || "PRESENT"),
      remarks: attendance[staff.id]?.remarks || ""
    }));
    saveMutation.mutate(records);
  };

  const markAll = (status: string) => {
    const newAtt = { ...attendance };
    staffList.forEach(staff => {
      newAtt[staff.id] = { ...newAtt[staff.id], status, remarks: newAtt[staff.id]?.remarks || "" };
    });
    setAttendance(newAtt);
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const activeStaff = staffList.filter(s => s.is_active && (
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.permissions?.template || "Staff").toLowerCase().includes(searchTerm.toLowerCase())
  ));
  
  const totalPages = Math.ceil(activeStaff.length / itemsPerPage);
  const paginatedStaff = activeStaff.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset to page 1 when searching
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const isHoliday = holidays.includes(selectedDate);
  const prevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };
  const nextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="border-b border-border/50 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <CardTitle className="text-xl font-black font-outfit uppercase tracking-tight text-slate-900">Daily Attendance</CardTitle>
          <CardDescription className="text-xs font-medium">Mark attendance for staff members</CardDescription>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-2 bg-muted/30 p-1.5 rounded-2xl border border-border/50 w-full sm:w-auto">
          <button onClick={prevDay} className="p-2 hover:bg-white rounded-xl transition-all shadow-sm shrink-0">
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <div className="flex items-center gap-2 px-2 font-black text-slate-800 text-xs sm:text-sm whitespace-nowrap">
            <CalendarIcon className="w-4 h-4 text-primary" />
            {new Date(selectedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="absolute opacity-0 w-0 h-0"
            id="date-picker"
          />
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => document.getElementById('date-picker')?.click()} className="p-2 hover:bg-white rounded-xl transition-all shadow-sm">
              <Calendar className="w-4 h-4 text-slate-600" />
            </button>
            <button onClick={nextDay} className="p-2 hover:bg-white rounded-xl transition-all shadow-sm">
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {isHoliday ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
             <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mb-4">
                <CalendarIcon className="w-8 h-8" />
             </div>
             <h3 className="text-xl font-black text-slate-800 mb-2 font-outfit">It's a Holiday!</h3>
             <p className="text-xs font-medium text-muted-foreground uppercase tracking-tight">Attendance is automatically marked as Holiday for all staff.</p>
          </div>
        ) : (
          <>
            <div className="px-6 py-4 border-b border-border/50 bg-white">
               <div className="relative">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                 <input 
                   type="text" 
                   placeholder="Search staff by name or role..."
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                 />
               </div>
            </div>

            <div className="p-4 border-b border-border/50 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2 md:pb-0">
                 <button onClick={() => markAll('PRESENT')} className="whitespace-nowrap px-4 py-2 text-[10px] font-black uppercase tracking-widest text-green-700 bg-green-100 rounded-xl hover:bg-green-200 transition-colors border border-green-200/50">Mark All Present</button>
                 <button onClick={() => markAll('ABSENT')} className="whitespace-nowrap px-4 py-2 text-[10px] font-black uppercase tracking-widest text-red-700 bg-red-100 rounded-xl hover:bg-red-200 transition-colors border border-red-200/50">Mark All Absent</button>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={exportToExcel}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-slate-900 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all shadow-sm border border-slate-200"
                >
                  <Download className="w-4 h-4" /> Export
                </button>
                <button 
                  onClick={handleSave} 
                  disabled={saveMutation.isPending}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 disabled:opacity-50"
                >
                  {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Attendance
                </button>
              </div>
            </div>
            
            {loadingAttendance ? (
              <div className="p-12 flex justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : (
              <div className="relative">
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-muted/30 text-muted-foreground uppercase text-[10px] font-black tracking-widest border-b border-border backdrop-blur-md">
                        <th className="text-left py-4 px-6">Staff Member</th>
                        <th className="text-left py-4 px-6">Role</th>
                        <th className="text-left py-4 px-6 w-64">Status</th>
                        <th className="text-left py-4 px-6">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {paginatedStaff.map((staff) => {
                        const status = attendance[staff.id]?.status || "PRESENT";
                        return (
                          <tr key={staff.id} className="hover:bg-muted/10 transition-colors">
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs">
                                  {staff.name.charAt(0)}
                                </div>
                                <span className="font-bold text-slate-800">{staff.name}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                                 {staff.permissions?.template || 'Staff'}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex bg-slate-100 p-1 rounded-lg w-fit border border-slate-200 shadow-inner">
                                <button
                                  onClick={() => handleStatusChange(staff.id, "PRESENT")}
                                  className={cn(
                                    "px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5",
                                    status === "PRESENT" ? "bg-white text-green-600 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                  )}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" /> P
                                </button>
                                <button
                                  onClick={() => handleStatusChange(staff.id, "ABSENT")}
                                  className={cn(
                                    "px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5",
                                    status === "ABSENT" ? "bg-white text-red-500 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                  )}
                                >
                                  <XCircle className="w-3.5 h-3.5" /> A
                                </button>
                                <button
                                  onClick={() => handleStatusChange(staff.id, "LEAVE")}
                                  className={cn(
                                    "px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5",
                                    status === "LEAVE" ? "bg-white text-amber-500 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                  )}
                                >
                                  <AlertCircle className="w-3.5 h-3.5" /> L
                                </button>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                               <input 
                                 type="text"
                                 placeholder="Add remark..."
                                 value={attendance[staff.id]?.remarks || ""}
                                 onChange={(e) => handleRemarksChange(staff.id, e.target.value)}
                                 className="w-full text-sm px-3 py-1.5 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary outline-none transition-colors"
                               />
                            </td>
                          </tr>
                        );
                      })}
                      {paginatedStaff.length === 0 && (
                        <tr>
                           <td colSpan={4} className="text-center py-8 text-muted-foreground">
                              No active staff members found.
                           </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="p-4 border-t border-border/50 flex items-center justify-between bg-white">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Page {currentPage} of {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="p-2 hover:bg-slate-100 rounded-xl disabled:opacity-30 transition-all border border-slate-200 shadow-sm"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 hover:bg-slate-100 rounded-xl disabled:opacity-30 transition-all border border-slate-200 shadow-sm"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
