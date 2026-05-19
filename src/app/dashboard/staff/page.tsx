"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import {
  Users,
  Plus,
  Shield,
  FileLock2,
  CheckCircle2,
  History,
  Trash2,
  Edit2,
  X,
  User,
  ShieldCheck,
  Loader2,
  Key,
  CalendarCheck,
  BarChart3,
  PartyPopper,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/store/auth-store";
import { toast } from "sonner";
import AttendanceManager from "./components/AttendanceManager";
import AttendanceReport from "./components/AttendanceReport";
import HolidayManager from "./components/HolidayManager";
import StaffLedgerModal from "./components/StaffLedgerModal";

const permissionTemplates = [
  { id: "tmpl-1", name: "Weighman",       modules: ["Weighbridge", "Small Scale", "Vehicle Logging"] },
  { id: "tmpl-2", name: "Cashier",        modules: ["Farmer Ledger", "Payments", "Approvals View"] },
  { id: "tmpl-3", name: "Godown Keeper",  modules: ["Stock Entry", "Warehouse Map", "Transfers"] },
  { id: "tmpl-5", name: "Small Scale",    modules: ["Small Scale", "Ledger Updates"] },
  { id: "tmpl-4", name: "General Labor",  modules: [] },
];

type Tab = "staff" | "attendance" | "report" | "holidays";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "staff",      label: "Staff",          icon: Users },
  { id: "attendance", label: "Attendance",     icon: CalendarCheck },
  { id: "report",     label: "Monthly Report", icon: BarChart3 },
  { id: "holidays",   label: "Holidays",       icon: PartyPopper },
];

