"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { 
  Warehouse, 
  ArrowUpRight, 
  ArrowDownRight, 
  Search, 
  Filter, 
  Plus, 
  Layers, 
  History,
  Box,
  MapPin,
  TrendingUp,
  Download,
  Loader2,
  Calendar,
  X,
  ArrowLeft,
  IndianRupee
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/lib/store/auth-store";
import { toast } from "sonner";

export default function StockManagementPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'IN' | 'OUT' | 'EXPENSE' | 'PROFIT'>('IN');
  const [isSubView, setIsSubView] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Filters
  const [filters, setFilters] = useState({
    startDate: new Date().toISOString().split('T')[0], // Today
    endDate: new Date().toISOString().split('T')[0],   // Today
    category: 'ALL',
    subcategory: 'ALL'
  });

  const [availableRates, setAvailableRates] = useState<any[]>([]);

  const fetchRates = async () => {
    if (!user?.branchId) return;
    try {
      const res = await fetch(`/api/rates?branchId=${user.branchId}`);
      const rates = await res.json();
      setAvailableRates(rates);
    } catch (error) {
      console.error("Failed to fetch rates:", error);
    }
  };

  const fetchStockReport = async () => {
    if (!user?.branchId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        branchId: user.branchId,
        startDate: filters.startDate,
        endDate: filters.endDate,
        category: filters.category,
        subcategory: filters.subcategory
      });
      
      const res = await fetch(`/api/stock/report?${params.toString()}`);
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      setData(result);
    } catch (error: any) {
      toast.error("Failed to load stock report: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, [user]);

  useEffect(() => {
    fetchStockReport();
  }, [user, filters]);

  const categories = useMemo(() => {
    return ['ALL', ...availableRates.map(r => r.category_name)];
  }, [availableRates]);

  const subcategories = useMemo(() => {
    if (filters.category === 'ALL') return ['ALL'];
    const cat = availableRates.find(r => r.category_name === filters.category);
    if (!cat) return ['ALL'];
    let subs = [];
    try {
      subs = typeof cat.subcategories === 'string' ? JSON.parse(cat.subcategories) : (cat.subcategories || []);
    } catch (e) { subs = []; }
    return ['ALL', ...subs];
  }, [filters.category, availableRates]);

  // Aggregate breakdown data by category for initial modal view
  const categorySummary = useMemo(() => {
    if (!data?.breakdown) return [];
    const aggregated: Record<string, any> = {};
    
    data.breakdown.forEach((item: any) => {
      if (!aggregated[item.category]) {
        aggregated[item.category] = { 
          name: item.category, 
          inVolume: 0, 
          inAmount: 0, 
          outVolume: 0, 
          outAmount: 0,
          profit: 0
        };
      }
      aggregated[item.category].inVolume += item.inVolume;
      aggregated[item.category].inAmount += item.inAmount;
      aggregated[item.category].outVolume += item.outVolume;
      aggregated[item.category].outAmount += item.outAmount;
      aggregated[item.category].profit += item.profit;
    });

    return Object.values(aggregated).map((item: any) => {
      return {
        ...item,
        inAvgRate: item.inVolume > 0 ? item.inAmount / item.inVolume : 0,
        outAvgRate: item.outVolume > 0 ? item.outAmount / item.outVolume : 0
      };
    });
  }, [data]);

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight font-outfit text-slate-900 uppercase">Inventory Analysis</h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time inward, outward and net stock tracking.</p>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
              <button className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white shadow-lg flex items-center gap-2">
                 <Box className="w-3.5 h-3.5" />
                 Live Stock
              </button>
           </div>
        </div>
      </div>

      {/* Advanced Filters */}
      <Card className="border-none shadow-sm bg-slate-50/50">
        <CardContent className="p-6">
           <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Calendar className="w-3 h-3" /> From Date
                 </label>
                 <input 
                   type="date" 
                   className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20"
                   value={filters.startDate}
                   onChange={e => setFilters({...filters, startDate: e.target.value})}
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Calendar className="w-3 h-3" /> To Date
                 </label>
                 <input 
                   type="date" 
                   className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20"
                   value={filters.endDate}
                   min={filters.startDate}
                   onChange={e => setFilters({...filters, endDate: e.target.value})}
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Filter className="w-3 h-3" /> Category
                 </label>
                 <select 
                   className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                   value={filters.category}
                   onChange={e => setFilters({...filters, category: e.target.value, subcategory: 'ALL'})}
                 >
                   {categories.map(c => <option key={c} value={c}>{c === 'ALL' ? 'All Categories' : c}</option>)}
                 </select>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Filter className="w-3 h-3" /> Subcategory
                 </label>
                 <select 
                   className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                   value={filters.subcategory}
                   onChange={e => setFilters({...filters, subcategory: e.target.value})}
                   disabled={filters.category === 'ALL'}
                 >
                   {subcategories.map(s => <option key={s} value={s}>{s === 'ALL' ? 'All Subcategories' : s}</option>)}
                 </select>
              </div>
           </div>
        </CardContent>
      </Card>

      {/* Summary Cards Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card 
          onClick={() => { setModalType('IN'); setIsSubView(false); setIsModalOpen(true); }}
          className="border-none shadow-sm overflow-hidden group hover:shadow-xl transition-all duration-500 cursor-pointer"
        >
          <div className="h-1.5 bg-emerald-500" />
          <CardContent className="pt-6">
             <div className="flex items-center justify-between">
                <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-600 group-hover:scale-110 transition-transform">
                   <ArrowDownRight className="w-6 h-6" />
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Purchases</p>
                   <h3 className="text-2xl font-black text-slate-900 font-outfit mt-1">
                      {loading ? "..." : (data?.summary?.totalInWeight || 0).toFixed(2)} <span className="text-xs text-slate-400">QTL</span>
                   </h3>
                </div>
             </div>
             <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                <div>
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Avg Rate: </span>
                   <span className="text-xs font-black text-emerald-600">{formatCurrency(data?.summary?.avgInRate || 0)}</span>
                </div>
                <span className="text-sm font-black text-slate-900">{formatCurrency(data?.summary?.totalInAmount || 0)}</span>
             </div>
          </CardContent>
        </Card>

        <Card 
          onClick={() => { setModalType('OUT'); setIsSubView(false); setIsModalOpen(true); }}
          className="border-none shadow-sm overflow-hidden group hover:shadow-xl transition-all duration-500 cursor-pointer"
        >
          <div className="h-1.5 bg-blue-500" />
          <CardContent className="pt-6">
             <div className="flex items-center justify-between">
                <div className="p-3 bg-blue-100 rounded-2xl text-blue-600 group-hover:scale-110 transition-transform">
                   <ArrowUpRight className="w-6 h-6" />
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Sales</p>
                   <h3 className="text-2xl font-black text-slate-900 font-outfit mt-1">
                      {loading ? "..." : (data?.summary?.totalOutWeight || 0).toFixed(2)} <span className="text-xs text-slate-400">QTL</span>
                   </h3>
                </div>
             </div>
             <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                <div>
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Avg Rate: </span>
                   <span className="text-xs font-black text-blue-600">{formatCurrency(data?.summary?.avgOutRate || 0)}</span>
                </div>
                <span className="text-sm font-black text-slate-900">{formatCurrency(data?.summary?.totalOutAmount || 0)}</span>
             </div>
          </CardContent>
        </Card>

        <Card 
          onClick={() => { setModalType('EXPENSE'); setIsSubView(false); setIsModalOpen(true); }}
          className="border-none shadow-sm overflow-hidden group hover:shadow-xl transition-all duration-500 cursor-pointer"
        >
          <div className="h-1.5 bg-amber-500" />
          <CardContent className="pt-6">
             <div className="flex items-center justify-between">
                <div className="p-3 bg-amber-100 rounded-2xl text-amber-600 group-hover:scale-110 transition-transform">
                   <IndianRupee className="w-6 h-6" />
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operating Expenses</p>
                   <h3 className="text-2xl font-black text-slate-900 font-outfit mt-1">
                      {loading ? "..." : formatCurrency(data?.summary?.totalExpenses || 0)}
                   </h3>
                </div>
             </div>
             <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Period Overhead</span>
                <span className="text-xs font-bold text-slate-400 uppercase">Salaries, Rent, Bills</span>
             </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card 
          onClick={() => { setModalType('PROFIT'); setIsSubView(false); setIsModalOpen(true); }}
          className="border-none shadow-sm overflow-hidden group hover:shadow-xl transition-all duration-500 cursor-pointer"
        >
          <div className="h-1.5 bg-indigo-500" />
          <CardContent className="pt-6">
             <div className="flex items-center justify-between">
                <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600">
                   <TrendingUp className="w-6 h-6" />
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gross Profit/Loss</p>
                   <h3 className={cn(
                     "text-2xl font-black font-outfit mt-1",
                     (data?.summary?.grossProfit || 0) >= 0 ? "text-green-600" : "text-red-600"
                   )}>
                      {loading ? "..." : formatCurrency(data?.summary?.grossProfit || 0)}
                   </h3>
                </div>
             </div>
             <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Sales Margin Analysis</span>
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty * (Avg Out - Avg In)</span>
             </div>
          </CardContent>
        </Card>

        <Card 
          onClick={() => { setModalType('PROFIT'); setIsSubView(false); setIsModalOpen(true); }}
          className="border-none shadow-2xl overflow-hidden group bg-slate-900 text-white relative cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-3xl" />
          <div className="h-1.5 bg-primary" />
          <CardContent className="pt-6 relative">
             <div className="flex items-center justify-between">
                <div className="p-3 bg-white/10 rounded-2xl text-white backdrop-blur-md">
                   <Warehouse className="w-6 h-6 text-primary" />
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">Net Profit / Loss</p>
                   <h3 className={cn(
                     "text-2xl font-black font-outfit mt-1",
                     (data?.summary?.netProfit || 0) >= 0 ? "text-primary" : "text-red-400"
                   )}>
                      {loading ? "..." : formatCurrency(data?.summary?.netProfit || 0)}
                   </h3>
                </div>
             </div>
             <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-[10px] font-black text-white/50 uppercase tracking-tight">Bottom Line Performance</span>
                <span className="text-[10px] font-black text-primary uppercase">Final Margin</span>
             </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm overflow-hidden group hover:shadow-xl transition-all duration-500">
          <div className="h-1.5 bg-slate-400" />
          <CardContent className="pt-6">
             <div className="flex items-center justify-between">
                <div className="p-3 bg-slate-100 rounded-2xl text-slate-600">
                   <Box className="w-6 h-6" />
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Net Closing Stock</p>
                   <h3 className="text-2xl font-black text-slate-900 font-outfit mt-1">
                      {loading ? "..." : (data?.summary?.netStock || 0).toFixed(2)} <span className="text-xs text-slate-400">QTL</span>
                   </h3>
                </div>
             </div>
             <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Available Inventory</span>
                <span className="text-[10px] font-black text-slate-400 uppercase">In - Out</span>
             </div>
          </CardContent>
        </Card>
      </div>


      {/* Breakdown Table */}
      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-white border-b border-slate-100 flex flex-row items-center justify-between py-6">
           <div>
              <CardTitle className="text-xl font-black font-outfit uppercase tracking-tight text-slate-900">Category-wise Analysis</CardTitle>
              <CardDescription>Detailed inward/outward performance by grain variety.</CardDescription>
           </div>
           {user?.role !== 'staff' && (
             <button className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-all border border-slate-200">
                <Download className="w-5 h-5" />
             </button>
           )}
        </CardHeader>
        <CardContent className="p-0">
           {loading ? (
             <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-400">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-xs font-black uppercase tracking-widest">Generating Dynamic Report...</p>
             </div>
           ) : (
             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                   <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                         <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Commodity</th>
                         <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center bg-green-50/50">Inward (Qtl)</th>
                         <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center bg-green-50/50">Avg In Rate</th>
                         <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center bg-blue-50/50">Outward (Qtl)</th>
                         <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center bg-blue-50/50">Avg Out Rate</th>
                         <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Net Stock</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                      {data?.breakdown?.length === 0 ? (
                        <tr>
                           <td colSpan={6} className="py-20 text-center">
                              <TrendingUp className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No transactions found for selected filters</p>
                           </td>
                        </tr>
                      ) : (
                        data?.breakdown?.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                             <td className="px-8 py-6">
                                <div className="flex items-center gap-3">
                                   <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-900 font-black text-xs">
                                      {item.category.charAt(0)}
                                   </div>
                                   <div>
                                      <p className="text-sm font-black text-slate-900">{item.category}</p>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{item.subcategory}</p>
                                   </div>
                                </div>
                             </td>
                             <td className="px-6 py-6 text-center font-mono font-bold text-slate-600 bg-green-50/10">
                                {item.inVolume.toFixed(2)}
                             </td>
                             <td className="px-6 py-6 text-center font-black text-green-600 bg-green-50/10">
                                {formatCurrency(item.inAvgRate)}
                             </td>
                             <td className="px-6 py-6 text-center font-mono font-bold text-slate-600 bg-blue-50/10">
                                {item.outVolume.toFixed(2)}
                             </td>
                             <td className="px-6 py-6 text-center font-black text-blue-600 bg-blue-50/10">
                                {formatCurrency(item.outAvgRate)}
                             </td>
                             <td className="px-8 py-6 text-right">
                                <span className={cn(
                                   "px-3 py-1 rounded-lg text-xs font-black",
                                   item.netStock > 0 ? "bg-green-100 text-green-700" : 
                                   item.netStock < 0 ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"
                                )}>
                                   {item.netStock.toFixed(2)} Qtl
                                </span>
                             </td>
                          </tr>
                        ))
                      )}
                   </tbody>
                   {data?.breakdown?.length > 0 && (
                     <tfoot className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest sticky bottom-0 z-10">
                        <tr>
                           <td className="px-8 py-5">Grand Total Analysis</td>
                           <td className="px-6 py-5 text-center">{data?.summary?.totalInWeight.toFixed(2)}</td>
                           <td className="px-6 py-5 text-center text-primary">{formatCurrency(data?.summary?.avgInRate)}</td>
                           <td className="px-6 py-5 text-center">{data?.summary?.totalOutWeight.toFixed(2)}</td>
                           <td className="px-6 py-5 text-center text-primary">{formatCurrency(data?.summary?.avgOutRate)}</td>
                           <td className="px-8 py-5 text-right text-primary">{data?.summary?.netStock.toFixed(2)} Qtl</td>
                        </tr>
                     </tfoot>
                   )}
                </table>
             </div>
           )}
        </CardContent>
      </Card>

      {/* Drill-down Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">
              <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                 <div className="flex items-center gap-3">
                    {(isSubView || modalType === 'EXPENSE' || modalType === 'PROFIT') && (
                      <button 
                        onClick={() => {
                          if (isSubView) setIsSubView(false);
                          else setIsModalOpen(false);
                        }}
                        className="p-2 hover:bg-slate-200 rounded-full transition-all"
                      >
                         <ArrowLeft className="w-4 h-4" />
                      </button>
                    )}
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      modalType === 'IN' ? "bg-emerald-100 text-emerald-600" : 
                      modalType === 'OUT' ? "bg-blue-100 text-blue-600" :
                      modalType === 'EXPENSE' ? "bg-amber-100 text-amber-600" : "bg-indigo-100 text-indigo-600"
                    )}>
                       {modalType === 'IN' ? <ArrowDownRight className="w-5 h-5" /> : 
                        modalType === 'OUT' ? <ArrowUpRight className="w-5 h-5" /> :
                        modalType === 'EXPENSE' ? <IndianRupee className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
                    </div>
                    <div>
                       <h2 className="text-xl font-black font-outfit text-slate-900">
                          {modalType === 'EXPENSE' ? 'Expense Breakdown' : 
                           modalType === 'PROFIT' ? 'Commodity Profit Analysis' :
                           isSubView ? `${selectedCategory} Details` : 
                           (modalType === 'IN' ? 'Inward Category Breakdown' : 'Outward Category Breakdown')}
                       </h2>
                       <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                          {modalType === 'EXPENSE' ? 'Detailed overhead spending' :
                           modalType === 'PROFIT' ? 'Net profit performance by grain' :
                           isSubView ? "Variety wise performance" : "Select a category to see varieties"}
                       </p>
                    </div>
                 </div>
                 <button 
                   onClick={() => setIsModalOpen(false)}
                   className="p-2 hover:bg-slate-200 rounded-full transition-all"
                 >
                    <X className="w-5 h-5" />
                 </button>
              </div>

              <div className="p-6 max-h-[60vh] overflow-y-auto">
                 <div className="grid grid-cols-1 gap-4">
                    {modalType === 'EXPENSE' ? (
                       // Expense Modal Content
                       data?.expenseBreakdown?.map((item: any, idx: number) => {
                          const percentage = (item.value / data.summary.totalExpenses) * 100;
                          return (
                            <div key={idx} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/30">
                               <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                     <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center font-black text-[10px] text-slate-400">
                                        {item.name.substring(0, 2).toUpperCase()}
                                     </div>
                                     <p className="text-sm font-black text-slate-900">{item.name}</p>
                                  </div>
                                  <p className="text-sm font-black text-slate-900">{formatCurrency(item.value)}</p>
                               </div>
                               <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-amber-500 transition-all duration-1000" style={{ width: `${percentage}%` }} />
                               </div>
                            </div>
                          );
                       })
                    ) : modalType === 'PROFIT' ? (
                       // Profit Modal Content
                        <>
                          {categorySummary.map((item: any, idx: number) => {
                             const percentage = Math.min(100, Math.max(0, (Math.abs(item.profit) / Math.max(Math.abs(data.summary.grossProfit), 1)) * 100));
                             return (
                               <div key={idx} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/30">
                                  <div className="flex items-center justify-between mb-3">
                                     <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center font-black text-[10px] text-slate-400">
                                           {item.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <p className="text-sm font-black text-slate-900">{item.name}</p>
                                     </div>
                                     <p className={cn("text-sm font-black", item.profit >= 0 ? "text-green-600" : "text-red-600")}>
                                        {formatCurrency(item.profit)}
                                     </p>
                                  </div>
                                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                     <div className={cn("h-full transition-all duration-1000", item.profit >= 0 ? "bg-indigo-500" : "bg-red-500")} style={{ width: `${percentage}%` }} />
                                  </div>
                               </div>
                             );
                          })}
                          
                          {/* Expense Deduction Row */}
                          <div className="p-4 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/30 mt-4">
                             <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center font-black text-[10px]">
                                      EX
                                   </div>
                                   <div>
                                      <p className="text-sm font-black text-slate-900">Operating Expenses</p>
                                      <p className="text-[10px] font-bold text-amber-600 uppercase tracking-tight">Deducted from Gross Profit</p>
                                   </div>
                                </div>
                                <p className="text-sm font-black text-red-600">
                                   -{formatCurrency(data?.summary?.totalExpenses)}
                                </p>
                             </div>
                          </div>
                        </>
                    ) : !isSubView ? (
                      // Category View (IN/OUT)
                      categorySummary.filter((item: any) => modalType === 'IN' ? item.inVolume > 0 : item.outVolume > 0).map((item: any, idx: number) => {
                        const volume = modalType === 'IN' ? item.inVolume : item.outVolume;
                        const rate = modalType === 'IN' ? item.inAvgRate : item.outAvgRate;
                        const totalVolume = modalType === 'IN' ? data.summary.totalInWeight : data.summary.totalOutWeight;
                        const percentage = (volume / totalVolume) * 100;

                        return (
                          <div 
                            key={idx} 
                            onClick={() => { setSelectedCategory(item.name); setIsSubView(true); }}
                            className="p-4 rounded-2xl border border-slate-100 bg-slate-50/30 hover:bg-primary/5 hover:border-primary/20 transition-all cursor-pointer group"
                          >
                             <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center font-black text-[10px] text-slate-400 group-hover:bg-primary group-hover:text-white transition-all">
                                      {item.name.substring(0, 2).toUpperCase()}
                                   </div>
                                   <div>
                                      <p className="text-sm font-black text-slate-900">{item.name}</p>
                                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Click to see varieties</p>
                                   </div>
                                </div>
                                <div className="text-right">
                                   <p className="text-sm font-black text-slate-900">{volume.toFixed(2)} Qtl</p>
                                   <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">{formatCurrency(rate)} / Qtl</p>
                                </div>
                             </div>
                             <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className={cn("h-full transition-all duration-1000", modalType === 'IN' ? "bg-emerald-500" : "bg-blue-500")}
                                  style={{ width: `${percentage}%` }}
                                />
                             </div>
                          </div>
                        );
                      })
                    ) : (
                      // Subcategory View
                      data?.breakdown?.filter((item: any) => item.category === selectedCategory && (modalType === 'IN' ? item.inVolume > 0 : item.outVolume > 0)).map((item: any, idx: number) => {
                        const volume = modalType === 'IN' ? item.inVolume : item.outVolume;
                        const rate = modalType === 'IN' ? item.inAvgRate : item.outAvgRate;
                        const totalCatVolume = categorySummary.find((c: any) => c.name === selectedCategory)?.[modalType === 'IN' ? 'inVolume' : 'outVolume'] || 1;
                        const percentage = (volume / totalCatVolume) * 100;

                        return (
                          <div key={idx} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/30">
                             <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center font-black text-[10px] text-slate-400">
                                      {item.subcategory.substring(0, 2).toUpperCase()}
                                   </div>
                                   <div>
                                      <p className="text-sm font-black text-slate-900">{item.subcategory}</p>
                                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">{item.category} variety</p>
                                   </div>
                                </div>
                                <div className="text-right">
                                   <p className="text-sm font-black text-slate-900">{volume.toFixed(2)} Qtl</p>
                                   <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">{formatCurrency(rate)} / Qtl</p>
                                </div>
                             </div>
                             <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className={cn("h-full transition-all duration-1000", modalType === 'IN' ? "bg-emerald-500" : "bg-blue-500")}
                                  style={{ width: `${percentage}%` }}
                                />
                             </div>
                          </div>
                        );
                      })
                    )}
                 </div>
              </div>
              
              <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
                 <div className="text-left">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                        {modalType === 'EXPENSE' ? 'Total Period Expense' : 
                         modalType === 'PROFIT' ? 'Total Gross Profit' :
                         isSubView ? 'Category Total' : 'Grand Total Volume'}
                     </p>
                     <p className={cn(
                        "text-lg font-black",
                        modalType === 'PROFIT' && (data?.summary?.netProfit >= 0 ? "text-primary" : "text-red-600"),
                        modalType !== 'PROFIT' && "text-slate-900"
                     )}>
                        {modalType === 'EXPENSE' ? formatCurrency(data?.summary?.totalExpenses) :
                         modalType === 'PROFIT' ? formatCurrency(data?.summary?.grossProfit) :
                        isSubView 
                         ? (categorySummary.find((c: any) => c.name === selectedCategory)?.[modalType === 'IN' ? 'inVolume' : 'outVolume'] || 0).toFixed(2) + " Qtl"
                         : (modalType === 'IN' ? data?.summary?.totalInWeight : data?.summary?.totalOutWeight || 0).toFixed(2) + " Qtl"
                       }
                    </p>
                 </div>
                 <button 
                   onClick={() => setIsModalOpen(false)}
                   className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
                 >
                   Close
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

