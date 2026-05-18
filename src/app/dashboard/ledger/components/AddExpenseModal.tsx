"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2, IndianRupee, FileText, User, Settings, Zap } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/store/auth-store";
import { cn } from "@/lib/utils";

interface AddExpenseModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const EXPENSE_CATEGORIES = [
  { id: "SALARY", label: "Staff Salary", icon: User },
  { id: "RENT", label: "Rent Payment", icon: Settings },
  { id: "ELECTRICITY", label: "Electricity Bill", icon: Zap },
  { id: "MAINTENANCE", label: "Maintenance", icon: Settings },
  { id: "TRANSPORT", label: "Transport", icon: FileText },
  { id: "OTHER", label: "Other Expense", icon: FileText },
];

export default function AddExpenseModal({ onClose, onSuccess }: AddExpenseModalProps) {
  const { user } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    category: "SALARY",
    staffId: "",
    amount: "",
    narration: "",
    entryType: "DEBIT" // Expenses are typically debits (spending)
  });

  useEffect(() => {
    const fetchStaff = async () => {
      if (!user?.branchId) return;
      try {
        const res = await fetch(`/api/staff?branchId=${user.branchId}`);
        const data = await res.json();
        setStaffList(data);
      } catch (e) {
        console.error("Failed to fetch staff");
      }
    };
    fetchStaff();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.narration) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      let finalNarration = formData.narration;
      if (formData.category === "SALARY" && formData.staffId) {
        const staff = staffList.find(s => s.id === formData.staffId);
        if (staff) {
          finalNarration = `Salary Payment - ${staff.name} (${formData.narration})`;
        }
      }

      const res = await fetch("/api/ledgers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: user?.branchId,
          type: "EXPENSE",
          narration: finalNarration,
          amount: formData.amount,
          relatedId: formData.staffId || null,
          entryType: formData.entryType
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      toast.success("Expense recorded successfully!");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error("Failed to record expense: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
        {/* Sticky Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
              <IndianRupee className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 font-outfit uppercase leading-tight">Record Expense</h3>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-0.5">Manual Ledger Entry</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-900"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto scrollbar-none">
          <form id="expense-form" onSubmit={handleSubmit} className="p-8 space-y-8">
            <div className="space-y-6">
              {/* Category Grid */}
              <div className="space-y-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Expense Category</label>
                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                   {EXPENSE_CATEGORIES.map((cat) => {
                     const Icon = cat.icon;
                     const isActive = formData.category === cat.id;
                     return (
                       <button
                         key={cat.id}
                         type="button"
                         onClick={() => setFormData({ ...formData, category: cat.id })}
                         className={cn(
                           "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-300 group",
                           isActive
                             ? "bg-primary text-white border-primary shadow-xl shadow-primary/20 scale-[1.02]"
                             : "bg-white border-slate-100 hover:border-primary/30 text-slate-600 hover:bg-slate-50"
                         )}
                       >
                         <Icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-400 group-hover:text-primary")} />
                         <span className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap">{cat.label}</span>
                       </button>
                     );
                   })}
                 </div>
              </div>

              {formData.category === "SALARY" && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Staff Member</label>
                  <div className="relative">
                     <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                     <select
                       required
                       className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all appearance-none"
                       value={formData.staffId}
                       onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
                     >
                       <option value="">Choose Employee...</option>
                       {staffList.map((s) => (
                         <option key={s.id} value={s.id}>{s.name} — {s.email}</option>
                       ))}
                     </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount (₹)</label>
                   <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">₹</span>
                      <input
                        type="number"
                        required
                        placeholder="0.00"
                        className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      />
                   </div>
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Entry Type</label>
                   <select
                     className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                     value={formData.entryType}
                     onChange={(e) => setFormData({ ...formData, entryType: e.target.value })}
                   >
                     <option value="DEBIT">Debit (Spending)</option>
                     <option value="CREDIT">Credit (Refund/Adj)</option>
                   </select>
                 </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Narration / Remarks</label>
                <textarea
                  required
                  placeholder="Describe the expense details here..."
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all min-h-[120px] resize-none"
                  value={formData.narration}
                  onChange={(e) => setFormData({ ...formData, narration: e.target.value })}
                />
              </div>
            </div>
          </form>
        </div>

        {/* Sticky Footer */}
        <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center gap-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 transition-colors"
          >
            Cancel
          </button>
          <button
            form="expense-form"
            type="submit"
            disabled={submitting}
            className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-slate-800 shadow-2xl shadow-slate-900/20 disabled:opacity-50 flex items-center justify-center gap-3 transition-all"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Transaction"}
          </button>
        </div>
      </div>
    </div>

  );
}
