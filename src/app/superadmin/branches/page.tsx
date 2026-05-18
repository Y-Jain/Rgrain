"use client";

import React, { useState, useEffect } from "react";
import SuperAdminLayout from "@/components/layout/SuperAdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { 
  Building2, 
  Plus, 
  Search, 
  MapPin, 
  Phone, 
  Users, 
  MoreVertical,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Settings2,
  X,
  Globe,
  User,
  Info,
  Loader2,
  Save,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function BranchesManagement() {
  const router = useRouter();
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [newBranch, setNewBranch] = useState({
    name: "",
    location: "",
    admin: "",
    categories: [] as string[]
  });

  const grainCategories = ["Wheat", "Paddy", "Maize", "Barley", "Mustard"];

  const fetchBranches = async () => {
    try {
      const res = await fetch('/api/branches');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setBranches(data);
    } catch (error: any) {
      toast.error("Failed to load branches: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranch.name || !newBranch.location) {
      toast.error("Please fill in the branch name and location.");
      return;
    }
    
    setSubmitting(true);
    try {
      const res = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBranch.name,
          location: newBranch.location,
          contact_person: newBranch.admin,
          config: { categories: newBranch.categories }
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      toast.success(`${newBranch.name} has been successfully added to the database.`);
      setShowCreateModal(false);
      setNewBranch({ name: "", location: "", admin: "", categories: [] });
      fetchBranches(); // Refresh list
    } catch (error: any) {
      toast.error("Failed to create branch: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch.name || !selectedBranch.location) {
      toast.error("Please fill in the branch name and location.");
      return;
    }
    
    setSubmitting(true);
    try {
      const res = await fetch(`/api/branches/${selectedBranch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedBranch.name,
          location: selectedBranch.location,
          contact_person: selectedBranch.contact_person,
          config: selectedBranch.config,
          is_active: selectedBranch.is_active
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      toast.success(`${selectedBranch.name} updated successfully.`);
      setShowEditModal(false);
      fetchBranches(); // Refresh list
    } catch (error: any) {
      toast.error("Failed to update branch: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCategory = (cat: string, isEdit = false) => {
    if (isEdit) {
      setSelectedBranch((prev: any) => ({
        ...prev,
        config: {
          ...prev.config,
          categories: prev.config?.categories?.includes(cat)
            ? prev.config.categories.filter((c: string) => c !== cat)
            : [...(prev.config?.categories || []), cat]
        }
      }));
    } else {
      setNewBranch(prev => ({
        ...prev,
        categories: prev.categories.includes(cat) 
          ? prev.categories.filter(c => c !== cat)
          : [...(prev.categories || []), cat]
      }));
    }
  };

  const openConfig = (branch: any) => {
    setSelectedBranch({...branch});
    setShowEditModal(true);
  };

  const visitBranch = (branch: any) => {
    router.push(`/dashboard?branchId=${branch.id}&branchName=${encodeURIComponent(branch.name)}`);
  };

  const filteredBranches = branches.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <SuperAdminLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-outfit">Branch Management</h1>
          <p className="text-slate-500">Configure mandis, godowns, and assign branch leadership.</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" />
          Create New Branch
        </button>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-md:w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search branches by name or location..." 
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
          ) : filteredBranches.length === 0 ? (
            <div className="p-20 text-center">
              <Building2 className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-400">No branches found</h3>
              <p className="text-sm text-slate-300">Try adjusting your search or create a new branch.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-0 divide-x divide-y divide-slate-100">
              {filteredBranches.map((branch) => (
                <div key={branch.id} className="p-8 hover:bg-slate-50 transition-all group">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold shadow-sm",
                        branch.is_active ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-400"
                      )}>
                        {branch.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg group-hover:text-blue-600 transition-colors">{branch.name}</h3>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mt-0.5">
                          <MapPin className="w-3.5 h-3.5" />
                          {branch.location}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                        branch.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      )}>
                        {branch.is_active ? "Active" : "Inactive"}
                      </span>
                      <button 
                        onClick={() => toast.info(`Opening actions for ${branch.name}...`)}
                        className="p-2 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200 shadow-sm"
                      >
                        <MoreVertical className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Lead Admin</p>
                      <p className="text-sm font-bold text-slate-700 mt-1 truncate">{branch.contact_person || 'Not Assigned'}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Categories</p>
                      <p className="text-[10px] font-bold text-slate-700 mt-1 truncate">
                        {branch.config?.categories?.join(', ') || 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Operational Since</p>
                      <p className="text-[10px] font-bold text-slate-700 mt-1">
                        {new Date(branch.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => openConfig(branch)}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all shadow-sm"
                    >
                      <Settings2 className="w-4 h-4" />
                      Configuration
                    </button>
                    <button 
                      onClick={() => visitBranch(branch)}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-600/10"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Visit Branch
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Branch Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                   <h3 className="text-xl font-black text-slate-900 font-outfit">Initialize Branch</h3>
                   <p className="text-xs text-slate-500 font-medium">Add a new mandi or storage godown to the network.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-slate-900"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleCreateBranch} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Branch / Mandi Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input 
                      type="text" 
                      required
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all"
                      placeholder="e.g. Rohtak Hub"
                      value={newBranch.name}
                      onChange={e => setNewBranch({...newBranch, name: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Geographical Location</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input 
                      type="text" 
                      required
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all"
                      placeholder="e.g. Rohtak, Haryana"
                      value={newBranch.location}
                      onChange={e => setNewBranch({...newBranch, location: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                 <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Operational Grain Categories</label>
                 <div className="flex flex-wrap gap-2">
                    {grainCategories.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className={cn(
                          "px-4 py-2 rounded-full border text-xs font-bold transition-all",
                          newBranch.categories.includes(cat)
                            ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/20"
                            : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300"
                        )}
                      >
                         {cat}
                      </button>
                    ))}
                 </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-4">
                 <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                 <p className="text-[10px] text-blue-800 leading-relaxed font-medium">
                   Initializing a branch will create a dedicated workspace. You must assign at least one **Admin** after creation to begin operations.
                 </p>
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
                   {submitting ? "Deploying..." : "Deploy Branch"}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Branch Edit Modal */}
      {showEditModal && selectedBranch && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
                  <Settings2 className="w-6 h-6" />
                </div>
                <div>
                   <h3 className="text-xl font-black text-slate-900 font-outfit">Edit Configuration</h3>
                   <p className="text-xs text-slate-500 font-medium">Modify settings for {selectedBranch.name}.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-slate-900"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateBranch} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Branch Name</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all"
                    value={selectedBranch.name}
                    onChange={e => setSelectedBranch({...selectedBranch, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Location</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all"
                    value={selectedBranch.location}
                    onChange={e => setSelectedBranch({...selectedBranch, location: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Lead Administrator</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all"
                  value={selectedBranch.contact_person || ""}
                  onChange={e => setSelectedBranch({...selectedBranch, contact_person: e.target.value})}
                  placeholder="Enter administrator name"
                />
              </div>

              <div className="space-y-3">
                 <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Grain Categories</label>
                 <div className="flex flex-wrap gap-2">
                    {grainCategories.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategory(cat, true)}
                        className={cn(
                          "px-4 py-2 rounded-full border text-xs font-bold transition-all",
                          selectedBranch.config?.categories?.includes(cat)
                            ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/20"
                            : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300"
                        )}
                      >
                         {cat}
                      </button>
                    ))}
                 </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-900">Branch Status</p>
                  <p className="text-[10px] text-slate-500 font-medium">Control whether this branch is active or locked.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedBranch({...selectedBranch, is_active: !selectedBranch.is_active})}
                  className={cn(
                    "w-14 h-7 rounded-full p-1 transition-all duration-300",
                    selectedBranch.is_active ? "bg-green-500" : "bg-slate-300"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300 transform",
                    selectedBranch.is_active ? "translate-x-7" : "translate-x-0"
                  )} />
                </button>
              </div>

              <div className="pt-4 flex gap-4">
                 <button 
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-4 text-sm font-bold text-slate-400 hover:text-slate-900 transition-all"
                 >
                   Cancel
                 </button>
                 <button 
                  type="submit"
                  disabled={submitting}
                  className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                 >
                   {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                   Save Changes
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SuperAdminLayout>
  );
}
