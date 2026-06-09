"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { 
  Users, 
  Plus, 
  Search, 
  MapPin, 
  Phone, 
  UserPlus, 
  MoreVertical, 
  CreditCard, 
  CheckCircle2, 
  X,
  User,
  Loader2,
  Filter,
  Download,
  Edit,
  Trash
} from "lucide-react";
import { useAuthStore } from "@/lib/store/auth-store";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as XLSX from "xlsx";

function FarmersPageInner() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const overrideBranchId = searchParams.get('branchId');
  const effectiveBranchId = overrideBranchId || (user?.role !== 'superadmin' ? user?.branchId : null);
  const canEdit = user?.role === 'admin' || user?.role === 'superadmin';
  const [farmers, setFarmers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [editingFarmerId, setEditingFarmerId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [newFarmer, setNewFarmer] = useState({
    name: "",
    mobile: "",
    village: "",
    district: "",
    state: "",
    aadhaar: ""
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 15;

  // Debounce search term to prevent excessive API/DB calls
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reset to page 1 on new search
    }, 400);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  const fetchFarmers = async () => {
    setLoading(true);
    try {
      const url = new URL('/api/farmers', window.location.origin);
      url.searchParams.append('page', currentPage.toString());
      url.searchParams.append('limit', itemsPerPage.toString());
      if (debouncedSearch) {
        url.searchParams.append('search', debouncedSearch);
      }
      if (effectiveBranchId) {
        url.searchParams.append('branchId', effectiveBranchId);
      }
      const res = await fetch(url.toString());
      const result = await res.json();
      if (result && Array.isArray(result.data)) {
        setFarmers(result.data);
        setTotalPages(result.totalPages || 1);
        setTotalCount(result.totalCount || 0);
      } else {
        setFarmers([]);
        setTotalPages(1);
        setTotalCount(0);
        if (result.error) throw new Error(result.error);
      }
    } catch (error) {
      toast.error("Failed to load farmers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFarmers();
  }, [currentPage, debouncedSearch]);

  // We now receive already filtered/paginated farmers from the server
  const paginatedFarmers = farmers;

  const exportToExcel = async () => {
    try {
      const url = new URL('/api/farmers', window.location.origin);
      url.searchParams.append('page', '1');
      url.searchParams.append('limit', '1000000');
      if (debouncedSearch) {
        url.searchParams.append('search', debouncedSearch);
      }
      if (effectiveBranchId) {
        url.searchParams.append('branchId', effectiveBranchId);
      }
      const res = await fetch(url.toString());
      const result = await res.json();
      
      if (result && Array.isArray(result.data)) {
        const dataToExport = result.data.map((f: any) => ({
          'ID': f.id.split('-')[0],
          'Name': f.name,
          'Mobile': f.mobile || 'N/A',
          'Aadhaar': f.aadhaar_no || 'Pending',
          'Village': f.village,
          'District': f.district,
          'State': f.state,
          'Credit Score': f.credit_score,
          'Registered On': new Date(f.created_at).toLocaleDateString()
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Farmers");
        XLSX.writeFile(wb, `Farmers_Directory_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success("Excel downloaded successfully.");
      } else {
        toast.error("Failed to fetch data for export.");
      }
    } catch (error) {
      toast.error("Error exporting to Excel.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newFarmer.mobile?.trim() && !newFarmer.mobile.startsWith('NA')) {
      const rawMobile = newFarmer.mobile.trim();
      const digitsOnly = rawMobile.replace(/[^0-9]/g, '');
      let cleaned = digitsOnly;
      if (cleaned.length === 12 && cleaned.startsWith('91')) {
        cleaned = cleaned.substring(2);
      } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
      }
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(cleaned)) {
        toast.error("Please enter a valid 10-digit mobile number.");
        return;
      }
    }
    
    setSubmitting(true);
    try {
      const url = editingFarmerId ? `/api/farmers/${editingFarmerId}` : '/api/farmers';
      const method = editingFarmerId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFarmer.name,
          mobile: newFarmer.mobile,
          village: newFarmer.village,
          district: newFarmer.district,
          state: newFarmer.state,
          aadhaar_no: newFarmer.aadhaar,
          branchId: effectiveBranchId
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      toast.success(`${newFarmer.name} ${editingFarmerId ? 'updated' : 'registered'} successfully!`);
      setShowRegisterModal(false);
      setEditingFarmerId(null);
      setNewFarmer({ name: "", mobile: "", village: "", district: "", state: "", aadhaar: "" });
      fetchFarmers();
    } catch (error: any) {
      toast.error((editingFarmerId ? "Update failed: " : "Registration failed: ") + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      const res = await fetch(`/api/farmers/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success(`${name} deleted successfully`);
      fetchFarmers();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const openEditModal = (farmer: any) => {
    setEditingFarmerId(farmer.id);
    setNewFarmer({
      name: farmer.name || "",
      mobile: farmer.mobile || "",
      village: farmer.village || "",
      district: farmer.district || "",
      state: farmer.state || "",
      aadhaar: farmer.aadhaar_no || ""
    });
    setShowRegisterModal(true);
  };

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-outfit">Farmers Directory</h1>
          <p className="text-muted-foreground">Manage farmer profiles, KYC documents, and credit history.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={exportToExcel}
            className="inline-flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-900/20"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
          <button 
            onClick={() => setShowRegisterModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
          >
            <UserPlus className="w-4 h-4" />
            Register New Farmer
          </button>
        </div>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="border-b border-border/50 pb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search by name, mobile or village..." 
                className="w-full pl-10 pr-4 py-2.5 bg-muted/50 border border-border rounded-xl text-sm outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 min-h-[400px] relative">
           {loading ? (
             <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
             </div>
           ) : farmers.length === 0 ? (
             <div className="p-20 text-center">
                <Users className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">No farmers registered yet.</p>
             </div>
           ) : (
             <div className="overflow-x-auto">
                <table className="w-full text-sm">
                   <thead>
                      <tr className="bg-muted/30 text-muted-foreground uppercase text-[10px] font-black tracking-widest border-b border-border">
                         <th className="text-left py-4 px-6">Farmer Profile</th>
                         <th className="text-left py-4 px-6">Contact & KYC</th>
                         <th className="text-left py-4 px-6">Location</th>
                         <th className="text-left py-4 px-6">Credit Score</th>
                         <th className="text-right py-4 px-6">Actions</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-border/50">
                      {paginatedFarmers.map(farmer => (
                        <tr key={farmer.id} className="hover:bg-muted/10 transition-colors group">
                           <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black">
                                    {farmer.name.charAt(0)}
                                 </div>
                                 <div>
                                    <p className="font-bold text-slate-900">{farmer.name}</p>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">ID: {farmer.id.split('-')[0]}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="py-4 px-6">
                              <div className="flex flex-col gap-1">
                                 <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                                    <Phone className="w-3.5 h-3.5" />
                                    {farmer.mobile}
                                 </div>
                                 <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase">
                                    <CreditCard className="w-3.5 h-3.5" />
                                    Aadhaar: {farmer.aadhaar_no || 'Pending'}
                                 </div>
                              </div>
                           </td>
                           <td className="py-4 px-6">
                              <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                                 <MapPin className="w-3.5 h-3.5" />
                                 {[farmer.village, farmer.district].filter(Boolean).join(', ') || 'N/A'}
                              </div>
                           </td>
                           <td className="py-4 px-6">
                              <div className="flex items-center gap-2">
                                 <div className="w-12 h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500" style={{ width: `${(farmer.credit_score / 1000) * 100}%` }} />
                                 </div>
                                 <span className="text-xs font-bold text-slate-600">{farmer.credit_score}</span>
                              </div>
                           </td>
                           <td className="py-4 px-6 text-right">
                              {canEdit ? (
                                 <div className="flex items-center justify-end gap-1">
                                    <button onClick={() => openEditModal(farmer)} className="p-2 text-muted-foreground hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all" title="Edit">
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(farmer.id, farmer.name)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all" title="Delete">
                                      <Trash className="w-4 h-4" />
                                    </button>
                                 </div>
                              ) : (
                                 <button className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-slate-900 transition-all">
                                    <MoreVertical className="w-4 h-4" />
                                 </button>
                              )}
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
           )}
           {/* Pagination Controls */}
           {!loading && totalPages > 1 && (
             <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-muted/20">
               <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                 Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} farmers
               </p>
               <div className="flex items-center gap-2">
                 <button
                   onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                   disabled={currentPage === 1}
                   className="px-4 py-2 bg-white border border-border rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50 hover:bg-muted transition-all text-slate-600"
                 >
                   Prev
                 </button>
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 mx-2">
                   Page {currentPage} / {totalPages}
                 </span>
                 <button
                   onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                   disabled={currentPage === totalPages}
                   className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50 hover:bg-slate-800 transition-all"
                 >
                   Next Pg
                 </button>
               </div>
             </div>
           )}
        </CardContent>
      </Card>

      {/* Registration Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
                    <UserPlus className="w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="text-xl font-black text-slate-900 font-outfit">{editingFarmerId ? "Edit Farmer Profile" : "Farmer Registration"}</h3>
                    <p className="text-xs text-muted-foreground">{editingFarmerId ? "Update farmer details and KYC." : "Onboard a new farmer to the branch database."}</p>
                 </div>
              </div>
              <button aria-label="Close Modal" onClick={() => { setShowRegisterModal(false); setEditingFarmerId(null); setNewFarmer({ name: "", mobile: "", village: "", district: "", state: "", aadhaar: "" }); }} className="p-2 hover:bg-muted rounded-xl transition-all">
                 <X className="w-6 h-6 text-muted-foreground" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                     <label htmlFor="farmerName" className="text-xs font-bold text-muted-foreground uppercase">Full Name</label>
                     <input 
                        id="farmerName"
                        type="text" 
                        className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="e.g. Baldev Singh"
                        value={newFarmer.name}
                        onChange={e => setNewFarmer({...newFarmer, name: e.target.value})}
                     />
                  </div>
                  <div className="space-y-2">
                     <label htmlFor="farmerMobile" className="text-xs font-bold text-muted-foreground uppercase">Mobile Number</label>
                     <input 
                        id="farmerMobile"
                        type="tel" 
                        className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="10-digit mobile"
                        value={newFarmer.mobile}
                        onChange={e => setNewFarmer({...newFarmer, mobile: e.target.value})}
                     />
                  </div>
               </div>

               <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                     <label htmlFor="farmerVillage" className="text-xs font-bold text-muted-foreground uppercase">Village / Area</label>
                     <input 
                        id="farmerVillage"
                        type="text" 
                        className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="e.g. Rampur"
                        value={newFarmer.village}
                        onChange={e => setNewFarmer({...newFarmer, village: e.target.value})}
                     />
                  </div>
               </div>

               <div className="pt-4 flex gap-4">
                  <button type="button" onClick={() => { setShowRegisterModal(false); setEditingFarmerId(null); setNewFarmer({ name: "", mobile: "", village: "", district: "", state: "", aadhaar: "" }); }} className="flex-1 py-4 text-sm font-bold text-muted-foreground">Cancel</button>
                  <button type="submit" disabled={submitting} className="flex-[2] py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-xs hover:opacity-90 shadow-xl shadow-primary/20 disabled:opacity-50">
                    {submitting ? (editingFarmerId ? "Updating..." : "Registering...") : (editingFarmerId ? "Save Changes" : "Complete Registration")}
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default function FarmersPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse font-medium">Loading Farmers Directory...</p>
      </div>
    }>
      <FarmersPageInner />
    </Suspense>
  );
}
