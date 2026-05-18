"use client";

import React, { useState, useEffect } from "react";
import SuperAdminLayout from "@/components/layout/SuperAdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { 
  ShieldCheck, 
  Plus, 
  Search, 
  Mail, 
  Building2, 
  MoreVertical, 
  CheckCircle2, 
  XCircle,
  Key,
  Activity,
  Filter,
  X,
  User,
  Lock,
  ChevronDown,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function AdminsManagementPage() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    name: "",
    email: "",
    password: "",
    branchId: ""
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null);
  const [editPassword, setEditPassword] = useState("");

  const fetchData = async () => {
    try {
      const [adminRes, branchRes] = await Promise.all([
        fetch('/api/admins'),
        fetch('/api/branches')
      ]);
      const [adminData, branchData] = await Promise.all([
        adminRes.json(),
        branchRes.json()
      ]);
      setAdmins(adminData);
      setBranches(branchData);
    } catch (error: any) {
      toast.error("Failed to load data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdmin.name || !newAdmin.email || !newAdmin.password || !newAdmin.branchId) {
      toast.error("Please fill in all required fields.");
      return;
    }
    
    setSubmitting(true);
    try {
      const res = await fetch('/api/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAdmin.name,
          email: newAdmin.email,
          password: newAdmin.password,
          branch_id: newAdmin.branchId
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      toast.success(`Admin account for ${newAdmin.name} created successfully!`);
      setShowCreateModal(false);
      setNewAdmin({ name: "", email: "", password: "", branchId: "" });
      fetchData();
    } catch (error: any) {
      toast.error("Failed to create admin: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPassword) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admins/${selectedAdmin.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: editPassword })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      toast.success("Password updated successfully!");
      setShowEditModal(false);
      setEditPassword("");
    } catch (error: any) {
      toast.error("Failed to update password: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAdmins = admins.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.branch_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <SuperAdminLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-outfit">Admin Accounts</h1>
          <p className="text-slate-500 text-sm">Manage branch-level administrators and their platform access.</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" />
          Create Admin Account
        </button>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search by name, email or branch..." 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 min-h-[400px] relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : filteredAdmins.length === 0 ? (
            <div className="p-20 text-center">
              <ShieldCheck className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-400">No administrators found</h3>
              <p className="text-sm text-slate-300">New admins will appear here after creation.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-400 uppercase text-[10px] font-black tracking-widest border-b border-slate-100">
                    <th className="text-left py-4 px-6">Administrator</th>
                    <th className="text-left py-4 px-6">Assigned Branch</th>
                    <th className="text-left py-4 px-6">Created On</th>
                    <th className="text-left py-4 px-6">Status</th>
                    <th className="text-right py-4 px-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredAdmins.map((admin) => (
                    <tr key={admin.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-black">
                            {admin.name.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900">{admin.name}</span>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                              <Mail className="w-3 h-3" />
                              {admin.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-500 shadow-sm w-fit">
                          <Building2 className="w-3 h-3" />
                          {admin.branch_name || 'N/A'}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-500 font-medium">
                        {new Date(admin.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6">
                         <span className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                          admin.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400"
                        )}>
                          <div className={cn("w-1.5 h-1.5 rounded-full", admin.is_active ? "bg-green-600" : "bg-slate-400")} />
                          {admin.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => {
                              setSelectedAdmin(admin);
                              setShowEditModal(true);
                            }}
                            className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-orange-500 transition-all border border-transparent hover:border-slate-200 shadow-sm group-hover:bg-white"
                            title="Reset Password"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          <button 
                             onClick={() => toast.info(`Additional actions for ${admin.name} coming soon.`)}
                             className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-slate-900 transition-all border border-transparent hover:border-slate-200 shadow-sm group-hover:bg-white"
                           >
                             <MoreVertical className="w-4 h-4" />
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

      {/* Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                   <h3 className="text-xl font-black text-slate-900 font-outfit">New Administrator</h3>
                   <p className="text-xs text-slate-500 font-medium">Grant branch-level operational authority.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-slate-900"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleCreateAdmin} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input 
                      type="text" 
                      required
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all"
                      placeholder="e.g. Rahul Sharma"
                      value={newAdmin.name}
                      onChange={e => setNewAdmin({...newAdmin, name: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input 
                      type="email" 
                      required
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all"
                      placeholder="rahul@branch.com"
                      value={newAdmin.email}
                      onChange={e => setNewAdmin({...newAdmin, email: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Initial Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input 
                      type="password" 
                      required
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all"
                      placeholder="••••••••"
                      value={newAdmin.password}
                      onChange={e => setNewAdmin({...newAdmin, password: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                 <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Primary Branch Assignment</label>
                 <select 
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all"
                    value={newAdmin.branchId}
                    onChange={e => setNewAdmin({...newAdmin, branchId: e.target.value})}
                 >
                    <option value="">Select a branch</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                 </select>
              </div>

              <div className="pt-4 flex gap-4">
                 <button 
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-4 text-sm font-bold text-slate-400 hover:text-slate-900 transition-all"
                  disabled={submitting}
                 >
                   Cancel
                 </button>
                 <button 
                  type="submit"
                  disabled={submitting}
                  className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50"
                 >
                   {submitting ? "Creating..." : "Authorize Account"}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Password Modal */}
      {showEditModal && selectedAdmin && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 shadow-sm">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                   <h3 className="text-lg font-black text-slate-900 font-outfit">Update Credentials</h3>
                   <p className="text-xs text-slate-500 font-medium">For {selectedAdmin.name}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowEditModal(false);
                  setEditPassword("");
                }}
                className="p-2 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUpdatePassword} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input 
                    type="password" 
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500/50 transition-all"
                    placeholder="Enter new password"
                    value={editPassword}
                    onChange={e => setEditPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                 <button 
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditPassword("");
                  }}
                  className="flex-1 py-3 text-sm font-bold text-slate-500 hover:text-slate-900 transition-all bg-slate-50 rounded-xl hover:bg-slate-100"
                  disabled={submitting}
                 >
                   Cancel
                 </button>
                 <button 
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50"
                 >
                   {submitting ? "Updating..." : "Update Password"}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SuperAdminLayout>
  );
}
