"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuthStore } from "@/lib/store/auth-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { 
  Package, 
  Calculator, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle2, 
  Droplets,
  Layers,
  History,
  ArrowDownLeft,
  ArrowUpRight,
  User,
  Phone,
  Mail,
  IndianRupee,
  Scale,
  ChevronRight,
  AlertCircle,
  MapPin,
  Search,
  Filter,
  Download,
  Eye,
  Printer,
  Edit,
  Trash
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import * as XLSX from 'xlsx';

const bagTypes = [
  { id: "30kg", name: "30 KG Bag", weight: 30 },
  { id: "50kg", name: "50 KG Bag", weight: 50 },
  { id: "95kg", name: "95 KG Bag (Jute)", weight: 95 },
  { id: "custom", name: "Custom Weight", weight: 0 },
];

export default function SmallScalePage() {
  const { user } = useAuthStore();
  
  // State for rates
  const [availableRates, setAvailableRates] = useState<any[]>([]);
  
  const [entryType] = useState<'IN'>('IN'); // Force only PURCHASE (IN)
  const [inputMode, setInputMode] = useState<'BAG' | 'BULK'>('BAG');
  
  const [partyInfo, setPartyInfo] = useState({
    name: "",
    mobile: "",
    email: "",
    address: ""
  });
  
  const [grainCategory, setGrainCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [pricePerUnit, setPricePerUnit] = useState(""); // Rate per MT
  
  const [entries, setEntries] = useState([
    { id: 1, bagType: "50kg", count: "", weight: 50, subtotal: 0 },
  ]);
  
  const [bulkWeight, setBulkWeight] = useState(""); // in KG
  const [moisture, setMoisture] = useState("");
  const [foreignMatter, setForeignMatter] = useState("");
  const [selectedBin, setSelectedBin] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter States
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    slipNo: "",
    category: "",
    subcategory: ""
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const fetchRates = async () => {
    if (!user?.branchId) return;
    try {
      const res = await fetch(`/api/rates?branchId=${user.branchId}`);
      const data = await res.json();
      setAvailableRates(data);
      if (data.length > 0 && !grainCategory) {
        setGrainCategory(data[0].category_name);
      }
    } catch (error) {
      console.error("Failed to fetch rates:", error);
    }
  };

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (user?.branchId) params.append('branchId', user.branchId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.slipNo) params.append('slipNo', filters.slipNo);
      if (filters.category) params.append('category', filters.category);
      if (filters.subcategory) params.append('subcategory', filters.subcategory);

      const res = await fetch(`/api/small-scale?${params.toString()}`);
      const data = await res.json();
      if (!data.error) {
        setLogs(data);
      }
    } catch (error) {
      console.error("Failed to fetch small scale logs:", error);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return logs.slice(start, start + itemsPerPage);
  }, [logs, currentPage]);

  const totalPages = Math.ceil(logs.length / itemsPerPage);

  useEffect(() => {
    fetchRates();
    fetchLogs();
  }, [user]);

  // Update subcategories and price when category changes
  useEffect(() => {
    const selected = availableRates.find(r => r.category_name === grainCategory);
    if (selected) {
      setPricePerUnit(selected.procurement_rate);
      // Reset subcategory if not in the new category
      let subs = [];
      try {
        if (Array.isArray(selected.subcategories)) {
          subs = selected.subcategories;
        } else if (typeof selected.subcategories === 'string') {
          subs = JSON.parse(selected.subcategories);
        } else {
          subs = [];
        }
      } catch (e) {
        console.error("Error parsing subcategories", e);
      }
      if (subs.length > 0) {
        setSubcategory(subs[0]);
      } else {
        setSubcategory("");
      }
    }
  }, [grainCategory, availableRates]);

  const addEntry = () => {
    setEntries([...entries, { id: Date.now(), bagType: "50kg", count: "", weight: 50, subtotal: 0 }]);
  };

  const removeEntry = (id: number) => {
    if (entries.length > 1) {
      setEntries(entries.filter(e => e.id !== id));
    }
  };

  const updateEntry = (id: number, field: string, value: any) => {
    const updatedEntries = entries.map(e => {
      if (e.id === id) {
        const updated = { ...e, [field]: value };
        if (field === "bagType") {
          const type = bagTypes.find(t => t.id === value);
          updated.weight = type?.weight || 0;
        }
        updated.subtotal = parseFloat(updated.count || "0") * updated.weight;
        return updated;
      }
      return e;
    });
    setEntries(updatedEntries);
  };

  const totalWeight = inputMode === 'BAG' 
    ? entries.reduce((acc, curr) => acc + (curr.subtotal || 0), 0)
    : parseFloat(bulkWeight || "0");

  const totalBags = inputMode === 'BAG'
    ? entries.reduce((acc, curr) => acc + parseInt(curr.count || "0"), 0)
    : 0;

  const totalAmount = (totalWeight / 100) * parseFloat(pricePerUnit || "0");

  const handleSave = async () => {
    if (totalWeight <= 0) {
      toast.error("Please enter weight details");
      return;
    }
    if (!grainCategory) {
      toast.error("Please select a grain category");
      return;
    }

    if (partyInfo.mobile.trim()) {
      const rawMobile = partyInfo.mobile.trim();
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

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/small-scale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: user?.branchId,
          bags: inputMode === 'BAG' ? entries : [],
          totalWeight,
          totalBags,
          moisture,
          foreignMatter,
          storageLocation: selectedBin,
          createdBy: user?.id,
          entryType,
          partyName: partyInfo.name,
          partyMobile: partyInfo.mobile,
          partyEmail: partyInfo.email,
          address: partyInfo.address,
          grainCategory,
          subcategory,
          pricePerUnit: parseFloat(pricePerUnit) || 0,
          totalAmount
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      toast.success(`Purchase entry recorded and ledger updated!`);
      
      // Reset form
      setEntries([{ id: 1, bagType: "50kg", count: "", weight: 50, subtotal: 0 }]);
      setBulkWeight("");
      setMoisture("");
      setForeignMatter("");
      setSelectedBin("");
      setPartyInfo({ name: "", mobile: "", email: "", address: "" });
      fetchLogs();
    } catch (error: any) {
      toast.error("Failed to save entry: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportToExcel = () => {
    const dataToExport = logs.map(log => ({
      'Slip No.': log.id,
      'Date': new Date(log.created_at).toLocaleDateString(),
      'Time': new Date(log.created_at).toLocaleTimeString(),
      'Farmer Name': log.party_name,
      'Mobile': log.party_mobile,
      'Category': log.grain_category,
      'Subcategory': log.subcategory || '-',
      'Weight (KG)': log.total_weight,
      'Rate (QTL)': log.price_per_unit,
      'Total Amount': log.total_amount,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Slip History");
    XLSX.writeFile(wb, `SmallScale_History_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const canDelete = user?.role === 'superadmin' || user?.role === 'admin';

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this slip?")) return;
    try {
        const res = await fetch(`/api/small-scale/${id}`, { method: 'DELETE' });
        if (res.ok) {
            toast.success("Entry deleted successfully");
            fetchLogs();
        } else {
            const data = await res.json();
            toast.error(data.error || "Failed to delete");
        }
    } catch (error) {
        toast.error("An error occurred");
    }
  };

  const assignedTemplates = ((user?.permissions as any)?.template || '').split(',').map((t: string)=>t.trim());
  const canCreate = user?.role !== 'staff' || assignedTemplates.includes('Weighman') || assignedTemplates.includes('Godown Keeper') || assignedTemplates.includes('Small Scale');

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-outfit">Small Scale Purchase</h1>
          <p className="text-muted-foreground">Manage small quantity purchases with ledger integration.</p>
        </div>
        <div className="flex bg-primary/10 p-1 rounded-xl">
           <div className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-black bg-white text-primary shadow-sm">
             <ArrowDownLeft className="w-4 h-4" />
             PURCHASE (IN)
           </div>
        </div>
      </div>

      {canCreate && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Party Info Card */}
          <Card className="border-none shadow-sm overflow-hidden">
             <div className="h-1 bg-primary" />
             <CardHeader>
                <div className="flex items-center gap-2">
                   <User className="w-5 h-5 text-muted-foreground" />
                   <CardTitle className="text-lg">Farmer / Vendor Details</CardTitle>
                </div>
             </CardHeader>
             <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Full Name (Optional)</label>
                   <input 
                     type="text" 
                     placeholder="Name"
                     className="w-full px-4 py-2 bg-muted/50 border border-border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                     value={partyInfo.name}
                     onChange={e => setPartyInfo({...partyInfo, name: e.target.value})}
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Mobile Number (Optional)</label>
                   <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input 
                        type="text" 
                        placeholder="Mobile"
                        className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        value={partyInfo.mobile}
                        onChange={e => setPartyInfo({...partyInfo, mobile: e.target.value})}
                      />
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Email (Optional)</label>
                   <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input 
                        type="email" 
                        placeholder="Email"
                        className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        value={partyInfo.email}
                        onChange={e => setPartyInfo({...partyInfo, email: e.target.value})}
                      />
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Address (Optional)</label>
                   <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input 
                        type="text" 
                        placeholder="Address"
                        className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        value={partyInfo.address}
                        onChange={e => setPartyInfo({...partyInfo, address: e.target.value})}
                      />
                   </div>
                </div>
             </CardContent>
          </Card>

          {/* Weighing Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-4">
                 <div>
                    <CardTitle>Weight & Pricing</CardTitle>
                    <CardDescription>Record quantities and rates</CardDescription>
                 </div>
                 <div className="flex bg-muted p-1 rounded-lg">
                    <button 
                      onClick={() => setInputMode('BAG')}
                      className={cn("px-3 py-1 text-[10px] font-black rounded-md transition-all", inputMode === 'BAG' ? "bg-white shadow-sm" : "opacity-50")}
                    >BAGS</button>
                    <button 
                      onClick={() => setInputMode('BULK')}
                      className={cn("px-3 py-1 text-[10px] font-black rounded-md transition-all", inputMode === 'BULK' ? "bg-white shadow-sm" : "opacity-50")}
                    >BULK KG</button>
                 </div>
              </div>
              {inputMode === 'BAG' && (
                <button 
                  onClick={addEntry}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Row
                </button>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-4 border-b border-border/50">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Grain Category</label>
                    <select 
                      value={grainCategory}
                      onChange={e => setGrainCategory(e.target.value)}
                      className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
                    >
                       <option value="">Select Category</option>
                       {availableRates.map(r => <option key={r.id} value={r.category_name}>{r.category_name}</option>)}
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Subcategory</label>
                    <select 
                      value={subcategory}
                      onChange={e => setSubcategory(e.target.value)}
                      className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
                    >
                       <option value="">Select Subcategory</option>
                       {(() => {
                         const selected = availableRates.find(r => r.category_name === grainCategory);
                         if (!selected) return null;
                         try {
                           let subs = [];
                           if (Array.isArray(selected.subcategories)) {
                             subs = selected.subcategories;
                           } else if (typeof selected.subcategories === 'string') {
                             subs = JSON.parse(selected.subcategories);
                           }
                           
                           return subs.map((sub: string) => (
                             <option key={sub} value={sub}>{sub}</option>
                           ));
                         } catch (e) {
                           return null;
                         }
                       })()}
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Rate (Per QTL)</label>
                    <div className="relative">
                       <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                       <input 
                         type="number" 
                         placeholder="0.00"
                         className="w-full pl-10 pr-4 py-2.5 bg-muted/50 border border-border rounded-xl text-sm font-black focus:ring-2 focus:ring-primary/20 outline-none"
                         value={pricePerUnit}
                         onChange={e => setPricePerUnit(e.target.value)}
                       />
                    </div>
                 </div>
              </div>

              {inputMode === 'BAG' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-12 gap-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2">
                    <div className="col-span-5">Bag Type</div>
                    <div className="col-span-3">Bag Count</div>
                    <div className="col-span-3 text-right">Subtotal (KG)</div>
                    <div className="col-span-1"></div>
                  </div>
                  
                  <div className="space-y-3">
                    {entries.map((entry) => (
                      <div key={entry.id} className="grid grid-cols-12 gap-4 items-center animate-in fade-in slide-in-from-left-2 duration-300">
                        <div className="col-span-5">
                          <select 
                            value={entry.bagType}
                            onChange={(e) => updateEntry(entry.id, "bagType", e.target.value)}
                            className="w-full px-4 py-2 bg-muted/50 border border-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                          >
                            {bagTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        </div>
                        <div className="col-span-3">
                          <input 
                            type="number" 
                            value={entry.count}
                            onChange={(e) => updateEntry(entry.id, "count", e.target.value)}
                            placeholder="0"
                            className="w-full px-4 py-2 bg-muted/50 border border-border rounded-xl text-sm font-black focus:ring-2 focus:ring-primary/20 outline-none"
                          />
                        </div>
                        <div className="col-span-3 text-right">
                          <span className="text-sm font-black text-slate-700">{entry.subtotal.toFixed(1)}</span>
                        </div>
                        <div className="col-span-1 text-right">
                          <button 
                            onClick={() => removeEntry(entry.id)}
                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-8 flex flex-col items-center justify-center space-y-4">
                   <div className="w-full max-w-xs space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center block">Total Weight (In Kilograms)</label>
                      <div className="relative">
                         <Scale className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                         <input 
                           type="number" 
                           placeholder="0.00"
                           className="w-full pl-12 pr-4 py-4 bg-muted/30 border-2 border-border rounded-2xl text-2xl font-black text-center focus:border-primary/50 focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                           value={bulkWeight}
                           onChange={e => setBulkWeight(e.target.value)}
                         />
                      </div>
                   </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Summary Side Panel */}
        <div className="space-y-6">
          <Card className="text-white border-none shadow-2xl overflow-hidden relative bg-slate-900">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
            <CardHeader className="relative z-10">
              <CardTitle className="text-white opacity-80 uppercase text-xs tracking-widest font-black">Operation Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8 relative z-10">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
                  <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Quantity</p>
                  <p className="text-xl font-black">{totalWeight.toFixed(1)} <span className="text-xs opacity-50">KG</span></p>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
                  <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Quintals</p>
                  <p className="text-xl font-black">{(totalWeight / 100).toFixed(2)} <span className="text-xs opacity-50">Qtl</span></p>
                </div>
              </div>

              <div className="space-y-2">
                 <p className="text-[10px] font-black text-white/50 uppercase tracking-widest text-center">Estimated Total Value</p>
                 <div className="text-4xl font-black text-center tracking-tighter text-white">
                    {formatCurrency(totalAmount)}
                 </div>
              </div>

              <button 
                onClick={handleSave}
                disabled={isSubmitting}
                className="w-full bg-white text-slate-900 font-black py-5 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl flex items-center justify-center gap-3 mt-4 disabled:opacity-50 disabled:scale-100"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {isSubmitting ? "PROCESSING..." : "CONFIRM PURCHASE"}
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
      )}

      {/* Slip History Section */}
      <Card className="border-none shadow-sm">
        <CardHeader className="border-b border-border/50 pb-6">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                 <CardTitle className="text-xl font-black font-outfit uppercase tracking-tight">Slip History</CardTitle>
                 <CardDescription>Track and manage all small scale purchase entries</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                 {user?.role !== 'staff' && (
                   <button 
                     onClick={exportToExcel}
                     className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-all shadow-sm"
                   >
                      <Download className="w-4 h-4" />
                      Export Excel
                   </button>
                 )}
                 <button 
                   onClick={fetchLogs}
                   className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-sm"
                 >
                    <Search className="w-4 h-4" />
                    Apply Filters
                 </button>
              </div>
           </div>

           {/* Advanced Filters */}
           <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-6">
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-muted-foreground uppercase">From Date</label>
                 <input 
                   type="date" 
                   value={filters.startDate}
                   onChange={e => setFilters({...filters, startDate: e.target.value})}
                   className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-xs font-bold"
                 />
              </div>
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-muted-foreground uppercase">To Date</label>
                 <input 
                   type="date" 
                   value={filters.endDate}
                   onChange={e => setFilters({...filters, endDate: e.target.value})}
                   className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-xs font-bold"
                 />
              </div>
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-muted-foreground uppercase">Slip No.</label>
                 <input 
                   type="text" 
                   placeholder="Enter #"
                   value={filters.slipNo}
                   onChange={e => setFilters({...filters, slipNo: e.target.value})}
                   className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-xs font-bold"
                 />
              </div>
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-muted-foreground uppercase">Category</label>
                 <select 
                    value={filters.category}
                    onChange={e => setFilters({...filters, category: e.target.value, subcategory: ""})}
                    className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-xs font-bold appearance-none"
                 >
                    <option value="">All Categories</option>
                    {availableRates.map(r => <option key={r.id} value={r.category_name}>{r.category_name}</option>)}
                 </select>
              </div>
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-muted-foreground uppercase">Subcategory</label>
                 <select 
                   value={filters.subcategory}
                   onChange={e => setFilters({...filters, subcategory: e.target.value})}
                   disabled={!filters.category}
                   className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-xs font-bold appearance-none disabled:opacity-50"
                 >
                   <option value="">{filters.category ? "All Subcategories" : "Select Category First"}</option>
                   {(() => {
                      const selected = availableRates.find(r => r.category_name === filters.category);
                      if (!selected) return null;
                      try {
                         let subs = [];
                         if (Array.isArray(selected.subcategories)) {
                            subs = selected.subcategories;
                         } else if (typeof selected.subcategories === 'string') {
                            subs = JSON.parse(selected.subcategories);
                         }
                         return subs.map((sub: string) => (
                            <option key={sub} value={sub}>{sub}</option>
                         ));
                      } catch (e) {
                         return null;
                      }
                   })()}
                 </select>
              </div>
           </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Slip No.</th>
                  <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Grain Category</th>
                  <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Subcategory</th>
                  <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Net Weight</th>
                  <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Date & Time</th>
                  <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground font-bold italic">
                      No records found matching your filters.
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-all group">
                      <td className="px-6 py-4 font-black text-slate-900">#{log.id}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-primary/10 text-primary rounded text-[10px] font-black uppercase">
                          {log.grain_category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-600">{log.subcategory || '-'}</td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-black text-slate-900">{log.total_weight}</span>
                        <span className="text-[10px] ml-1 font-bold text-muted-foreground">KG</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                          log.status === 'APPROVED' ? "bg-green-100 text-green-700" :
                          log.status === 'REJECTED' ? "bg-red-100 text-red-700" :
                          "bg-amber-100 text-amber-700 animate-pulse"
                        )}>
                          {log.status || 'PENDING'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-900">{formatDate(log.created_at)}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(log.created_at).toLocaleTimeString()}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 ">
                           <button className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all" title="View">
                             <Eye className="w-4 h-4" />
                           </button>
                           <button className="p-2 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Print">
                             <Printer className="w-4 h-4" />
                           </button>
                           <button className="p-2 text-muted-foreground hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all" title="Edit">
                             <Edit className="w-4 h-4" />
                           </button>
                           {canDelete && (
                             <button 
                                onClick={() => handleDelete(log.id)}
                                className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all" 
                                title="Delete"
                             >
                               <Trash className="w-4 h-4" />
                             </button>
                           )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-muted/20">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, logs.length)} of {logs.length} entries
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
    </div>
  );
}
