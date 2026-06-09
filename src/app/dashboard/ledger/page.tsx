"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/store/auth-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { BookOpen, IndianRupee, ArrowDownLeft, ArrowUpRight, Search, Filter, Download, Plus, Calendar } from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import AddExpenseModal from "./components/AddExpenseModal";
import * as XLSX from "xlsx";
import { toast } from "sonner";

export default function LedgerPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState("FARMER");
  const [entries, setEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  const [filters, setFilters] = useState({
    startDate: new Date().toISOString().split('T')[0], // Today
    endDate: new Date().toISOString().split('T')[0],   // Today
    source: 'ALL'
  });

  const ledgerTabs = [
    { id: "FARMER", label: "Farmer Ledger" },
    { id: "INTERNAL", label: "Internal Ledger" },
    // { id: "CUSTOMER", label: "Customer Ledger" },
    { id: "EXPENSE", label: "Expense Ledger" },
  ];

  const fetchLedger = async () => {
    if (!user?.branchId) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        branchId: user.branchId,
        type: activeTab,
        startDate: filters.startDate,
        endDate: filters.endDate,
        source: filters.source
      });
      const res = await fetch(`/api/ledgers?${params.toString()}`);
      const data = await res.json();
      if (!data.error) {
        setEntries(data);
      }
    } catch (error) {
      console.error("Failed to fetch ledger:", error);
      toast.error("Failed to load ledger entries.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [user, activeTab, filters]);

  const exportToExcel = () => {
    try {
      const dataToExport = entries.map(e => ({
        Date: formatDate(e.created_at),
        Narration: e.narration,
        Debit: parseFloat(e.debit || 0),
        Credit: parseFloat(e.credit || 0),
        Balance: parseFloat(e.balance || 0)
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Ledger");
      XLSX.writeFile(wb, `${activeTab}_${filters.source}_Ledger_${filters.startDate}_to_${filters.endDate}.xlsx`);
      toast.success("Statement exported successfully.");
    } catch (error) {
      toast.error("Failed to export excel.");
    }
  };

  const currentBalance = entries[0]?.balance || 0;

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-outfit">Financial Ledgers</h1>
          <p className="text-muted-foreground">Track purchases, payments, and outstanding balances.</p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === "EXPENSE" && (
            <button 
              onClick={() => setShowExpenseModal(true)}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10"
            >
              <Plus className="w-4 h-4" />
              Add Expense
            </button>
          )}
        {user?.role !== 'staff' && (
          <button 
            onClick={exportToExcel}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:opacity-90 transition-all shadow-lg"
          >
            <Download className="w-4 h-4" />
            Export Statements
          </button>
        )}
        </div>
      </div>

      {/* Date Filters Row */}
      <Card className="border-none shadow-sm bg-slate-50/50 mt-6">
        <CardContent className="p-4">
           <div className="flex flex-col md:flex-row items-stretch md:items-end gap-4">
              <div className="space-y-1.5 flex-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Calendar className="w-3 h-3" /> From Date
                 </label>
                 <input 
                   type="date" 
                   className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20"
                   value={filters.startDate}
                   onChange={e => setFilters({...filters, startDate: e.target.value})}
                 />
              </div>
              <div className="space-y-1.5 flex-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Calendar className="w-3 h-3" /> To Date
                 </label>
                 <input 
                   type="date" 
                   className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20"
                   value={filters.endDate}
                   min={filters.startDate}
                   onChange={e => setFilters({...filters, endDate: e.target.value})}
                 />
              </div>
              <div className="space-y-1.5 flex-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Filter className="w-3 h-3" /> Source
                 </label>
                 <select 
                   className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                   value={filters.source}
                   onChange={e => setFilters({...filters, source: e.target.value})}
                 >
                    <option value="ALL">All Sources</option>
                    <option value="WEIGHBRIDGE">Weighbridge Only</option>
                    <option value="SMALL_SCALE">Small Scale Only</option>
                  </select>
              </div>
              <div className="flex-none w-full md:w-auto flex items-center gap-2">
                 <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
                    <button 
                      onClick={() => setFilters({ ...filters, startDate: '', endDate: '' })}
                      className={cn(
                        "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        filters.startDate === '' && filters.endDate === ''
                          ? "bg-primary text-white shadow-md"
                          : "text-slate-600 hover:bg-slate-50"
                      )}
                    >
                       Overall
                    </button>
                    <button 
                      onClick={() => setFilters({ ...filters, startDate: new Date().toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0] })}
                      className={cn(
                        "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        filters.startDate !== '' || filters.endDate !== ''
                          ? "bg-slate-900 text-white shadow-md"
                          : "text-slate-600 hover:bg-slate-50"
                      )}
                    >
                       Period
                    </button>
                 </div>
                 <button 
                   onClick={fetchLedger}
                   className="px-6 py-2.5 bg-slate-100 text-slate-600 hover:text-slate-900 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                 >
                    Sync
                 </button>
              </div>
           </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-8">
        <div className="lg:col-span-1 grid grid-cols-2 lg:flex lg:flex-col gap-3 w-full lg:w-auto">
           {ledgerTabs.map((tab) => (
             <div 
               key={tab.id} 
               onClick={() => setActiveTab(tab.id)}
               className={cn(
                "p-3 lg:p-4 rounded-xl border transition-all cursor-pointer",
                tab.id === 'all' ? "col-span-2 lg:col-span-1" : "col-span-1",
                activeTab === tab.id ? "bg-primary/5 border-primary shadow-sm" : "bg-card border-border hover:border-primary/30"
              )}
             >
                <div className="flex items-center justify-between gap-2">
                   <span className="font-bold text-xs lg:text-sm whitespace-nowrap">{tab.label}</span>
                   <BookOpen className={cn("w-4 h-4 shrink-0", activeTab === tab.id ? "text-primary" : "text-muted-foreground")} />
                </div>
             </div>
           ))}
        </div>

        <div className="lg:col-span-3 space-y-6">
           <Card className="border-none shadow-sm">
               <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-6">
                  <div>
                     <CardTitle>{ledgerTabs.find(t => t.id === activeTab)?.label}</CardTitle>
                     <CardDescription>Statement for the current period</CardDescription>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                     <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Current Balance</p>
                        <p className="text-xl font-black text-primary">{formatCurrency(currentBalance)}</p>
                     </div>
                  </div>
               </CardHeader>
              <CardContent className="p-0 overflow-x-auto scrollbar-thin">
                 <table className="w-full text-sm min-w-[800px]">
                    <thead>
                       <tr className="bg-muted/30 text-muted-foreground uppercase text-[10px] font-black tracking-widest border-b border-border">
                          <th className="text-left py-4 px-6">Date</th>
                          <th className="text-left py-4 px-6">Narration</th>
                          <th className="text-left py-4 px-6">Debit (Out)</th>
                          <th className="text-left py-4 px-6">Credit (In)</th>
                          <th className="text-right py-4 px-6">Balance</th>
                       </tr>
                    </thead>
                     <tbody className="divide-y divide-border/50">
                        {isLoading ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-muted-foreground italic">Loading entries...</td>
                          </tr>
                        ) : entries.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-muted-foreground italic">No transactions found for this ledger.</td>
                          </tr>
                        ) : (
                          entries.map((entry: any) => (
                            <tr key={entry.id} className="hover:bg-muted/10 transition-colors">
                               <td className="py-4 px-6 text-xs font-medium">{formatDate(entry.created_at)}</td>
                               <td className="py-4 px-6">
                                  <p className="font-bold">{entry.narration}</p>
                                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">ID: {entry.id.substring(0, 8)}</p>
                               </td>
                               <td className="py-4 px-6 font-mono text-red-600 font-bold">
                                 {parseFloat(entry.debit) > 0 ? `- ${formatCurrency(entry.debit)}` : '₹0.00'}
                               </td>
                               <td className="py-4 px-6 font-mono text-green-600 font-bold">
                                 {parseFloat(entry.credit) > 0 ? `+ ${formatCurrency(entry.credit)}` : '₹0.00'}
                               </td>
                               <td className="py-4 px-6 text-right font-mono font-black">
                                 {formatCurrency(entry.balance)}
                               </td>
                            </tr>
                          ))
                        )}
                     </tbody>
                 </table>
              </CardContent>
           </Card>
        </div>
      </div>
      
      {showExpenseModal && (
        <AddExpenseModal 
          onClose={() => setShowExpenseModal(false)}
          onSuccess={fetchLedger}
        />
      )}
    </>
  );
}