export default function StaffManagementPage() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const router = useRouter();

  const validTabs: Tab[] = ["staff", "attendance", "report", "holidays"];
  const tabParam = searchParams.get("tab") as Tab | null;
  const initialTab: Tab = tabParam && validTabs.includes(tabParam) ? tabParam : "staff";

  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync tab when URL changes (e.g. sidebar link click)
  useEffect(() => {
    const t = searchParams.get("tab") as Tab | null;
    if (t && validTabs.includes(t)) {
      setActiveTab(t);
    } else {
      setActiveTab("staff");
    }
  }, [searchParams]);

  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [showEditModal, setShowEditModal]       = useState(false);
  const [showLedgerModal, setShowLedgerModal]   = useState(false);
  const [submitting, setSubmitting]             = useState(false);

  const [newStaff, setNewStaff] = useState({ name: "", email: "", password: "", templateId: "" });
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);

  const toggleRoleTemplate = (currentStr: string, name: string) => {
    const list = currentStr ? currentStr.split(',').map(t => t.trim()).filter(Boolean) : [];
    if (list.includes(name)) {
      return list.filter(t => t !== name).join(', ');
    } else {
      return [...list, name].join(', ');
    }
  };

  const fetchStaff = async () => {
    if (!user?.branchId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/staff?branchId=${user.branchId}`);
      const data = await res.json();
      setStaffList(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load staff list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStaff(); }, [user]);

  const toggleStatus = async (staff: any) => {
    try {
      const res = await fetch("/api/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: staff.id, is_active: !staff.is_active }),
      });
      if (res.ok) { toast.success(`Status for ${staff.name} updated.`); fetchStaff(); }
    } catch { toast.error("Failed to update status"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this staff member?")) return;
    try {
      const res = await fetch(`/api/staff?id=${id}`, { method: "DELETE" });
      if (res.ok) { toast.success("Staff member deleted"); fetchStaff(); }
    } catch { toast.error("Failed to delete staff"); }
  };

  const handleOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.name || !newStaff.email || !newStaff.password || !newStaff.templateId) {
      toast.error("Please fill in all fields."); return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newStaff.name, email: newStaff.email, password: newStaff.password,
          branch_id: user?.branchId, role_template: newStaff.templateId,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success(`${newStaff.name} has been onboarded.`);
      setShowOnboardModal(false);
      setNewStaff({ name: "", email: "", password: "", templateId: "" });
      fetchStaff();
    } catch (err: any) {
      toast.error("Failed to onboard: " + err.message);
    } finally { setSubmitting(false); }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingStaff.id, name: editingStaff.name, email: editingStaff.email,
          password: editingStaff.password, role_template: editingStaff.templateId,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success("Staff details updated.");
      setShowEditModal(false);
      fetchStaff();
    } catch (err: any) {
      toast.error("Failed to update: " + err.message);
    } finally { setSubmitting(false); }
  };

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-outfit text-slate-900">Staff Management</h1>
          <p className="text-sm text-muted-foreground">Manage branch operators, attendance, and holidays.</p>
        </div>
        {activeTab === "staff" && (
          <button
            onClick={() => setShowOnboardModal(true)}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-2xl text-sm font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-primary/20"
          >
            <Plus className="w-4 h-4" /> Onboard Staff
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="mt-8 w-full sm:w-auto">
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-[1.25rem] w-full sm:w-fit border border-border/40">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === "staff") {
                    router.replace("/dashboard/staff");
                  } else {
                    router.replace(`/dashboard/staff?tab=${tab.id}`);
                  }
                }}
                className={cn(
                  "flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 whitespace-nowrap flex-1 min-w-[130px] sm:flex-none sm:min-w-0",
                  activeTab === tab.id
                    ? "bg-white text-primary shadow-md border border-border/30"
                    : "text-muted-foreground hover:text-slate-700 hover:bg-white/50"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {/* ── STAFF TAB ── */}
        {activeTab === "staff" && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Staff List */}
            <div className="xl:col-span-2">
              <Card className="border-none shadow-sm">
                <CardHeader className="border-b border-border/50 pb-6">
                  <div className="flex items-center justify-between">
                    <CardTitle>Branch Staff</CardTitle>
                    <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      {staffList.length} Total Users
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 min-h-[300px] relative">
                  {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                  ) : staffList.length === 0 ? (
                    <div className="p-20 text-center">
                      <Users className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">No staff members found for this branch.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/30 text-muted-foreground uppercase text-[10px] font-black tracking-widest border-b border-border">
                            <th className="text-left py-4 px-6">Identity</th>
                            <th className="text-left py-4 px-6">Access Template</th>
                            <th className="text-left py-4 px-6">Joined On</th>
                            <th className="text-left py-4 px-6">Status</th>
                            <th className="text-right py-4 px-6">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {staffList.map((staff) => (
                            <tr key={staff.id} className="hover:bg-muted/20 transition-colors group">
                              <td className="py-4 px-6">
                                <div 
                                  className="flex items-center gap-3 cursor-pointer group/item"
                                  onClick={() => {
                                    setSelectedStaff(staff);
                                    setShowLedgerModal(true);
                                  }}
                                >
                                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black group-hover/item:bg-primary group-hover/item:text-white transition-all">
                                    {staff.name.charAt(0)}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-bold text-slate-900 group-hover/item:text-primary transition-colors">{staff.name}</span>
                                    <span className="text-[10px] text-muted-foreground">{staff.email}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg w-fit text-[10px] font-bold text-slate-600 border border-slate-200">
                                  <Shield className="w-3 h-3" />
                                  {staff.permissions?.template || "Staff"}
                                </div>
                              </td>
                              <td className="py-4 px-6 text-xs text-muted-foreground font-medium">
                                {new Date(staff.created_at).toLocaleDateString()}
                              </td>
                              <td className="py-4 px-6">
                                <button
                                  onClick={() => toggleStatus(staff)}
                                  className={cn(
                                    "flex items-center gap-2 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-tight transition-all",
                                    staff.is_active
                                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                  )}
                                >
                                  <div className={cn("w-1.5 h-1.5 rounded-full", staff.is_active ? "bg-green-600" : "bg-slate-400")} />
                                  {staff.is_active ? "Active" : "Inactive"}
                                </button>
                              </td>
                              <td className="py-4 px-6 text-right">
                                <div className="flex items-center justify-end gap-1 ">
                                  <button
                                    onClick={() => {
                                      setEditingStaff({
                                        id: staff.id, name: staff.name, email: staff.email,
                                        templateId: staff.permissions?.template || "", password: "",
                                      });
                                      setShowEditModal(true);
                                    }}
                                    className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-primary transition-all"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(staff.id)}
                                    className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-destructive transition-all"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Permission Templates Side Panel */}
            <div className="space-y-6">
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FileLock2 className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">Permission Templates</CardTitle>
                  </div>
                  <CardDescription>Global templates defined by Super Admin</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {permissionTemplates.map((tmpl) => (
                    <div key={tmpl.id} className="p-4 rounded-xl border border-border/50 bg-muted/20 hover:border-primary/30 transition-all cursor-pointer group">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-slate-900 group-hover:text-primary transition-colors">{tmpl.name}</span>
                        <button className="p-1 hover:bg-white rounded transition-all"><Plus className="w-3 h-3 text-muted-foreground" /></button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {tmpl.modules.map((mod) => (
                          <span key={mod} className="text-[9px] font-bold text-muted-foreground bg-white border border-border px-1.5 py-0.5 rounded uppercase tracking-tight">
                            {mod}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  <hr className="border-border/50 my-4" />
                  <div
                    className="bg-slate-900 text-white p-6 rounded-2xl relative overflow-hidden group cursor-pointer"
                    onClick={() => setActiveTab("report")}
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-white/20 transition-all" />
                    <History className="w-8 h-8 text-white/20 mb-4" />
                    <h4 className="font-bold text-sm">Attendance Reports</h4>
                    <p className="text-xs text-white/50 mt-1">View monthly attendance summary and stats.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ── ATTENDANCE TAB ── */}
        {activeTab === "attendance" && (
          <AttendanceManager staffList={staffList} />
        )}

        {/* ── REPORT TAB ── */}
        {activeTab === "report" && (
          <AttendanceReport staffList={staffList} />
        )}

        {/* ── HOLIDAYS TAB ── */}
        {activeTab === "holidays" && (
          <HolidayManager />
        )}
      </div>

      {/* ── Onboard Modal ── */}
      {showOnboardModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 font-outfit">Onboard Operator</h3>
                  <p className="text-xs text-muted-foreground font-medium">Add new operational staff to this branch.</p>
                </div>
              </div>
              <button onClick={() => setShowOnboardModal(false)} className="p-2 hover:bg-muted rounded-xl transition-all text-muted-foreground hover:text-slate-900">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleOnboard} className="p-8 space-y-6 overflow-y-auto">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Full Name</label>
                  <input type="text" required placeholder="e.g. Ramesh Yadav"
                    className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold"
                    value={newStaff.name} onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Work Email</label>
                  <input type="email" required placeholder="ramesh@branch.com"
                    className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold"
                    value={newStaff.email} onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Login Password</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input type="password" required placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-3 bg-muted/50 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold"
                      value={newStaff.password} onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Role Template</label>
                  <div className="grid grid-cols-1 gap-2">
                    {permissionTemplates.map((tmpl) => {
                      const isSelected = newStaff.templateId ? newStaff.templateId.split(',').map(t=>t.trim()).includes(tmpl.name) : false;
                      return (
                        <button key={tmpl.id} type="button"
                          onClick={() => setNewStaff({ ...newStaff, templateId: toggleRoleTemplate(newStaff.templateId, tmpl.name) })}
                          className={cn(
                            "flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all",
                            isSelected
                              ? "bg-primary/5 border-primary text-primary shadow-sm"
                              : "bg-white border-border hover:border-primary/30 text-slate-600"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <ShieldCheck className={cn("w-4 h-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                            <span className="text-sm font-bold">{tmpl.name}</span>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => setShowOnboardModal(false)} disabled={submitting}
                  className="flex-1 py-4 text-sm font-bold text-muted-foreground">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="flex-[2] py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-xs hover:opacity-90 shadow-xl shadow-primary/20 disabled:opacity-50">
                  {submitting ? "Processing..." : "Confirm Onboarding"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {showEditModal && editingStaff && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                  <Edit2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 font-outfit">Edit Staff Member</h3>
                  <p className="text-xs text-muted-foreground font-medium">Update profile for {editingStaff.name}.</p>
                </div>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-muted rounded-xl transition-all text-muted-foreground hover:text-slate-900">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="p-8 space-y-6 overflow-y-auto">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Full Name</label>
                  <input type="text" required
                    className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold"
                    value={editingStaff.name} onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Work Email</label>
                  <input type="email" required
                    className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold"
                    value={editingStaff.email} onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">New Password (leave blank to keep)</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input type="password" placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-3 bg-muted/50 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold"
                      value={editingStaff.password} onChange={(e) => setEditingStaff({ ...editingStaff, password: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Role Template</label>
                  <div className="grid grid-cols-1 gap-2">
                    {permissionTemplates.map((tmpl) => {
                      const isSelected = editingStaff.templateId ? editingStaff.templateId.split(',').map((t: string)=>t.trim()).includes(tmpl.name) : false;
                      return (
                        <button key={tmpl.id} type="button"
                          onClick={() => setEditingStaff({ ...editingStaff, templateId: toggleRoleTemplate(editingStaff.templateId, tmpl.name) })}
                          className={cn(
                            "flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all",
                            isSelected
                              ? "bg-primary/5 border-primary text-primary shadow-sm"
                              : "bg-white border-border hover:border-primary/30 text-slate-600"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <ShieldCheck className={cn("w-4 h-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                            <span className="text-sm font-bold">{tmpl.name}</span>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => setShowEditModal(false)} disabled={submitting}
                  className="flex-1 py-4 text-sm font-bold text-muted-foreground">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="flex-[2] py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-xs hover:opacity-90 shadow-xl shadow-primary/20 disabled:opacity-50">
                  {submitting ? "Updating..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Ledger Modal ── */}
      {showLedgerModal && selectedStaff && (
        <StaffLedgerModal 
          staff={selectedStaff} 
          onClose={() => setShowLedgerModal(false)} 
        />
      )}
    </>
  );
}
