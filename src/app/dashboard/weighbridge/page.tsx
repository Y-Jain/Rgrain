"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuthStore } from "@/lib/store/auth-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { 
  Scale, 
  User, 
  Truck, 
  Search, 
  Plus, 
  Printer, 
  Share2, 
  CheckCircle2, 
  ChevronRight,
  Info,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  History,
  Box,
  Settings,
  Download,
  Filter,
  FileSpreadsheet,
  FileText,
  Calendar,
  MoreVertical,
  Eye,
  Edit,
  Trash2
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import SlipModal from "@/components/weighbridge/SlipModal";
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function WeighbridgePage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'form' | 'history_in' | 'history_out' | 'settings'>('form');
  const [step, setStep] = useState(1);
  const [slips, setSlips] = useState<any[]>([]);
  const [availableRates, setAvailableRates] = useState<any[]>([]);
  const [vehicleRates, setVehicleRates] = useState<any[]>([]);
  const [weighbridgeSettings, setWeighbridgeSettings] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    id: "",
    scaleType: "",
    farmer_name: "",
    farmer_mobile: "",
    address: "",
    vehicle_no: "",
    net_weight: "",
    rate_per_mt: ""
  });
  
  // Filters
  const [filters, setFilters] = useState({
    search: "",
    dateFrom: "",
    dateTo: "",
    category: "",
    subcategory: "",
    status: "",
    type: "ALL",
    scaleSource: "ALL"
  });

  const [entryType, setEntryType] = useState<'IN' | 'OUT'>('IN');
  const [availableStock, setAvailableStock] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [globalTotals, setGlobalTotals] = useState({ totalWeight: 0, totalAmount: 0, totalCharges: 0 });
  
  const [formData, setFormData] = useState({
    farmerName: "",
    farmerMobile: "",
    address: "",
    serialNumber: ""
  });

  const [trollies, setTrollies] = useState([{
    id: "1",
    vehicleNumber: "",
    driverName: "",
    grainType: "",
    subcategory: "",
    vehicleType: "",
    grossWeight: "",
    tareWeight: "",
    netWeight: 0,
    rate: 0,
    totalAmount: 0,
    tollkataCharges: 0,
    isInternal: true
  }]);

  const fetchRates = async () => {
    if (!user?.branchId) return;
    try {
      const res = await fetch(`/api/rates?branchId=${user.branchId}`);
      const data = await res.json();
      setAvailableRates(data);
    } catch (error) {
      console.error("Failed to fetch rates:", error);
    }
  };

  const fetchVehicleRates = async () => {
    if (!user?.branchId) return;
    try {
      const res = await fetch(`/api/weighbridge/vehicle-rates?branchId=${user.branchId}`);
      const data = await res.json();
      setVehicleRates(data);
    } catch (error) {
      console.error("Failed to fetch vehicle rates:", error);
    }
  };

  const fetchSettings = async () => {
    if (!user?.branchId) return;
    try {
      const res = await fetch(`/api/weighbridge/settings?branchId=${user.branchId}`);
      const data = await res.json();
      setWeighbridgeSettings(data);
      // Set the next serial number in form
      const nextSerial = (data.current_serial_number || 0) + 1;
      const serialToShow = nextSerial < data.starting_serial_number ? data.starting_serial_number : nextSerial;
      setFormData(prev => ({ ...prev, serialNumber: serialToShow.toString() }));
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    }
  };

  // Debounce search term to prevent excessive API/DB calls
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(filters.search);
      setCurrentPage(1); // Reset to page 1 on new search
    }, 400);

    return () => {
      clearTimeout(handler);
    };
  }, [filters.search]);

  const fetchSlips = async () => {
    if (!user) return [];
    try {
      const params = new URLSearchParams();
      if (user.branchId) params.append('branchId', user.branchId);
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (filters.status) params.append('status', filters.status);
      if (filters.category) params.append('category', filters.category);
      if (filters.subcategory) params.append('subcategory', filters.subcategory);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.scaleSource) {
        let sourceParam = filters.scaleSource;
        if (sourceParam === 'Weighbridge') sourceParam = 'WEIGHBRIDGE';
        if (sourceParam === 'Small Scale') sourceParam = 'SMALL_SCALE';
        params.append('scaleSource', sourceParam);
      }
      
      const transType = activeTab === 'history_in' ? 'IN' : activeTab === 'history_out' ? 'OUT' : 'ALL';
      if (transType && transType !== 'ALL') params.append('type', transType);

      if (filters.type && filters.type !== 'ALL') {
        params.append('entryMode', filters.type);
      }

      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());

      const res = await fetch(`/api/slips?${params.toString()}`);
      const data = await res.json();
      if (!data.error) {
        setSlips(data.data || []);
        setTotalCount(data.totalCount || 0);
        setTotalPages(data.totalPages || 1);
        setGlobalTotals(data.totals || { totalWeight: 0, totalAmount: 0, totalCharges: 0 });
        return data.data;
      }
    } catch (error) {
      console.error("Failed to fetch slips:", error);
    }
    return [];
  };

  useEffect(() => {
    if (user) {
      if (user.role === 'staff') {
        setActiveTab('history_in');
      }
      fetchRates();
      fetchVehicleRates();
      fetchSettings();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchSlips();
    }
  }, [
    user,
    currentPage,
    debouncedSearch,
    filters.status,
    filters.category,
    filters.subcategory,
    filters.dateFrom,
    filters.dateTo,
    filters.scaleSource,
    filters.type,
    activeTab
  ]);

  const getSubcategories = (grainType: string) => {
    const category = availableRates.find(r => r.category_name === grainType);
    return category?.subcategories || [];
  };

  const handleTrollyChange = (index: number, field: string, value: any) => {
    const newTrollies = [...trollies];
    newTrollies[index] = { ...newTrollies[index], [field]: value };
    setTrollies(newTrollies);
  };

  const handleNetWeightChange = (index: number, value: string) => {
    const netQuintal = parseFloat(value) || 0;
    const netKg = netQuintal * 100;
    const newTrollies = [...trollies];
    newTrollies[index] = {
      ...newTrollies[index],
      netWeight: netKg,
      grossWeight: netKg.toString(),
      tareWeight: "0",
      totalAmount: netQuintal * (parseFloat(newTrollies[index].rate as any) || 0)
    };
    setTrollies(newTrollies);
  };

  const handleRateChange = (index: number, val: string) => {
    const net = trollies[index].netWeight;
    const rateVal = parseFloat(val) || 0;
    const total = (net / 100) * rateVal;
    
    const newTrollies = [...trollies];
    newTrollies[index] = {
      ...newTrollies[index],
      rate: val as any,
      totalAmount: total,
      isInternal: true
    };
    setTrollies(newTrollies);
  };

  const handleGrainChange = (index: number, categoryId: string) => {
    const category = availableRates.find(c => c.id === categoryId);
    if (category) {
      const newTrollies = [...trollies];
      const net = newTrollies[index].netWeight;
      const rate = entryType === 'IN' ? category.procurement_rate : category.selling_rate;
      newTrollies[index] = {
        ...newTrollies[index],
        grainType: category.category_name,
        subcategory: "", // Reset subcategory
        rate: rate,
        totalAmount: (net / 100) * rate
      };
      setTrollies(newTrollies);
    }
  };

  const handleVehicleTypeChange = (index: number, type: string) => {
    const rateObj = vehicleRates.find(r => r.vehicle_type === type);
    const newTrollies = [...trollies];
    newTrollies[index] = {
      ...newTrollies[index],
      vehicleType: type,
      tollkataCharges: rateObj ? (parseFloat(rateObj.rate as any) || 0) : 0
    };
    setTrollies(newTrollies);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.farmerMobile.trim()) {
      const rawMobile = formData.farmerMobile.trim();
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

    if (trollies.length === 0) {
      toast.error("Please add at least one trolly.");
      return;
    }

    for (let i = 0; i < trollies.length; i++) {
      const trolly = trollies[i];
      if (!trolly.grainType || trolly.netWeight <= 0) {
        toast.error(`Please fill in Grain Type and Weight for Trolly #${i + 1}`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/slips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          trollies,
          entryType,
          branchId: user?.branchId,
          createdById: user?.id
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      toast.success("Slips generated successfully!");
      
      setSelectedSlip(data);
      setIsModalOpen(true);

      setStep(1);
      setFormData({
        farmerName: "",
        farmerMobile: "",
        address: "",
        serialNumber: ""
      });
      setTrollies([{
        id: Date.now().toString(),
        vehicleNumber: "",
        driverName: "",
        grainType: "",
        subcategory: "",
        vehicleType: "",
        grossWeight: "",
        tareWeight: "",
        netWeight: 0,
        rate: 0,
        totalAmount: 0,
        tollkataCharges: 0,
        isInternal: true
      }]);
      fetchSlips();
      fetchSettings(); // Update serial number
    } catch (error: any) {
      toast.error("Failed to generate slip: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusToggle = async (slip: any) => {
    if (user?.role === 'staff') return;
    const newStatus = slip.status === 'APPROVED' ? 'PENDING' : 'APPROVED';
    
    // Optimistic UI update
    setSlips(prev => prev.map(s => (s.id === slip.id && s.scale_type === slip.scale_type) ? { ...s, status: newStatus } : s));
    
    try {
      const res = await fetch(`/api/slips/${slip.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, scaleType: slip.scale_type })
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast.success(`Slip #${slip.serial_number} marked as ${newStatus}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to update status");
      fetchSlips(); // Revert on failure
    }
  };

  const filteredSlips = slips;
  const paginatedSlips = slips;

  const filterSubcategories = useMemo(() => {
    const category = availableRates.find(r => r.category_name === filters.category);
    return category?.subcategories || [];
  }, [filters.category, availableRates]);

  const totals = useMemo(() => {
    const totalWeight = globalTotals.totalWeight || 0;
    const totalAmount = globalTotals.totalAmount || 0;
    const totalCharges = globalTotals.totalCharges || 0;
    const totalQtl = totalWeight / 100;
    const avgRate = totalQtl > 0 ? totalAmount / totalQtl : 0;

    return { 
      totalWeight, 
      totalCharges, 
      avgRate, 
      overallRateIn: 0, 
      totalAmount 
    };
  }, [globalTotals, slips]);

  const exportToExcel = async () => {
    let approvedSlips: any[] = [];
    try {
      const params = new URLSearchParams();
      if (user?.branchId) params.append('branchId', user.branchId);
      if (debouncedSearch) params.append('search', debouncedSearch);
      params.append('status', 'APPROVED');
      if (filters.category) params.append('category', filters.category);
      if (filters.subcategory) params.append('subcategory', filters.subcategory);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.scaleSource) {
        let sourceParam = filters.scaleSource;
        if (sourceParam === 'Weighbridge') sourceParam = 'WEIGHBRIDGE';
        if (sourceParam === 'Small Scale') sourceParam = 'SMALL_SCALE';
        params.append('scaleSource', sourceParam);
      }
      
      const transType = activeTab === 'history_in' ? 'IN' : activeTab === 'history_out' ? 'OUT' : 'ALL';
      if (transType && transType !== 'ALL') params.append('type', transType);

      if (filters.type && filters.type !== 'ALL') {
        params.append('entryMode', filters.type);
      }

      params.append('page', '1');
      params.append('limit', '1000000'); // Load all matching records for excel

      const res = await fetch(`/api/slips?${params.toString()}`);
      const data = await res.json();
      if (!data.error) {
        approvedSlips = data.data || [];
      }
    } catch (err) {
      console.error("Failed to load approved slips for export:", err);
      toast.error("Failed to export: could not fetch entries from database");
      return;
    }

    const totalWeight = approvedSlips.reduce((sum: number, s: any) => sum + (parseFloat(s.net_weight) || 0), 0);
    const totalCharges = approvedSlips.reduce((sum: number, s: any) => sum + (parseFloat(s.tollkata_charges) || 0), 0);
    const overallRateIn = approvedSlips.reduce((sum: number, s: any) => sum + (parseFloat(s.rate_per_mt) || 0), 0);
    const totalAmount = approvedSlips.reduce((sum: number, s: any) => sum + ((parseFloat(s.net_weight) || 0) / 100) * (parseFloat(s.rate_per_mt) || 0), 0);
    const totalQtl = totalWeight / 100;
    const avgRate = totalQtl > 0 ? totalAmount / totalQtl : 0;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Weighbridge Slips');

    // 1. Add Report Header
    const reportTitle = activeTab === 'history_out' ? 'RGRAIN - DISPATCH SLIPS REPORT' : 'RGRAIN - INWARD SLIPS REPORT';
    const titleRow = worksheet.addRow([reportTitle]);
    titleRow.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F172A' } // slate-900
    };
    worksheet.mergeCells(`A1:M1`);
    titleRow.alignment = { horizontal: 'center' };

    worksheet.addRow([`Branch: ${user?.branchName || 'All Branches'}`]);
    worksheet.addRow([`Generated On: ${new Date().toLocaleString()}`]);
    worksheet.addRow([`Filter Date: ${filters.dateFrom || 'Start'} to ${filters.dateTo || 'End'}`]);
    
    // Reflect applied Category & Subcategory filters
    const filterCat = filters.category || 'All Categories';
    const filterSub = filters.subcategory || 'All Subcategories';
    const filterScale = filters.scaleSource || 'All Combined';
    worksheet.addRow([`Filters Applied: Category - ${filterCat} | Subcategory - ${filterSub} | Scale Source - ${filterScale} | Status - Approved Only`]);
    worksheet.addRow([]); // Spacer

    // 2. Add Table Headers
    const headerRow = worksheet.addRow([
      'S.No', 'Slip No', 'Vehicle No', 'Party Name', 'Address', 
      'Grain Category', 'Subcategory', 'Net Weight (Qtl)', 'Rate', 'Total Amount', 'Charges (Rs)', 'Type', 'Scale Source', 'Date'
    ]);

    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF1F5F9' } // slate-100
      };
      cell.font = { bold: true, size: 10 };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { horizontal: 'center' };
    });

    // 3. Add Data Rows
    approvedSlips.forEach(s => {
      const row = worksheet.addRow([
        s.serial_number,
        s.slip_no,
        s.vehicle_no,
        s.farmer_name || 'N/A',
        s.address || '-',
        s.grain_category,
        s.subcategory || '-',
        s.net_weight / 100,
        s.rate_per_mt,
        (s.net_weight / 100) * (s.rate_per_mt || 0),
        s.tollkata_charges,
        s.is_internal ? 'Internal' : 'External',
        s.scale_type || 'Weighbridge',
        new Date(s.created_at).toLocaleDateString()
      ]);
      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // 4. Add Summary Row (Totals)
    const summaryRow = worksheet.addRow([
      'GRAND TOTAL', '', '', '', '', '', '',
      totalWeight / 100,
      '',
      totalAmount,
      totalCharges,
      '', '', ''
    ]);

    summaryRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8FAFC' } // slate-50
      };
      cell.border = {
        top: { style: 'medium' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // 5. Add Average Row
    const avgRow = worksheet.addRow([
      'WEIGHTED AVERAGE', '', '', '', '', '', '',
      '',
      avgRate,
      '',
      '',
      '', '', ''
    ]);

    avgRow.eachCell((cell) => {
      cell.font = { bold: true, italic: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8FAFC' } // slate-50
      };
      cell.border = {
        left: { style: 'thin' },
        bottom: { style: 'medium' },
        right: { style: 'thin' }
      };
    });

    // 5. Column Widths
    worksheet.columns = [
      { width: 8 },  // S.No
      { width: 15 }, // Slip No
      { width: 15 }, // Vehicle No
      { width: 22 }, // Party Name
      { width: 18 }, // Address
      { width: 16 }, // Grain Category
      { width: 14 }, // Subcategory
      { width: 16 }, // Net Weight (Qtl)
      { width: 12 }, // Rate
      { width: 14 }, // Total Amount
      { width: 14 }, // Charges (Rs)
      { width: 12 }, // Type
      { width: 16 }, // Scale Source
      { width: 14 }  // Date
    ];

    // 6. Download File
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `Weight_Slips_${new Date().toISOString().split('T')[0]}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };


  return (
    <div className="space-y-8 pb-20">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight font-outfit text-slate-900 uppercase">Weighbridge (Bada Kata)</h1>
          <p className="text-sm text-muted-foreground mt-1">Smart vehicle weighing & record management system.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            <button 
              onClick={() => setActiveTab('history_in')}
              className={cn(
                "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap flex-1 min-w-[140px] md:flex-none md:min-w-0",
                activeTab === 'history_in' ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <History className="w-3.5 h-3.5" />
              Inward History
            </button>
            <button 
              onClick={() => setActiveTab('history_out')}
              className={cn(
                "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap flex-1 min-w-[140px] md:flex-none md:min-w-0",
                activeTab === 'history_out' ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <History className="w-3.5 h-3.5" />
              Dispatch History
            </button>
              <button 
                onClick={() => setActiveTab('form')}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap flex-1 min-w-[140px] md:flex-none md:min-w-0",
                  activeTab === 'form' ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:bg-slate-50"
                )}
              >
                <Plus className="w-3.5 h-3.5" />
                Bada Kata (In/Out Stock)
              </button>
            {user?.role !== 'staff' && (
              <button 
                onClick={() => setActiveTab('settings')}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap flex-1 min-w-[140px] md:flex-none md:min-w-0",
                  activeTab === 'settings' ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:bg-slate-50"
                )}
              >
                <Settings className="w-3.5 h-3.5" />
                Settings
              </button>
            )}
          </div>
        </div>
      </div>

      {activeTab === 'form' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-12 max-w-full mx-auto w-full space-y-8">
            <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
              <div className={cn("h-3 transition-all duration-700", entryType === 'IN' ? "bg-primary" : "bg-blue-900")} />
              <CardHeader className="p-6 sm:p-10 border-b border-slate-100 bg-slate-50/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <div className={cn(
                      "w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-2xl transition-all shadow-xl",
                      entryType === 'IN' ? "bg-primary text-white" : "bg-blue-900 text-white"
                    )}>
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-black font-outfit uppercase tracking-tight">
                        {entryType === 'IN' ? 'Purchase Entry' : 'Dispatch Entry'}
                      </CardTitle>
                      <CardDescription className="text-xs font-black uppercase tracking-[0.2em] opacity-60">
                        Direct Weight Capture & Slip Generation
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex items-center bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                    <button 
                      onClick={() => setEntryType('IN')}
                      className={cn(
                        "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        entryType === 'IN' ? "bg-primary text-white shadow-md" : "text-slate-400 hover:text-slate-900"
                      )}
                    >
                      Inward
                    </button>
                    <button 
                      onClick={() => setEntryType('OUT')}
                      className={cn(
                        "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        entryType === 'OUT' ? "bg-blue-900 text-white shadow-md" : "text-slate-400 hover:text-slate-900"
                      )}
                    >
                      Outward
                    </button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-8 sm:p-10">
                <form onSubmit={handleSubmit} className="space-y-12">
                  {/* Step Indicators */}
                  <div className="flex items-center gap-4">
                    <div className={cn("flex-1 h-1.5 rounded-full transition-all duration-500", "bg-slate-900")} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {/* Basic Info */}
                    <div className="space-y-8">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                          <User className="w-4 h-4 text-primary" /> Entity Details
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 gap-6">
                        {/* <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Party Name (Optional)</label>
                          <input 
                            type="text" 
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all font-bold text-sm"
                            placeholder="Enter Name"
                            value={formData.farmerName}
                            onChange={(e) => setFormData({...formData, farmerName: e.target.value})}
                          />
                        </div> */}
                        {/* <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Address (Optional)</label>
                          <input 
                            type="text" 
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all font-bold text-sm"
                            placeholder="City / Village"
                            value={formData.address}
                            onChange={(e) => setFormData({...formData, address: e.target.value})}
                          />
                        </div> */}
                        <div className="grid grid-cols-2 gap-4">
                          {/* <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Mobile No</label>
                            <input 
                              type="tel" 
                              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all font-bold text-sm"
                              placeholder="+91..."
                              value={formData.farmerMobile}
                              onChange={(e) => setFormData({...formData, farmerMobile: e.target.value})}
                            />
                          </div> */}
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tollkata S.No</label>
                            <input 
                              type="text" 
                              required
                              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all font-black text-sm text-slate-900"
                              placeholder="Enter S.No"
                              value={formData.serialNumber}
                              onChange={(e) => setFormData({...formData, serialNumber: e.target.value})}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Trollies Loop */}
                    <div className="col-span-1 md:col-span-2 space-y-8">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                          <Truck className="w-4 h-4 text-primary" /> Trollies / Commodities
                        </h3>
                        <button 
                          type="button"
                          onClick={() => setTrollies([...trollies, {
                            id: Date.now().toString(),
                            vehicleNumber: "",
                            driverName: "",
                            grainType: "",
                            subcategory: "",
                            vehicleType: "",
                            grossWeight: "",
                            tareWeight: "",
                            netWeight: 0,
                            rate: 0,
                            totalAmount: 0,
                            tollkataCharges: 0,
                            isInternal: true
                          }])}
                          className="px-4 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Trolly
                        </button>
                      </div>

                      <div className="space-y-6">
                        {trollies.map((trolly, index) => (
                          <div key={trolly.id} className="p-6 bg-slate-50 border border-slate-200 rounded-3xl relative">
                            {trollies.length > 1 && (
                              <button 
                                type="button"
                                onClick={() => setTrollies(trollies.filter((_, i) => i !== index))}
                                className="absolute -top-3 -right-3 w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                            <div className="flex items-center gap-2 mb-6">
                              <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">{index + 1}</span>
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Trolly Details</h4>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                              {/* Vehicle */}
                              {/* <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Vehicle No</label>
                                <input 
                                  type="text" 
                                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all font-black text-xs uppercase tracking-widest"
                                  placeholder="HR-XX-XXXX"
                                  value={trolly.vehicleNumber}
                                  onChange={(e) => handleTrollyChange(index, 'vehicleNumber', e.target.value.toUpperCase())}
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Vehicle Type</label>
                                <select 
                                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all font-black text-[10px] uppercase tracking-widest appearance-none cursor-pointer"
                                  value={trolly.vehicleType}
                                  onChange={(e) => handleVehicleTypeChange(index, e.target.value)}
                                >
                                  <option value="">Select Type</option>
                                  {vehicleRates.map(v => (
                                    <option key={v.id} value={v.vehicle_type}>{v.vehicle_type}</option>
                                  ))}
                                </select>
                              </div> */}
                              
                              {/* Grain */}
                              <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Category</label>
                                <select 
                                  required
                                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all font-black text-[10px] uppercase tracking-widest appearance-none cursor-pointer"
                                  onChange={(e) => handleGrainChange(index, e.target.value)}
                                  value={availableRates.find(r => r.category_name === trolly.grainType)?.id || ""}
                                >
                                  <option value="">Category</option>
                                  {availableRates.map(c => (
                                    <option key={c.id} value={c.id}>{c.category_name}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Subcategory</label>
                                <select 
                                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all font-black text-[10px] uppercase tracking-widest appearance-none cursor-pointer disabled:opacity-50"
                                  disabled={!trolly.grainType}
                                  value={trolly.subcategory}
                                  onChange={(e) => handleTrollyChange(index, 'subcategory', e.target.value)}
                                >
                                  <option value="">Subcategory</option>
                                  {getSubcategories(trolly.grainType).map((sub: string) => (
                                    <option key={sub} value={sub}>{sub}</option>
                                  ))}
                                </select>
                              </div>

                              {/* Weight & Rate */}
                              <div className="space-y-2 lg:col-span-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Net Wt (Qtl)</label>
                                <input 
                                  type="number" 
                                  step="any"
                                  required
                                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all font-black text-sm"
                                  placeholder="0"
                                  value={trolly.netWeight ? trolly.netWeight / 100 : ""}
                                  onChange={(e) => handleNetWeightChange(index, e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Rate (₹)</label>
                                <input 
                                  type="number" 
                                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all font-black text-sm"
                                  placeholder="0"
                                  value={trolly.rate}
                                  onChange={(e) => handleRateChange(index, e.target.value)}
                                />
                              </div>
                              {/* <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Driver (Opt)</label>
                                <input 
                                  type="text" 
                                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all font-bold text-[10px]"
                                  placeholder="Name"
                                  value={trolly.driverName}
                                  onChange={(e) => handleTrollyChange(index, 'driverName', e.target.value)}
                                />
                              </div> */}
                            </div>
                            
                            {/* <div className="mt-4 flex justify-between items-center border-t border-slate-200 pt-4">
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Trolly Value: <span className="text-slate-900">{formatCurrency(trolly.totalAmount)}</span> + <span className="text-primary">{formatCurrency(parseFloat(trolly.tollkataCharges as any) || 0)}</span></span>
                            </div> */}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="col-span-1 md:col-span-2 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

                    <div className="col-span-1 md:col-span-2">
                      {/* Financial Summary */}
                      <div className={cn(
                        "h-fit rounded-[3rem] p-10 flex flex-col justify-between shadow-2xl relative overflow-hidden group border border-white/5 transition-all duration-700",
                        entryType === 'IN' ? "bg-slate-900 text-white" : "bg-blue-900 text-white"
                      )}>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-white/10 transition-all duration-1000" />
                        
                        <div className="space-y-8 relative z-10">
                          <div className="flex justify-between items-end">
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 block mb-1">Grand Net Weight</span>
                              <span className="text-4xl font-black tracking-tighter">{(trollies.reduce((sum, t) => sum + t.netWeight, 0) / 100).toFixed(2)} <span className="text-xl opacity-60">Qtl</span></span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 block mb-1">Total Tollkata</span>
                              <span className="text-xl font-black text-primary">{formatCurrency(trollies.reduce((sum, t) => sum + (parseFloat(t.tollkataCharges as any) || 0), 0))}</span>
                            </div>
                          </div>

                          <div className="h-px bg-white/10" />

                          <div className="space-y-4">
                            <div className="flex justify-between items-end">
                              <span className="font-bold opacity-50 uppercase tracking-widest text-[10px] w-24 leading-tight">Commodities Value</span>
                              <span className="text-2xl font-black text-white tracking-tighter">{formatCurrency(trollies.reduce((sum, t) => sum + t.totalAmount, 0))}</span>
                            </div>
                            <div className="flex justify-between items-end pt-4 border-t border-white/10 mt-2">
                              <span className="font-bold opacity-50 uppercase tracking-widest text-[10px] w-24 leading-tight">Grand Total</span>
                              <span className="text-4xl font-black text-primary tracking-tighter">{formatCurrency(trollies.reduce((sum, t) => sum + t.totalAmount + (parseFloat(t.tollkataCharges as any) || 0), 0))}</span>
                            </div>
                          </div>
                        </div>
                        
                        <button 
                          type="submit"
                          disabled={isSubmitting}
                          className={cn(
                            "w-full font-black py-6 rounded-[1.5rem] mt-10 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 uppercase tracking-[0.2em] text-xs shadow-2xl shadow-black/20",
                            entryType === 'IN' ? "bg-primary text-white" : "bg-white text-blue-900"
                          )}
                        >
                          {isSubmitting ? "Processing..." : `Generate ${trollies.length > 1 ? 'Batch' : 'Official'} Slip`}
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>


        </div>
      )}

      {(activeTab === 'history_in' || activeTab === 'history_out') && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Advanced Filters */}
          <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden">
            <CardHeader className="border-b border-slate-50 p-8">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3 flex-1">
                    <div className={cn(
                      "px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider",
                      activeTab === 'history_in' ? "bg-primary/10 text-primary" : "bg-blue-50 text-blue-900"
                    )}>
                      {activeTab === 'history_in' ? 'Inward Records' : 'Dispatch Records'}
                    </div>
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                      <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Search Slip, Vehicle or Party..."
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                        value={filters.search}
                        onChange={(e) => setFilters({...filters, search: e.target.value})}
                      />
                    </div>
                    <button className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all">
                      <Filter className="w-3.5 h-3.5" />
                      Filters
                    </button>
                  </div>
                  {user?.role !== 'staff' && (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={exportToExcel}
                        className="px-5 py-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all border border-emerald-100"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        Excel
                      </button>
                    </div>
                  )}
               </div>
               
               <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mt-6">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">From Date</label>
                    <input 
                      type="date" 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none"
                      value={filters.dateFrom}
                      onChange={(e) => { setCurrentPage(1); setFilters({...filters, dateFrom: e.target.value}) }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">To Date</label>
                    <input 
                      type="date" 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none"
                      value={filters.dateTo}
                      onChange={(e) => { setCurrentPage(1); setFilters({...filters, dateTo: e.target.value}) }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Category</label>
                    <select 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none"
                      value={filters.category}
                      onChange={(e) => { setCurrentPage(1); setFilters({...filters, category: e.target.value, subcategory: ""}) }}
                    >
                      <option value="">All Categories</option>
                      {availableRates.map(c => <option key={c.id} value={c.category_name}>{c.category_name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Subcategory</label>
                    <select 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none disabled:opacity-50"
                      value={filters.subcategory}
                      onChange={(e) => { setCurrentPage(1); setFilters({...filters, subcategory: e.target.value}) }}
                      disabled={!filters.category}
                    >
                      <option value="">All Subcategories</option>
                      {filterSubcategories.map((sub: string) => <option key={sub} value={sub}>{sub}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Approval</label>
                    <select 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none"
                      value={filters.status}
                      onChange={(e) => { setCurrentPage(1); setFilters({...filters, status: e.target.value}) }}
                    >
                      <option value="">All Status</option>
                      <option value="APPROVED">Approved</option>
                      <option value="PENDING">Pending</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Entry Type</label>
                    <select 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none"
                      value={filters.type}
                      onChange={(e) => { setCurrentPage(1); setFilters({...filters, type: e.target.value}) }}
                    >
                      <option value="ALL">All Entries</option>
                      <option value="INTERNAL">Internal Only</option>
                      <option value="EXTERNAL">External Only</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Scale Source</label>
                    <select 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none"
                      value={filters.scaleSource}
                      onChange={(e) => { setCurrentPage(1); setFilters({...filters, scaleSource: e.target.value}) }}
                    >
                      <option value="ALL">All Combined</option>
                      <option value="Weighbridge">Weighbridge</option>
                      <option value="Small Scale">Small Scale</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button 
                      onClick={() => setFilters({ search: "", dateFrom: "", dateTo: "", category: "", subcategory: "", status: "", type: "ALL", scaleSource: "ALL" })}
                      className="w-full py-2.5 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors"
                    >
                      Clear Filters
                    </button>
                  </div>
               </div>

            </CardHeader>
            <CardContent className="p-0">
               <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">S.No</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Slip Details</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Vehicle & Party</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Address</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Commodity</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Net Weight (Qtl)</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Rate</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Total Amount</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Charges</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Type</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Scale Source</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Approval</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredSlips.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="px-8 py-20 text-center">
                            <TrendingUp className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No matching records found</p>
                          </td>
                        </tr>
                      ) : (
                        paginatedSlips.map((slip) => (
                          <tr key={slip.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-8 py-6">
                              <span className="text-xs font-black text-slate-900">#{slip.serial_number}</span>
                            </td>
                            <td className="px-6 py-6">
                              <div className="space-y-1">
                                <p className="text-xs font-black text-primary">{slip.slip_no}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                                  {new Date(slip.created_at).toLocaleDateString()} • {new Date(slip.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </td>
                            <td className="px-6 py-6">
                              <div className="space-y-1">
                                <p className="text-xs font-black text-slate-900 uppercase tracking-widest">{slip.vehicle_no}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">{slip.farmer_name || 'N/A'}</p>
                              </div>
                            </td>
                            <td className="px-6 py-6">
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight truncate max-w-[120px]">{slip.address || '—'}</p>
                            </td>
                            <td className="px-6 py-6">
                              <div className="space-y-1">
                                <p className="text-xs font-black text-slate-700 uppercase tracking-tight">{slip.grain_category}</p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{slip.subcategory || 'Default'}</p>
                              </div>
                            </td>
                            <td className="px-6 py-6 text-right">
                              <p className="text-xs font-black text-slate-900">{((parseFloat(slip.net_weight as any) || 0) / 100).toFixed(2)} <span className="text-[10px] opacity-40">Qtl</span></p>
                            </td>
                            <td className="px-6 py-6 text-right">
                              <p className="text-xs font-black text-slate-900">{formatCurrency(slip.rate_per_mt || 0)}</p>
                             </td>
                             <td className="px-6 py-6 text-right">
                               <p className="text-xs font-black text-primary">{formatCurrency(((slip.net_weight || 0) / 100) * (slip.rate_per_mt || 0))}</p>
                             </td>
                             <td className="px-6 py-6 text-right">
                               <p className="text-xs font-black text-slate-900">{formatCurrency(slip.tollkata_charges)}</p>
                            </td>
                            <td className="px-6 py-6 text-center">
                              <span className={cn(
                                "text-[8px] px-2.5 py-1 rounded-full font-black uppercase tracking-widest border",
                                slip.is_internal 
                                  ? "bg-slate-100 text-slate-600 border-slate-200" 
                                  : "bg-blue-50 text-blue-700 border-blue-100"
                              )}>
                                {slip.is_internal ? 'Internal' : 'External'}
                              </span>
                            </td>
                            <td className="px-6 py-6 text-center">
                              <span className={cn(
                                "text-[8px] px-2.5 py-1 rounded-md font-black uppercase tracking-widest border",
                                slip.scale_type === 'Small Scale' 
                                  ? "bg-amber-50 text-amber-800 border-amber-200" 
                                  : "bg-purple-50 text-purple-800 border-purple-200"
                              )}>
                                {slip.scale_type || 'Weighbridge'}
                              </span>
                            </td>
                            <td className="px-6 py-6 text-center">
                              <button
                                type="button"
                                onClick={() => handleStatusToggle(slip)}
                                disabled={user?.role === 'staff'}
                                className={cn(
                                  "text-[8px] px-3 py-1 rounded-full font-black uppercase tracking-widest border transition-all inline-flex items-center justify-center min-w-[70px]",
                                  user?.role !== 'staff' && "cursor-pointer hover:scale-105 active:scale-95 shadow-xs",
                                  slip.status === 'APPROVED' 
                                    ? "bg-green-50 text-green-700 border-green-200" 
                                    : slip.status === 'REJECTED'
                                    ? "bg-red-50 text-red-700 border-red-200"
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                )}
                                title={user?.role !== 'staff' ? "Click to Toggle Approval" : "Approval Status"}
                              >
                                {slip.status || 'PENDING'}
                              </button>
                            </td>
                            <td className="px-8 py-6 text-right">
                               <div className="flex items-center justify-end gap-2 ">
                                  <button 
                                    onClick={() => { 
                                      let printSlip = slip;
                                      if (slip.serial_number) {
                                        const related = slips.filter(s => s.serial_number === slip.serial_number && s.scale_type === slip.scale_type);
                                        if (related.length > 1) {
                                          // Sort by slip_no to ensure correct order
                                          const sortedRelated = [...related].sort((a, b) => (a.slip_no || '').localeCompare(b.slip_no || ''));
                                          printSlip = { ...slip, items: sortedRelated };
                                        }
                                      }
                                      setSelectedSlip(printSlip); 
                                      setIsModalOpen(true); 
                                    }}
                                    className="p-2 hover:bg-white rounded-lg border border-slate-200 text-slate-600 shadow-sm cursor-pointer hover:scale-105 active:scale-95 transition-all" title="View/Print"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  {(user as any)?.role !== 'staff' && (
                                     <button 
                                       onClick={() => {
                                         const currentWeight = slip.net_weight;
                                         const currentRate = slip.rate_per_mt;
                                         setEditForm({
                                           id: slip.id,
                                           scaleType: slip.scale_type || 'Weighbridge',
                                           farmer_name: slip.farmer_name || slip.party_name || '',
                                           farmer_mobile: slip.farmer_mobile || slip.party_mobile || '',
                                           address: slip.address || '',
                                           vehicle_no: slip.vehicle_no || '',
                                           net_weight: currentWeight?.toString() || '0',
                                           rate_per_mt: currentRate?.toString() || '0'
                                         });
                                         setIsEditModalOpen(true);
                                       }}
                                       className="p-2 hover:bg-white rounded-lg border border-slate-200 text-slate-600 shadow-sm cursor-pointer hover:scale-105 active:scale-95 transition-all" title="Edit Record"
                                     >
                                       <Edit className="w-3.5 h-3.5" />
                                     </button>
                                   )}
                                   {(user as any)?.role !== 'staff' && (
                                     <button 
                                         onClick={async () => {
                                           if (!confirm(`Permanently remove entry #${slip.slip_no || slip.serial_number}?`)) return;
                                           try {
                                             const res = await fetch(`/api/slips/${slip.id}?scaleType=${slip.scale_type || 'Weighbridge'}`, {
                                               method: 'DELETE'
                                             });
                                             if (res.ok) {
                                               toast.success("Entry completely removed from system");
                                               fetchSlips();
                                             } else {
                                               toast.error("Deletion rejected by database");
                                             }
                                           } catch (e) {
                                             toast.error("Network interface error during deletion");
                                           }
                                         }}
                                         className="p-2 hover:bg-white rounded-lg border border-slate-200 text-red-600 shadow-sm cursor-pointer hover:scale-105 active:scale-95 transition-all" title="Delete Entry"
                                       >
                                         <Trash2 className="w-3.5 h-3.5" />
                                       </button>
                                   )}
                               </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {filteredSlips.length > 0 && (user as any)?.role !== 'staff' && (
                      <tfoot className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest sticky bottom-0 z-10 shadow-[0_-10px_30px_rgba(0,0,0,0.1)]">
                        <tr>
                          <td colSpan={5} className="px-8 py-5 text-right opacity-60 align-top">Grand Totals</td>
                          <td className="px-6 py-5 text-right text-primary align-top">{(totals.totalWeight / 100).toFixed(2)} Qtl</td>
                          <td className="px-6 py-5"></td>
                          <td className="px-6 py-5 text-right space-y-0.5">
                            <div className="text-white">{formatCurrency(totals.totalAmount)} <span className="text-[8px] opacity-40">(TOTAL)</span></div>
                            <div className="text-primary text-[9px]">{formatCurrency(totals.avgRate)} <span className="text-[8px] opacity-40">(AVG RATE)</span></div>
                          </td>
                          <td className="px-6 py-5 text-right text-primary align-top">{formatCurrency(totals.totalCharges)}</td>
                          <td colSpan={4} className="px-8 py-5"></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
               </div>
               {/* Pagination Controls */}
               {totalPages > 1 && (
                 <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                     Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} entries
                   </p>
                   <div className="flex items-center gap-2">
                     <button
                       onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                       disabled={currentPage === 1}
                       className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50 hover:bg-slate-50 hover:text-slate-900 transition-all text-slate-600"
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
      )}

      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
           {/* Serial Number Settings */}
           <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden">
             <CardHeader className="p-8 border-b border-slate-50">
               <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-3">
                 <Settings className="w-5 h-5 text-primary" />
                 Slip Serial Numbers
               </CardTitle>
               <CardDescription className="text-xs">Configure the starting sequence for your Tollkata entries.</CardDescription>
             </CardHeader>
             <CardContent className="p-8">
               <div className="space-y-6">
                 <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Current Next S.No</span>
                      <span className="text-xl font-black text-primary">#{ (weighbridgeSettings?.current_serial_number || 0) + 1 }</span>
                    </div>
                    <div className="h-px bg-slate-200 my-4" />
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Reset Starting S.No Manually</label>
                      <div className="flex flex-col sm:flex-row items-stretch gap-2">
                        <input 
                          type="number" 
                          className="flex-1 px-5 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all font-black text-sm"
                          placeholder="e.g. 1001"
                          id="startingSerialInput"
                        />
                        <button 
                          onClick={async () => {
                            const val = (document.getElementById('startingSerialInput') as HTMLInputElement).value;
                            if (!val) return;
                            try {
                              const res = await fetch('/api/weighbridge/settings', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ branchId: user?.branchId, startingSerialNumber: parseInt(val) })
                              });
                              const data = await res.json();
                              if (!res.ok || data.error) {
                                throw new Error(data.error || "Failed to update settings");
                              }
                              setWeighbridgeSettings(data);
                              toast.success("Serial number sequence updated!");
                            } catch (e: any) {
                              toast.error(e.message || "Failed to update settings");
                            }
                          }}
                          className="px-6 py-3.5 sm:py-0 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                        >
                          Update
                        </button>
                      </div>
                    </div>
                 </div>
                 <div className="flex items-start gap-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] font-bold text-amber-700 leading-relaxed uppercase tracking-tight">
                      CAUTION: Manually changing the serial number sequence may lead to gaps or duplicates in your records if not managed carefully.
                    </p>
                 </div>
               </div>
             </CardContent>
           </Card>

           {/* Vehicle Rate Settings */}
           {/* <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden">
             <CardHeader className="p-8 border-b border-slate-50">
               <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-3">
                 <Truck className="w-5 h-5 text-primary" />
                 Vehicle Type Rates
               </CardTitle>
               <CardDescription className="text-xs">Set predefined Tollkata charges for different vehicle categories.</CardDescription>
             </CardHeader>
             <CardContent className="p-8">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-3">
                    {vehicleRates.map(v => (
                      <div key={v.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Vehicle Type</p>
                          <p className="text-sm font-black text-slate-900 uppercase">{v.vehicle_type}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Rate</p>
                          <p className="text-sm font-black text-primary">{formatCurrency(v.rate)}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-6 bg-slate-900 text-white rounded-3xl space-y-4">
                     <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Add New Category</p>
                     <div className="grid grid-cols-2 gap-3">
                        <input type="text" id="newVehicleType" placeholder="Tractor / Truck..." className="px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-xs font-bold outline-none focus:bg-white/20 transition-all" />
                        <input type="number" id="newVehicleRate" placeholder="Rs. 50" className="px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-xs font-bold outline-none focus:bg-white/20 transition-all" />
                     </div>
                     <button 
                       onClick={async () => {
                         const type = (document.getElementById('newVehicleType') as HTMLInputElement).value;
                         const rate = (document.getElementById('newVehicleRate') as HTMLInputElement).value;
                         if (!type || !rate) return;
                         try {
                           const res = await fetch('/api/weighbridge/vehicle-rates', {
                             method: 'POST',
                             headers: { 'Content-Type': 'application/json' },
                             body: JSON.stringify({ branchId: user?.branchId, vehicleType: type, rate: parseFloat(rate) })
                           });
                           await fetchVehicleRates();
                           (document.getElementById('newVehicleType') as HTMLInputElement).value = "";
                           (document.getElementById('newVehicleRate') as HTMLInputElement).value = "";
                           toast.success("Vehicle rate updated!");
                         } catch (e) {
                           toast.error("Failed to add rate");
                         }
                       }}
                       className="w-full py-4 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all"
                      >
                       Add / Update Rate
                     </button>
                  </div>
                </div>
             </CardContent>
           </Card> */}
        </div>
      )}

      <SlipModal 
        isOpen={isModalOpen} 
        slip={selectedSlip} 
        onClose={() => setIsModalOpen(false)} 
      />

      {/* Live Record Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Modify Record Parameters</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Live Database Overrides</p>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Entity Name</label>
                  <input 
                    type="text" 
                    value={editForm.farmer_name} 
                    onChange={(e) => setEditForm({ ...editForm, farmer_name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-primary focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Contact Number</label>
                  <input 
                    type="text" 
                    value={editForm.farmer_mobile} 
                    onChange={(e) => setEditForm({ ...editForm, farmer_mobile: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-primary focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Address / Location</label>
                <input 
                  type="text" 
                  value={editForm.address} 
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-primary focus:bg-white transition-all"
                />
              </div>

              {editForm.scaleType !== 'Small Scale' && (
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Vehicle Reg. Number</label>
                  <input 
                    type="text" 
                    value={editForm.vehicle_no} 
                    onChange={(e) => setEditForm({ ...editForm, vehicle_no: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 outline-none focus:border-primary focus:bg-white transition-all uppercase"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Net Weight ({editForm.scaleType !== 'Small Scale' ? 'scaled unit' : 'kg'})</label>
                  <input 
                    type="number" 
                    step="any"
                    value={editForm.net_weight} 
                    onChange={(e) => setEditForm({ ...editForm, net_weight: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-primary outline-none focus:border-primary focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Unit Rate (Rs)</label>
                  <input 
                    type="number" 
                    step="any"
                    value={editForm.rate_per_mt} 
                    onChange={(e) => setEditForm({ ...editForm, rate_per_mt: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-primary outline-none focus:border-primary focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>
            <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-700 text-xs font-black uppercase tracking-widest transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  if (editForm.farmer_mobile.trim() && !editForm.farmer_mobile.trim().startsWith('NA-')) {
                    const rawMobile = editForm.farmer_mobile.trim();
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

                  const nw = parseFloat(editForm.net_weight) || 0;
                  const rt = parseFloat(editForm.rate_per_mt) || 0;
                  const payload: any = {
                    scaleType: editForm.scaleType,
                    net_weight: nw,
                    rate_per_mt: rt,
                    payable_amount: editForm.scaleType === 'Small Scale' ? nw * rt : (nw / 100) * rt,
                    farmer_name: editForm.farmer_name,
                    farmer_mobile: editForm.farmer_mobile,
                    address: editForm.address,
                    vehicle_no: editForm.vehicle_no
                  };
                  try {
                    const res = await fetch(`/api/slips/${editForm.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(payload)
                    });
                    if (res.ok) {
                      toast.success("Record settings successfully mutated!");
                      setIsEditModalOpen(false);
                      fetchSlips();
                    } else {
                      toast.error("Database schema enforcement rejected update");
                    }
                  } catch (e) {
                    toast.error("Network synchronization failed");
                  }
                }}
                className="px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest hover:opacity-95 shadow-md shadow-primary/20 transition-all active:scale-95"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
