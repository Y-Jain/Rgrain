"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Loader2, Plus, Trash2, CalendarIcon, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/store/auth-store";
import { toast } from "sonner";

export default function HolidayManager() {
  const { user } = useAuthStore();
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ date: "", description: "" });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchHolidays();
  }, [user?.branchId]);

  const fetchHolidays = async () => {
    if (!user?.branchId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/holidays?branchId=${user.branchId}`);
      const data = await res.json();
      setHolidays(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load holidays");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.description) {
      toast.error("Please fill all fields");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: form.date, description: form.description, branchId: user?.branchId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success(`Holiday "${form.description}" added. It will reflect for all staff.`);
      setForm({ date: "", description: "" });
      setShowForm(false);
      fetchHolidays();
    } catch (err: any) {
      toast.error("Failed to add holiday: " + err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string, desc: string) => {
    if (!confirm(`Remove holiday "${desc}"?`)) return;
    try {
      const res = await fetch(`/api/holidays?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Holiday removed");
      fetchHolidays();
    } catch {
      toast.error("Failed to delete holiday");
    }
  };

  // Group by month
  const grouped = holidays.reduce((acc: Record<string, any[]>, h) => {
    const monthKey = new Date(h.date).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    if (!acc[monthKey]) acc[monthKey] = [];
    acc[monthKey].push(h);
    return acc;
  }, {});

  const isPast = (dateStr: string) => new Date(dateStr) < new Date(new Date().toDateString());

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="border-b border-border/50 pb-6">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Holiday Calendar</CardTitle>
            <CardDescription>Public holidays added here reflect automatically on all staff attendance.</CardDescription>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            Add Holiday
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleAdd} className="mt-6 p-5 bg-slate-50 rounded-2xl border border-border space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">New Holiday</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date</label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diwali, Republic Day"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 text-sm font-bold text-muted-foreground hover:text-slate-800 transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={adding}
                className="flex-[2] py-2.5 bg-primary text-primary-foreground rounded-xl font-black text-xs uppercase tracking-widest hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarIcon className="w-4 h-4" />}
                {adding ? "Adding..." : "Confirm Holiday"}
              </button>
            </div>
          </form>
        )}
      </CardHeader>

      <CardContent className="p-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : holidays.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <PartyPopper className="w-8 h-8 text-amber-400" />
            </div>
            <p className="font-bold text-slate-700">No holidays added yet</p>
            <p className="text-sm text-muted-foreground mt-1">Click "Add Holiday" to get started</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([month, monthHolidays]) => (
              <div key={month}>
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4 pb-2 border-b border-border/50">{month}</h3>
                <div className="space-y-2">
                  {monthHolidays.map((h) => {
                    const past = isPast(h.date);
                    const d = new Date(h.date);
                    return (
                      <div
                        key={h.id}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-xl border transition-all group",
                          past
                            ? "border-border/40 bg-slate-50/50 opacity-60"
                            : "border-amber-200 bg-amber-50/50 hover:border-amber-300"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex flex-col items-center justify-center text-center shrink-0 border",
                            past ? "bg-slate-100 border-slate-200" : "bg-amber-100 border-amber-200"
                          )}>
                            <span className={cn("text-xs font-black", past ? "text-slate-500" : "text-amber-700")}>
                              {d.toLocaleDateString("en-IN", { day: "2-digit" })}
                            </span>
                            <span className={cn("text-[9px] font-bold uppercase tracking-wider", past ? "text-slate-400" : "text-amber-600")}>
                              {d.toLocaleDateString("en-IN", { month: "short" })}
                            </span>
                          </div>
                          <div>
                            <p className={cn("font-bold text-sm", past ? "text-slate-500" : "text-slate-800")}>
                              {h.description}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {d.toLocaleDateString("en-IN", { weekday: "long" })}
                              {past ? " · Past" : " · Upcoming"}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(h.id, h.description)}
                          className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
