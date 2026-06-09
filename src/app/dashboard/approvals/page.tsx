"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  Clock, 
  AlertCircle, 
  MoreVertical,
  Scale,
  User,
  Truck,
  IndianRupee,
  Search,
  Loader2,
  Menu,
  ArrowLeft
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/store/auth-store";
import { format } from "date-fns";

export default function ApprovalsPage() {
  const { user } = useAuthStore();
  const [slips, setSlips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlip, setSelectedSlip] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [processing, setProcessing] = useState(false);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  // Inline Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editNetWeight, setEditNetWeight] = useState("");
  const [editRate, setEditRate] = useState("");
  const [editName, setEditName] = useState("");
  const [editMobile, setEditMobile] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editVehicle, setEditVehicle] = useState("");
  const [editTollkata, setEditTollkata] = useState("");

  useEffect(() => {
    fetchPendingSlips();
  }, [user, searchTerm]);

  useEffect(() => {
    if (selectedSlip) {
      const weight = selectedSlip.type === 'WEIGHBRIDGE' ? selectedSlip.net_weight : selectedSlip.total_weight;
      const rate = selectedSlip.type === 'WEIGHBRIDGE' ? selectedSlip.rate_per_mt : selectedSlip.price_per_unit;
      
      setEditNetWeight(weight?.toString() || "0");
      setEditRate(rate?.toString() || "0");
      setEditName(selectedSlip.farmer_name || "");
      setEditMobile(selectedSlip.farmer_mobile || selectedSlip.party_mobile || "");
      setEditAddress(selectedSlip.farmer_village || selectedSlip.address || "");
      setEditVehicle(selectedSlip.vehicle_no || "");
      setEditTollkata(selectedSlip.tollkata_charges?.toString() || "0");
      setIsEditing(false);
    }
  }, [selectedSlip]);

  const fetchPendingSlips = async () => {
    try {
      setLoading(true);
      let wbUrl = `/api/slips?status=PENDING&limit=100000`;
      let ssUrl = `/api/small-scale?status=PENDING`;
      
      if (user?.branchId && user.role !== 'superadmin') {
        wbUrl += `&branchId=${user.branchId}`;
        ssUrl += `&branchId=${user.branchId}`;
      }
      
      const [wbRes, ssRes] = await Promise.all([
        fetch(wbUrl),
        fetch(ssUrl)
      ]);
      
      const wbData = await wbRes.json();
      const ssData = await ssRes.json();
      
      // Transform data to have consistent fields for the list
      const combined = [
        ...(wbData.data || []).filter((s: any) => s.scale_type !== 'Small Scale').map((s: any) => ({ ...s, type: 'WEIGHBRIDGE' })),
        ...ssData.map((s: any) => ({ 
          ...s, 
          type: 'SMALL_SCALE',
          farmer_name: s.party_name,
          net_weight: s.total_weight,
          payable_amount: s.total_amount,
          slip_no: `SS-${s.id.substring(0, 8).toUpperCase()}`
        }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      if (searchTerm) {
        const filtered = combined.filter(item => 
          item.slip_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.farmer_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setSlips(filtered);
      } else {
        setSlips(combined);
      }
      
      if (combined.length > 0) {
        const stillExists = selectedSlip && combined.find((s: any) => s.id === selectedSlip.id && s.type === selectedSlip.type);
        if (!stillExists) {
          setSelectedSlip(combined[0]);
        }
      } else {
        setSelectedSlip(null);
      }
    } catch (error) {
      console.error("Failed to fetch pending items:", error);
      toast.error("Failed to load approval queue");
    } finally {
      setLoading(false);
    }
  };

  const calculatedAmount = (Number(editNetWeight || 0) / 100) * Number(editRate || 0);

  const handleApprove = async (id: string) => {
    try {
      setProcessing(true);
      const payload: any = { status: 'APPROVED' };
      
      if (isEditing) {
        if (selectedSlip.type === 'WEIGHBRIDGE') {
          payload.net_weight = parseFloat(editNetWeight);
          payload.rate_per_mt = parseFloat(editRate);
          payload.payable_amount = calculatedAmount;
          payload.tollkata_charges = parseFloat(editTollkata) || 0;
          payload.farmer_name = editName;
          payload.farmer_mobile = editMobile;
          payload.address = editAddress;
          payload.vehicle_no = editVehicle;
        } else {
          payload.total_weight = parseFloat(editNetWeight);
          payload.price_per_unit = parseFloat(editRate);
          payload.total_amount = calculatedAmount;
          payload.party_name = editName;
          payload.party_mobile = editMobile;
          payload.address = editAddress;
        }
      }

      const url = selectedSlip.type === 'WEIGHBRIDGE' 
        ? `/api/slips/${id}` 
        : `/api/small-scale/${id}`;

      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Approval failed");

      toast.success(`${selectedSlip.type === 'WEIGHBRIDGE' ? 'Slip' : 'Entry'} ${selectedSlip.slip_no} approved.`);
      setIsEditing(false);
      setShowMobileDetail(false);
      fetchPendingSlips();
    } catch (error) {
      toast.error("Failed to approve item");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason) {
      toast.error("Please provide a reason for rejection.");
      return;
    }
    
    try {
      setProcessing(true);
      const url = selectedSlip.type === 'WEIGHBRIDGE' 
        ? `/api/slips/${selectedSlip.id}` 
        : `/api/small-scale/${selectedSlip.id}`;

      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'REJECTED',
          rejectReason 
        })
      });

      if (!response.ok) throw new Error("Rejection failed");

      toast.error(`${selectedSlip.type === 'WEIGHBRIDGE' ? 'Slip' : 'Entry'} ${selectedSlip.slip_no} rejected.`);
      setShowRejectModal(false);
      setRejectReason("");
      setShowMobileDetail(false);
      fetchPendingSlips();
    } catch (error) {
      toast.error("Failed to reject item");
    } finally {
      setProcessing(false);
    }
  };

  if (loading && slips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse font-medium">Loading approval queue...</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-outfit text-slate-900 uppercase">Approval Workflow</h1>
          <p className="text-sm text-muted-foreground mt-1">Review and authorize pending slips and procurement entries.</p>
        </div>
        <div className="inline-flex items-center self-start gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-2xl text-[10px] font-black text-amber-700 uppercase tracking-widest">
           <Clock className="w-3.5 h-3.5" />
           {slips.length} Pending
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
        {/* Queue List */}
        <div className={cn(
          "xl:col-span-1 space-y-4",
          showMobileDetail ? "hidden xl:block" : "block"
        )}>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Search queue..." 
              className="w-full pl-11 pr-4 py-3 bg-card border border-border rounded-2xl text-sm font-medium focus:ring-4 focus:ring-primary/10 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="space-y-4 overflow-y-auto xl:max-h-[75vh] pr-1.5 -mr-1.5 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
            {slips.length > 0 ? (
              slips.map((item) => (
                <div 
                  key={`${item.type}-${item.id}`}
                  onClick={() => {
                    setSelectedSlip(item);
                    setShowMobileDetail(true);
                  }}
                  className={cn(
                    "p-5 rounded-2xl border transition-all cursor-pointer group active:scale-[0.98]",
                    selectedSlip?.id === item.id && selectedSlip?.type === item.type
                      ? "bg-primary/5 border-primary shadow-lg shadow-primary/5" 
                      : "bg-card border-border hover:border-primary/50 hover:shadow-md"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-primary uppercase tracking-widest">{item.slip_no}</span>
                      <span className={cn(
                        "text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter",
                        item.type === 'WEIGHBRIDGE' ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                      )}>
                        {item.type === 'WEIGHBRIDGE' ? 'WB' : 'SS'}
                      </span>
                      <span className={cn(
                        "text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter",
                        item.entry_type === 'OUT' ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                      )}>
                        {item.entry_type === 'OUT' ? 'OUTWARD' : 'INWARD'}
                      </span>
                    </div>
                    <span className="text-[10px] font-black text-muted-foreground uppercase">
                      {format(new Date(item.created_at), "h:mm a")}
                    </span>
                  </div>
                  <h3 className="font-black text-slate-900 text-sm">{item.farmer_name}</h3>
                  <div className="flex items-center justify-between mt-3">
                    <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-70">
                      {item.grain_category} • {Number(item.net_weight).toFixed(2)} kg ({(Number(item.net_weight) / 100).toFixed(2)} Qtl)
                    </div>
                    <div className="text-sm font-black text-slate-700 tracking-tighter">{formatCurrency(parseFloat(item.payable_amount) + (item.type === 'WEIGHBRIDGE' ? (parseFloat(item.tollkata_charges) || 0) : 0))}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center border-2 border-dashed border-border rounded-3xl bg-muted/20">
                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest opacity-50">Empty Queue</p>
              </div>
            )}
          </div>
        </div>

        {/* Detailed View */}
        <div className={cn(
          "xl:col-span-2",
          !showMobileDetail ? "hidden xl:block" : "block"
        )}>
          {selectedSlip ? (
            <Card className="border-primary/10 shadow-2xl overflow-hidden h-full max-h-[85vh] xl:max-h-[75vh] flex flex-col rounded-3xl bg-white">
              <CardHeader className="bg-muted/30 border-b border-border/50 p-6 sm:p-8 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setShowMobileDetail(false)}
                      className="xl:hidden p-2.5 hover:bg-muted rounded-xl transition-colors border border-border bg-white shadow-sm active:scale-95"
                    >
                      <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-white border border-border items-center justify-center shadow-sm shrink-0">
                      <Scale className={cn("w-6 h-6", selectedSlip.type === 'WEIGHBRIDGE' ? "text-primary" : "text-purple-600")} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl font-black text-slate-900 font-outfit uppercase tracking-tight">{selectedSlip.slip_no}</CardTitle>
                        <span className={cn(
                          "text-[10px] px-2 py-0.5 rounded-lg font-black uppercase tracking-widest",
                          selectedSlip.type === 'WEIGHBRIDGE' ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                        )}>
                          {selectedSlip.type === 'WEIGHBRIDGE' ? 'Weighbridge' : 'Small Scale'}
                        </span>
                        <span className={cn(
                          "text-[10px] px-2 py-0.5 rounded-lg font-black uppercase tracking-widest",
                          selectedSlip.entry_type === 'OUT' ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                        )}>
                          {selectedSlip.entry_type === 'OUT' ? 'OUTWARD' : 'INWARD'}
                        </span>
                      </div>
                      <CardDescription className="text-xs font-bold uppercase tracking-widest mt-1 opacity-70">Reviewing Record</CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setEditNetWeight(selectedSlip.net_weight?.toString() || "0");
                        setEditRate((selectedSlip.type === 'WEIGHBRIDGE' ? selectedSlip.rate_per_mt : selectedSlip.price_per_unit)?.toString() || "0");
                        setEditName(selectedSlip.farmer_name || "");
                        setEditMobile(selectedSlip.farmer_mobile || selectedSlip.party_mobile || "");
                        setEditAddress(selectedSlip.farmer_village || selectedSlip.address || "");
                        setEditVehicle(selectedSlip.vehicle_no || "");
                        setEditTollkata(selectedSlip.tollkata_charges?.toString() || "0");
                        setIsEditing(!isEditing);
                      }}
                      className={cn(
                        "p-2.5 rounded-xl transition-all border shadow-sm",
                        isEditing ? "bg-primary text-white border-primary" : "bg-white hover:bg-muted border-border"
                      )}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 sm:p-8 flex-1 space-y-8 overflow-y-auto scrollbar-thin scrollbar-thumb-primary/10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <User className="w-3 h-3" /> {selectedSlip.type === 'WEIGHBRIDGE' ? 'Farmer' : 'Party'} Info
                      </h4>
                      <div className="bg-muted/30 p-5 rounded-2xl border border-border/50 space-y-2 shadow-inner">
                        {isEditing ? (
                          <div className="space-y-2">
                            <div>
                              <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Name</label>
                              <input 
                                type="text" 
                                value={editName} 
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full px-3 py-1.5 bg-white border border-border rounded-lg text-xs font-bold outline-none focus:border-primary" 
                              />
                            </div>
                            <div>
                              <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Mobile</label>
                              <input 
                                type="text" 
                                value={editMobile} 
                                onChange={(e) => setEditMobile(e.target.value)}
                                className="w-full px-3 py-1.5 bg-white border border-border rounded-lg text-xs font-bold outline-none focus:border-primary" 
                              />
                            </div>
                            <div>
                              <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Address</label>
                              <input 
                                type="text" 
                                value={editAddress} 
                                onChange={(e) => setEditAddress(e.target.value)}
                                className="w-full px-3 py-1.5 bg-white border border-border rounded-lg text-xs font-bold outline-none focus:border-primary" 
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="font-black text-slate-900">{selectedSlip.farmer_name}</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Mob: {selectedSlip.farmer_mobile || selectedSlip.party_mobile || 'N/A'}</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Village/Address: {selectedSlip.farmer_village || selectedSlip.address || 'N/A'}</p>
                            {selectedSlip.type === 'SMALL_SCALE' && selectedSlip.party_email && (
                               <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Email: {selectedSlip.party_email}</p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Truck className="w-3 h-3" /> Logistics & Quality
                      </h4>
                      <div className="bg-muted/30 p-5 rounded-2xl border border-border/50 space-y-1.5 shadow-inner">
                        {selectedSlip.type === 'WEIGHBRIDGE' ? (
                          isEditing ? (
                            <div>
                              <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Vehicle No</label>
                              <input 
                                type="text" 
                                value={editVehicle} 
                                onChange={(e) => setEditVehicle(e.target.value)}
                                className="w-full px-3 py-1.5 bg-white border border-border rounded-lg text-xs font-bold outline-none focus:border-primary uppercase" 
                              />
                            </div>
                          ) : (
                            <>
                              <p className="font-black text-slate-900">{selectedSlip.vehicle_no}</p>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Driver: {selectedSlip.driver_name || 'N/A'}</p>
                            </>
                          )
                        ) : (
                          <>
                            <p className="font-black text-slate-900">Total Bags: {selectedSlip.total_bags}</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Storage: {selectedSlip.storage_location || 'N/A'}</p>
                            <div className="flex gap-4 mt-2">
                              <div>
                                <p className="text-[8px] font-black text-muted-foreground uppercase opacity-50">Moisture</p>
                                <p className="text-xs font-black text-slate-700">{selectedSlip.moisture || '0'}%</p>
                              </div>
                              <div>
                                <p className="text-[8px] font-black text-muted-foreground uppercase opacity-50">Foreign Matter</p>
                                <p className="text-xs font-black text-slate-700">{selectedSlip.foreign_matter || '0'}%</p>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <IndianRupee className="w-3 h-3" /> Payment Summary
                      </h4>
                      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group border border-white/5">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/40 transition-all duration-700" />
                        <div className="space-y-5 relative z-10">
                          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] opacity-50">
                            <span>Calculation Detail</span>
                          </div>
                          <div className="flex justify-between items-center">
                            {isEditing ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <input 
                                  type="number" 
                                  value={editNetWeight}
                                  onChange={(e) => setEditNetWeight(e.target.value)}
                                  className="w-20 bg-white/10 border border-white/20 rounded-lg px-2 py-1 outline-none focus:border-primary text-sm font-black"
                                />
                                <span className="text-[10px] font-black opacity-50">
                                  kg ({(Number(editNetWeight || 0) / 100).toFixed(2)} Qtl) × ₹
                                </span>
                                <input 
                                  type="number" 
                                  value={editRate}
                                  onChange={(e) => setEditRate(e.target.value)}
                                  className="w-24 bg-white/10 border border-white/20 rounded-lg px-2 py-1 outline-none focus:border-primary text-sm font-black"
                                />
                              </div>
                            ) : (
                              <span className="text-xs font-black tracking-tight">
                                {Number(selectedSlip.net_weight).toFixed(2)} kg ({(Number(selectedSlip.net_weight) / 100).toFixed(2)} Qtl) × ₹{selectedSlip.type === 'WEIGHBRIDGE' ? selectedSlip.rate_per_mt : selectedSlip.price_per_unit}
                              </span>
                            )}
                          </div>
                          {selectedSlip.type === 'WEIGHBRIDGE' && (isEditing ? true : (parseFloat(selectedSlip.tollkata_charges) || 0) > 0) && (
                            <div className="flex justify-between items-center mt-2">
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Vehicle Charges</span>
                              {isEditing ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] font-black opacity-50">+ ₹</span>
                                  <input 
                                    type="number" 
                                    value={editTollkata}
                                    onChange={(e) => setEditTollkata(e.target.value)}
                                    className="w-20 bg-white/10 border border-white/20 rounded-lg px-2 py-1 outline-none focus:border-primary text-sm font-black text-amber-500"
                                  />
                                </div>
                              ) : (
                                <span className="text-xs font-black tracking-tight text-amber-500">+{formatCurrency(parseFloat(selectedSlip.tollkata_charges))}</span>
                              )}
                            </div>
                          )}
                          <hr className="border-white/10" />
                          <div className="flex justify-between items-end">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Payable</span>
                            <span className="text-3xl sm:text-4xl font-black text-primary tracking-tighter">
                              {formatCurrency((isEditing ? calculatedAmount : parseFloat(selectedSlip.payable_amount)) + (selectedSlip.type === 'WEIGHBRIDGE' ? (isEditing ? (parseFloat(editTollkata) || 0) : (parseFloat(selectedSlip.tollkata_charges) || 0)) : 0))}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-4 shadow-sm">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800 leading-relaxed font-bold uppercase tracking-tight">
                        Daily MSP Verified for {selectedSlip.grain_category}. Quality Check Passed.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-8 border-t border-border/50 flex flex-col sm:flex-row items-center gap-4 mt-auto">
                  <div className="flex w-full gap-3">
                    <button 
                      disabled={processing}
                      onClick={() => setShowRejectModal(true)}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-4 border border-destructive text-destructive rounded-2xl font-black hover:bg-destructive/5 disabled:opacity-50 transition-all uppercase tracking-widest text-[10px]"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                    <button 
                      disabled={processing}
                      onClick={() => setIsEditing(!isEditing)}
                      className={cn(
                        "flex-1 inline-flex items-center justify-center gap-2 px-4 py-4 border rounded-2xl font-black transition-all uppercase tracking-widest text-[10px]",
                        isEditing 
                          ? "bg-amber-100 border-amber-300 text-amber-700" 
                          : "bg-white border-border text-slate-600 hover:bg-muted"
                      )}
                    >
                      <Edit3 className="w-4 h-4" /> {isEditing ? "Editing" : "Modify"}
                    </button>
                  </div>
                  <button 
                    disabled={processing}
                    onClick={() => handleApprove(selectedSlip.id)}
                    className="w-full sm:flex-[2] inline-flex items-center justify-center gap-3 px-6 py-5 bg-primary text-primary-foreground rounded-[1.5rem] font-black hover:opacity-95 disabled:opacity-50 transition-all shadow-xl shadow-primary/30 uppercase tracking-[0.2em] text-[11px]"
                  >
                    {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                    {isEditing ? "Apply & Approve" : "Authorize Payment"}
                  </button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-border rounded-[3rem] bg-muted/10 opacity-60">
               <div className="w-24 h-24 bg-card rounded-full flex items-center justify-center mb-8 shadow-inner">
                  <Clock className="w-10 h-10 text-muted-foreground opacity-30" />
               </div>
               <h3 className="text-xl font-black text-slate-900 font-outfit uppercase tracking-widest">Queue Empty</h3>
               <p className="text-xs font-bold text-muted-foreground max-w-xs mx-auto mt-4 uppercase tracking-tighter opacity-70 leading-relaxed">System clear. There are no records currently awaiting verification.</p>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal Backdrop */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-[0_0_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-border bg-slate-50">
              <h3 className="text-xl font-black text-slate-900 font-outfit uppercase tracking-tight">Security Protocol</h3>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-2 opacity-70">Mandatory Rejection Log</p>
            </div>
            <div className="p-8 space-y-6">
              <textarea 
                rows={4}
                className="w-full p-5 bg-muted/30 border border-border rounded-2xl focus:ring-4 focus:ring-destructive/10 outline-none text-sm font-medium resize-none shadow-inner"
                placeholder="Specify the exact reason for refusal..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <div className="flex gap-4">
                <button 
                  disabled={processing}
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 py-4 text-[10px] font-black text-muted-foreground hover:text-slate-900 transition-all uppercase tracking-[0.2em]"
                >
                  Abort
                </button>
                <button 
                  disabled={processing}
                  onClick={handleReject}
                  className="flex-1 bg-destructive text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:opacity-95 shadow-2xl shadow-destructive/30 disabled:opacity-50"
                >
                  {processing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Confirm Reject"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


