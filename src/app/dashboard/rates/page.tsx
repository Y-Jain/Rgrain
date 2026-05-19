"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { 
  TrendingUp, 
  Plus, 
  History, 
  ArrowUpRight, 
  ArrowDownRight, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  Search,
  Loader2,
  IndianRupee,
  Tags
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/lib/store/auth-store";
import { toast } from "sonner";

export default function RatesPage() {
  const { user } = useAuthStore();
  const [rates, setRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [form, setForm] = useState({
    id: null as string | null,
    categoryName: "",
    procurementRate: "",
    sellingRate: "",
    subcategories: [] as string[]
  });
  const [newSub, setNewSub] = useState("");

  const fetchRates = async () => {
    if (!user?.branchId) return;
    try {
      const res = await fetch(`/api/rates?branchId=${user.branchId}`);
      const data = await res.json();
      setRates(data);
    } catch (error) {
      toast.error("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.categoryName) {
      toast.error("Category name is required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: user?.branchId,
          categoryName: form.categoryName,
          procurementRate: parseFloat(form.procurementRate) || 0,
          sellingRate: parseFloat(form.sellingRate) || 0,
          subcategories: form.subcategories
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      toast.success(`${form.categoryName} configuration updated.`);
      setShowModal(false);
      setForm({ id: null, categoryName: "", procurementRate: "", sellingRate: "", subcategories: [] });
      fetchRates();
    } catch (error: any) {
      toast.error("Failed to save: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      const res = await fetch(`/api/rates?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success("Category removed.");
        fetchRates();
      }
    } catch (error) {
      toast.error("Failed to delete category.");
    }
  };

  const openEdit = (rate: any) => {
    setForm({
      id: rate.id,
      categoryName: rate.category_name,
      procurementRate: rate.procurement_rate.toString(),
      sellingRate: rate.selling_rate.toString(),
      subcategories: rate.subcategories || []
    });
    setShowModal(true);
  };

  const addSubcategory = () => {
    if (!newSub.trim()) return;
    if (form.subcategories.includes(newSub.trim())) {
      toast.error("Subcategory already exists.");
      return;
    }
    setForm({ ...form, subcategories: [...form.subcategories, newSub.trim()] });
    setNewSub("");
  };

  const removeSubcategory = (sub: string) => {
    setForm({ ...form, subcategories: form.subcategories.filter(s => s !== sub) });
  };

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-outfit text-slate-900">Grain & Rate Management</h1>
          <p className="text-slate-500 font-medium">Manage grain categories, subcategories, and market rates.</p>
        </div>
        <button 
          onClick={() => {
            setForm({ id: null, categoryName: "", procurementRate: "", sellingRate: "", subcategories: [] });
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-2xl text-sm font-black hover:opacity-90 transition-all shadow-xl shadow-primary/20"
        >
          <Plus className="w-4 h-4" />
          Add New Category
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mt-8">
        <div className="xl:col-span-2">
           <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="border-b border-border/50 pb-6">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <Tags className="w-5 h-5 text-primary" />
                       <CardTitle>Grain Inventory Master</CardTitle>
                    </div>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted px-3 py-1 rounded-full border border-border/50">
                       Last Sync: {new Date().toLocaleTimeString()}
                    </div>
                 </div>
              </CardHeader>
              <CardContent className="p-0 min-h-[400px] relative">
                 {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                       <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                 ) : rates.length === 0 ? (
                    <div className="p-20 text-center space-y-4">
                       <TrendingUp className="w-12 h-12 text-muted-foreground/20 mx-auto" />
                       <p className="text-sm text-muted-foreground font-medium">No categories defined for this branch.</p>
                       <button 
                         onClick={() => setShowModal(true)}
                         className="text-primary font-black text-xs uppercase tracking-widest hover:underline"
                       >Start Building Your Catalog</button>
                    </div>
                 ) : (
                    <div className="overflow-x-auto">
                       <table className="w-full text-sm">
                          <thead>
                             <tr className="bg-muted/30 text-muted-foreground uppercase text-[10px] font-black tracking-widest border-b border-border">
                                <th className="text-left py-4 px-6">Grain Hierarchy</th>
                                <th className="text-left py-4 px-6">Market Rates (Optional)</th>
                                <th className="text-right py-4 px-6">Actions</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                             {rates.map(r => (
                               <tr key={r.id} className="hover:bg-muted/10 transition-colors group">
                                  <td className="py-4 px-6">
                                     <span className="font-bold text-slate-900 block text-base">{r.category_name}</span>
                                     <div className="flex flex-wrap gap-1 mt-2">
                                        {(r.subcategories || []).length > 0 ? (
                                          r.subcategories.map((sub: string) => (
                                            <span key={sub} className="text-[9px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md border border-slate-200">
                                              {sub}
                                            </span>
                                          ))
                                        ) : (
                                          <span className="text-[9px] text-muted-foreground italic">No subcategories</span>
                                        )}
                                     </div>
                                  </td>
                                  <td className="py-4 px-6">
                                     <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                           <span className="text-[10px] font-black text-emerald-600 w-12">BUY:</span>
                                           <span className="font-mono font-black text-slate-700">{formatCurrency(r.procurement_rate || 0)}</span>
                                           <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">/ Quintal</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                           <span className="text-[10px] font-black text-blue-600 w-12">SELL:</span>
                                           <span className="font-mono font-black text-slate-700">{formatCurrency(r.selling_rate || 0)}</span>
                                           <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">/ Quintal</span>
                                        </div>
                                     </div>
                                  </td>
                                  <td className="py-4 px-6 text-right">
                                     <div className="flex items-center justify-end gap-1 ">
                                        <button 
                                          onClick={() => openEdit(r)}
                                          className="p-2 hover:bg-muted rounded-xl text-muted-foreground hover:text-primary transition-all"
                                        >
                                           <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button 
                                          onClick={() => handleDelete(r.id)}
                                          className="p-2 hover:bg-muted rounded-xl text-muted-foreground hover:text-destructive transition-all"
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

        <div className="space-y-6">
           <Card className="border-none shadow-sm bg-slate-900 text-white overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-primary/20 transition-all" />
              <CardHeader>
                 <div className="flex items-center gap-2">
                    <Tags className="w-5 h-5 text-primary" />
                    <CardTitle className="text-white">Hierarchical Management</CardTitle>
                 </div>
              </CardHeader>
              <CardContent className="space-y-4 relative z-10">
                 <p className="text-sm opacity-60 leading-relaxed font-medium">
                    Define your grain categories and subcategories first. Rates can be updated later as market prices fluctuate.
                 </p>
                 <div className="p-4 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm">
                    <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mb-1">Total Categories</p>
                    <div className="flex items-center gap-2">
                       <p className="text-2xl font-black">{rates.length}</p>
                       <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                 </div>
              </CardContent>
           </Card>

           <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="border-b border-border/50 pb-4">
                 <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-primary" />
                    <CardTitle className="text-sm">Recent Activity</CardTitle>
                 </div>
              </CardHeader>
              <CardContent className="p-0">
                 <div className="divide-y divide-border/50">
                    {rates.slice(0, 3).map(r => (
                      <div key={r.id} className="p-4 hover:bg-muted/30 transition-all flex items-center justify-between">
                         <div>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{r.category_name}</p>
                            <p className="text-xs font-black text-slate-700">Sub-grains: {(r.subcategories || []).length}</p>
                         </div>
                         <div className="text-right">
                            <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">ACTIVE</span>
                         </div>
                      </div>
                    ))}
                    {rates.length === 0 && (
                      <div className="p-12 text-center text-[10px] font-black text-muted-foreground uppercase opacity-40">No activity recorded</div>
                    )}
                 </div>
              </CardContent>
           </Card>
        </div>
      </div>

      {/* Add/Update Rate Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
           <div className="bg-white rounded-[2rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-8 border-b border-border flex items-center justify-between bg-slate-50">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
                       <Plus className="w-6 h-6" />
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-slate-900 font-outfit">Manage Category</h3>
                       <p className="text-xs text-slate-500 font-medium">Define grain hierarchy and optional pricing.</p>
                    </div>
                 </div>
                 <button onClick={() => setShowModal(false)} className="p-3 hover:bg-white rounded-2xl transition-all text-slate-400 hover:text-slate-900 border border-transparent hover:border-slate-200">
                    <X className="w-6 h-6" />
                 </button>
              </div>

              <form onSubmit={handleSave} className="p-8 space-y-6">
                 <div className="space-y-6">
                    {/* Category Name */}
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Grain Category</label>
                       <div className="relative">
                          <Tags className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <input 
                            type="text" 
                            required
                            placeholder="e.g. Wheat"
                            className="w-full pl-12 pr-4 py-3.5 bg-muted/50 border border-border rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                            value={form.categoryName}
                            onChange={e => setForm({...form, categoryName: e.target.value})}
                          />
                       </div>
                    </div>

                    {/* Subcategories Management */}
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Subcategories / Qualities</label>
                       <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Add subcategory (e.g. M1)"
                            className="flex-1 px-4 py-3 bg-muted/50 border border-border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            value={newSub}
                            onChange={e => setNewSub(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSubcategory())}
                          />
                          <button 
                            type="button"
                            onClick={addSubcategory}
                            className="px-4 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800"
                          >
                            Add
                          </button>
                       </div>
                       <div className="flex flex-wrap gap-2 min-h-[40px] p-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                          {form.subcategories.length === 0 && (
                            <p className="text-[10px] text-slate-400 italic">No subcategories added yet.</p>
                          )}
                          {form.subcategories.map(sub => (
                            <div key={sub} className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm animate-in fade-in slide-in-from-left-2">
                               <span className="text-xs font-bold text-slate-700">{sub}</span>
                               <button 
                                 type="button"
                                 onClick={() => removeSubcategory(sub)}
                                 className="text-slate-400 hover:text-destructive transition-colors"
                               >
                                  <X className="w-3 h-3" />
                               </button>
                            </div>
                          ))}
                       </div>
                    </div>

                    {/* Optional Rates */}
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Market Rates (Optional)</p>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Procurement (IN)</label>
                             <div className="relative">
                                <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                  type="number" 
                                  placeholder="0.00"
                                  className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-black outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                  value={form.procurementRate}
                                  onChange={e => setForm({...form, procurementRate: e.target.value})}
                                />
                             </div>
                          </div>
                          <div className="space-y-2">
                             <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Selling (OUT)</label>
                             <div className="relative">
                                <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                  type="number" 
                                  placeholder="0.00"
                                  className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-black outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                  value={form.sellingRate}
                                  onChange={e => setForm({...form, sellingRate: e.target.value})}
                                />
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="pt-4 flex gap-4">
                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 text-sm font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors" disabled={submitting}>Discard</button>
                    <button type="submit" disabled={submitting} className="flex-[2] py-4 bg-slate-900 text-white rounded-[1.25rem] font-black uppercase tracking-widest text-xs hover:bg-slate-800 shadow-xl shadow-slate-900/20 disabled:opacity-50">
                       {submitting ? "SAVING CONFIG..." : "SAVE CONFIGURATION"}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </>
  );
}
