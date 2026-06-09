"use client";

import React, { useEffect, useState } from "react";
import { 
  TrendingUp, 
  Scale, 
  Package, 
  Clock, 
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  Filter,
  Loader2,
  X,
  ArrowLeft,
  ReceiptIndianRupee,
  RotateCcw,
  Building2,
  Layers
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area
} from "recharts";
import { cn, formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { useAuthStore } from "@/lib/store/auth-store";
import { useSearchParams, useRouter } from "next/navigation";

const COLORS = ["#b45309", "#166534", "#0369a1", "#64748b", "#7c3aed", "#db2777"];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Superadmin branch override
  const overrideBranchId = searchParams.get('branchId');
  const overrideBranchName = searchParams.get('branchName');
  
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [data, setData] = useState<any>(null);
  const [source, setSource] = useState("all");
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  // Modal States
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockModalMode, setStockModalMode] = useState<'current' | 'lifetime'>('current');
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [drillDownData, setDrillDownData] = useState<any[]>([]);
  const [drillDownTitle, setDrillDownTitle] = useState("Stock Breakdown");
  const [isSubView, setIsSubView] = useState(false);
  const [drillDownLoading, setDrillDownLoading] = useState(false);

  const clearFilters = () => {
    setSelectedCategory("");
    setSelectedSubcategory("");
    setSource("all");
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    setStartDate(todayStr);
    setEndDate(todayStr);
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/rates');
      const rates = await res.json();
      if (Array.isArray(rates)) {
        setCategories(rates);
      } else {
        console.error("Rates API returned non-array:", rates);
        setCategories([]);
      }
    } catch (e) {
      console.error("Failed to fetch categories", e);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (user?.role === 'staff') {
      const template = (user.permissions as any)?.template;
      if (template !== 'General Labor') {
        const templatePermissions: Record<string, string[]> = {
          "Weighman": ["Weighbridge", "Farmers"],
          "Cashier": ["Farmers", "Ledger", "Approvals"],
          "Godown Keeper": ["Stock", "Small Scale"],
          "Small Scale": ["Small Scale", "Farmers"],
          "General Labor": [],
        };
        const moduleRoutes: Record<string, string> = {
          "Weighbridge": "/dashboard/weighbridge",
          "Small Scale": "/dashboard/small-scale",
          "Farmers": "/dashboard/farmers",
          "Ledger": "/dashboard/ledger",
          "Approvals": "/dashboard/approvals",
          "Stock": "/dashboard/stock",
        };
        const templates = typeof template === 'string' ? template.split(',').map((t: string) => t.trim()) : [];
        const allowedModules: string[] = [];
        templates.forEach((t: string) => {
          if (templatePermissions[t]) {
            allowedModules.push(...templatePermissions[t]);
          }
        });
        let firstRoute = "";
        if (allowedModules.length > 0) {
          for (const mod of allowedModules) {
            if (moduleRoutes[mod]) {
              firstRoute = moduleRoutes[mod];
              break;
            }
          }
        }
        if (firstRoute) {
          router.replace(firstRoute);
        }
      }
    }
  }, [user, router]);

  useEffect(() => {
    if (user?.branchId || user?.role === 'superadmin' || overrideBranchId) {
      fetchDashboardData();
    }
  }, [user, selectedCategory, selectedSubcategory, source, startDate, endDate, overrideBranchId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      // Determine effective branch ID
      const effectiveBranchId = overrideBranchId || (user?.role !== 'superadmin' ? user?.branchId : null);
      
      if (effectiveBranchId) params.append('branchId', effectiveBranchId);
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedSubcategory) params.append('subcategory', selectedSubcategory);
      if (source !== 'all') params.append('source', source);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      // Use branch API if we have a specific branch ID, even if superadmin
      const endpoint = (user?.role === 'superadmin' && !overrideBranchId)
        ? `/api/analytics/global?${params.toString()}` 
        : `/api/analytics/branch?${params.toString()}`;
      
      const response = await fetch(endpoint);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubcategoryStock = async (categoryName: string, type: 'stock' | 'price' | 'purchase' = 'stock') => {
    try {
      setDrillDownLoading(true);
      const params = new URLSearchParams();
      
      const effectiveBranchId = overrideBranchId || (user?.role !== 'superadmin' ? user?.branchId : null);
      if (effectiveBranchId) params.append('branchId', effectiveBranchId);
      
      params.append('category', categoryName);
      if (source !== 'all') params.append('source', source);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const endpoint = (user?.role === 'superadmin' && !overrideBranchId)
        ? `/api/analytics/global?${params.toString()}` 
        : `/api/analytics/branch?${params.toString()}`;
      
      const response = await fetch(endpoint);
      const result = await response.json();
      if (type === 'purchase') {
        setDrillDownData(result.purchaseSplit || []);
        setDrillDownTitle(`${categoryName} - Purchase Value Split`);
      } else {
        if (type === 'stock') {
          if (stockModalMode === 'lifetime') {
            setDrillDownData(result.lifetimeCategorySplit || []);
          } else {
            setDrillDownData(result.categorySplit || []);
          }
        } else {
          setDrillDownData(result.avgRateSplit || []);
        }
        setDrillDownTitle(`${categoryName} - ${type === 'stock' ? 'Subcategory Split' : 'Avg Rate Split'}`);
      }
      setIsSubView(true);
    } catch (error) {
      console.error("Failed to fetch details:", error);
    } finally {
      setDrillDownLoading(false);
    }
  };

  const openPriceModal = () => {
    if (selectedCategory) {
      setDrillDownData(data?.avgRateSplit || []);
      setDrillDownTitle(`${selectedCategory} - Avg Rate Split`);
      setIsSubView(true);
    } else {
      setDrillDownData(data?.avgRateSplit || []);
      setDrillDownTitle("Category Wise Avg Rate");
      setIsSubView(false);
    }
    setIsPriceModalOpen(true);
  };

  const openStockModal = () => {
    setStockModalMode('current');
    if (selectedCategory) {
      setDrillDownData(data?.categorySplit || []);
      setDrillDownTitle(`${selectedCategory} - Subcategory Split`);
      setIsSubView(true);
    } else {
      setDrillDownData(data?.categorySplit || []);
      setDrillDownTitle("Category Wise Stock");
      setIsSubView(false);
    }
    setIsStockModalOpen(true);
  };

  const openLifetimeStockModal = () => {
    setStockModalMode('lifetime');
    if (selectedCategory) {
      setDrillDownData(data?.lifetimeCategorySplit || []);
      setDrillDownTitle(`Lifetime ${selectedCategory} - Subcategory Split`);
      setIsSubView(true);
    } else {
      setDrillDownData(data?.lifetimeCategorySplit || []);
      setDrillDownTitle("Lifetime Category Wise Stock");
      setIsSubView(false);
    }
    setIsStockModalOpen(true);
  };
  const openPurchaseModal = () => {
    if (selectedCategory) {
      setDrillDownData(data?.purchaseSplit || []);
      setDrillDownTitle(`${selectedCategory} - Purchase Value Split`);
      setIsSubView(true);
    } else {
      setDrillDownData(data?.purchaseSplit || []);
      setDrillDownTitle("Category Wise Purchase Value");
      setIsSubView(false);
    }
    setIsPurchaseModalOpen(true);
  };
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse font-medium">Loading your dashboard...</p>
      </div>
    );
  }

  const kpis = [
    { 
      title: "Today's Purchase", 
      value: formatCurrency(data?.kpis?.todayPurchase || 0), 
      change: "+0%", // Needs comparison logic for real dynamism
      trend: "up", 
      icon: TrendingUp, 
      color: "text-primary",
      bgColor: "bg-primary/10",
      clickable: true,
      onClick: openPurchaseModal
    },
    { 
      title: "Vehicles Today", 
      value: data?.kpis?.todayVehicles || 0, 
      change: "+0", 
      trend: "up", 
      icon: Scale, 
      color: "text-blue-600",
      bgColor: "bg-blue-600/10"
    },
    { 
      title: "Pending Slips", 
      value: data?.kpis?.pendingSlips || 0, 
      change: "0", 
      trend: "down", 
      icon: Clock, 
      color: "text-amber-600",
      bgColor: "bg-amber-600/10"
    },
    { 
      title: "Avg Purchase Rate", 
      value: `₹${Number(data?.kpis?.avgPurchaseRate || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 
      change: "+0%", 
      trend: "up", 
      icon: ReceiptIndianRupee, 
      color: "text-purple-600",
      bgColor: "bg-purple-600/10",
      clickable: true,
      onClick: openPriceModal
    },
    { 
      title: "Stock Available", 
      value: `${Number(data?.kpis?.totalStock || 0).toFixed(3)} Qtl`, 
      change: "+0 Qtl", 
      trend: "up", 
      icon: Package, 
      color: "text-green-600",
      bgColor: "bg-green-600/10",
      clickable: true,
      onClick: openStockModal
    },
    { 
      title: "Lifetime Stock", 
      value: `${Number(data?.kpis?.lifetimeStock || 0).toFixed(3)} Qtl`, 
      change: "Overall", 
      trend: "up", 
      icon: Layers, 
      color: "text-emerald-600",
      bgColor: "bg-emerald-600/10",
      clickable: true,
      onClick: openLifetimeStockModal
    },
  ];

  const chartData = data?.trendData || [];
  const categoryData = data?.categorySplit || [];
  const sourceData = data?.sourceSplit || [];
  const recentSlips = data?.recentSlips || [];

  const isGeneralLabor = user?.role === 'staff' && (user.permissions as any)?.template === 'General Labor';

  if (isGeneralLabor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center mb-6 animate-bounce">
          <Package className="w-12 h-12 text-primary" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 font-outfit tracking-tight mb-2">Staff Portal</h1>
        <p className="text-muted-foreground max-w-md font-medium">
          Welcome, {user?.name}! Your account is active. Please contact your manager for daily assignments or use the sidebar to access permitted tools.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12 w-full max-w-2xl">
          <Card className="border-none shadow-sm bg-white/50">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Clock className="w-6 h-6" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Attendance Status</p>
                <p className="font-bold text-slate-900">Marked for Today</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-white/50">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-600">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Active Branch</p>
                <p className="font-bold text-slate-900">Assigned & Ready</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <>
      {overrideBranchId && (
        <div className="mb-6 p-4 bg-blue-600 rounded-3xl flex items-center justify-between shadow-lg shadow-blue-600/20 animate-in slide-in-from-top duration-500">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest">Superadmin Mode</p>
              <p className="font-bold text-white">Viewing {overrideBranchName || 'Specific Branch'} Dashboard</p>
            </div>
          </div>
          <button 
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-white text-blue-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-50 transition-all"
          >
            Exit View
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-outfit text-slate-900">
            {overrideBranchName ? `${overrideBranchName} Overview` : "Dashboard Overview"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Welcome back, {user?.name}. Here's what's happening today.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex flex-wrap items-center gap-1.5 bg-white border border-slate-200/60 p-1.5 rounded-2xl shadow-sm w-full sm:w-auto">
            {/* Category Select */}
            <div className="flex items-center gap-1 hover:bg-slate-50 rounded-xl transition-all group">
              <select 
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedSubcategory(""); 
                }}
                className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest pl-3 pr-2 py-2 outline-none cursor-pointer min-w-[120px] text-slate-700"
              >
                <option value="">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.category_name}>{c.category_name}</option>)}
              </select>
            </div>

            <div className="w-px h-4 bg-slate-200" />

            {/* Subcategory Select */}
            <div className="flex items-center gap-1 hover:bg-slate-50 rounded-xl transition-all group">
              <select 
                value={selectedSubcategory}
                onChange={(e) => setSelectedSubcategory(e.target.value)}
                disabled={!selectedCategory}
                className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest pl-3 pr-2 py-2 outline-none cursor-pointer min-w-[130px] disabled:opacity-30 text-slate-700"
              >
                <option value="">All Subcategories</option>
                {(() => {
                  const cat = categories.find(c => c.category_name === selectedCategory);
                  if (!cat) return null;
                  try {
                    const subs = Array.isArray(cat.subcategories) ? cat.subcategories : JSON.parse(cat.subcategories || "[]");
                    return subs.map((s: string) => <option key={s} value={s}>{s}</option>);
                  } catch (e) { return null; }
                })()}
              </select>
            </div>

            <div className="w-px h-4 bg-slate-200" />

            {/* Source Select */}
            <div className="flex items-center gap-1 hover:bg-slate-50 rounded-xl transition-all group">
              <select 
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest pl-3 pr-2 py-2 outline-none cursor-pointer min-w-[130px] text-slate-700"
              >
                <option value="all">Combined Source</option>
                <option value="weighbridge">Weighbridge Only</option>
                <option value="small_scale">Small Scale Only</option>
              </select>
            </div>

            <div className="w-px h-4 bg-slate-200" />

            {/* Date Range Group */}
            <div className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-xl transition-all">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">From</span>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent border-none text-[10px] font-black uppercase outline-none cursor-pointer text-slate-700 hover:text-primary transition-colors"
                />
              </div>
              <div className="w-px h-3 bg-slate-100" />
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">To</span>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent border-none text-[10px] font-black uppercase outline-none cursor-pointer text-slate-700 hover:text-primary transition-colors"
                />
              </div>
            </div>

            <div className="w-px h-4 bg-slate-200" />

            {/* Clear Button */}
            <button 
              onClick={clearFilters}
              className="group flex items-center gap-2 px-3 py-2 hover:bg-red-50 rounded-xl transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-500 transition-colors" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-red-600 transition-colors">Clear</span>
            </button>
          </div>
          {/* <button className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-primary/20">
            Export Report
          </button> */}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi) => (
          <Card 
            key={kpi.title} 
            className={cn(
              "border-none shadow-sm hover:shadow-md transition-all group",
              kpi.clickable && "cursor-pointer active:scale-95"
            )}
            onClick={kpi.onClick}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className={cn("p-2.5 rounded-2xl transition-transform group-hover:scale-110 duration-300", kpi.bgColor)}>
                  <kpi.icon className={cn("w-5 h-5", kpi.color)} />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{kpi.title}</p>
                <h3 className="text-xl xl:text-2xl font-black mt-1 font-outfit text-slate-900 tracking-tighter truncate" title={kpi.value as string}>{kpi.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Average Rate Trend */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="font-outfit text-xl font-black text-slate-900">Avg Purchase Rate Trend</CardTitle>
            <CardDescription className="text-xs font-medium">Daily average rates across categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <AreaChart data={data?.avgRateTrend || []}>
                  <defs>
                    <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 800 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 800 }}
                    tickFormatter={(value) => `₹${value}`}
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="p-3 bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-200/50">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
                            <p className="text-sm font-black text-slate-900">₹{Number(payload[0].value || 0).toLocaleString()}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="rate" 
                    stroke="#8b5cf6" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorRate)"
                    dot={{ r: 4, fill: "#8b5cf6", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Purchase Trend */}
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
            <div>
              <CardTitle className="font-outfit text-xl font-black text-slate-900">Purchase Trend</CardTitle>
              <CardDescription className="text-xs font-medium">Daily volume for the last 7 days</CardDescription>
            </div>
            <button className="p-2 hover:bg-muted rounded-xl transition-all border border-border/50">
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] sm:h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 800 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 800 }}
                    tickFormatter={(value) => `${value} Qtl`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "#fff", 
                      borderRadius: "16px", 
                      border: "1px solid #f1f5f9",
                      boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)",
                      fontSize: "12px",
                      fontWeight: "bold"
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="purchase" 
                    stroke="#b45309" 
                    strokeWidth={4} 
                    dot={{ r: 4, fill: "#b45309", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Category Distribution */}
        <Card className="border-none shadow-sm relative group">
          <CardHeader className="pb-2">
            <CardTitle className="font-outfit text-xl font-black text-slate-900">Category Distribution</CardTitle>
            <CardDescription className="text-xs font-medium uppercase tracking-tight text-slate-400">Purchased volume share</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full relative">
              {categoryData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={105}
                        paddingAngle={8}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={6}
                      >
                        {categoryData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Volume</span>
                    <span className="text-2xl font-black text-slate-900 font-outfit">
                      {categoryData.reduce((acc: number, curr: any) => acc + curr.value, 0).toFixed(2)}
                    </span>
                    <span className="text-[10px] font-black text-slate-400 uppercase">Quintals</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2 opacity-30">
                  <Package className="w-10 h-10 text-slate-300" />
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">No data for period</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
              {categoryData.map((item: any, index: number) => (
                <div key={item.name} className="flex flex-col gap-1 p-3 rounded-2xl bg-slate-50/50 border border-slate-100/50 hover:bg-white hover:shadow-md hover:border-transparent transition-all">
                  <div className="flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                     <span className="text-[10px] font-black text-slate-500 uppercase truncate">{item.name}</span>
                  </div>
                  <span className="font-black text-sm text-slate-900">{Number(item.value || 0).toFixed(2)} Qtl</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Source Distribution */}
        <Card className="border-none shadow-sm relative">
          <CardHeader className="pb-2">
            <CardTitle className="font-outfit text-xl font-black text-slate-900">Source Contribution</CardTitle>
            <CardDescription className="text-xs font-medium uppercase tracking-tight text-slate-400">WB vs Small Scale Volume</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full relative">
              {sourceData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <PieChart>
                      <Pie
                        data={sourceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={105}
                        paddingAngle={10}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={6}
                      >
                        <Cell fill="#0369a1" />
                        <Cell fill="#b45309" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Intake</span>
                    <span className="text-2xl font-black text-slate-900 font-outfit">
                      {sourceData.reduce((acc: number, curr: any) => acc + curr.value, 0).toFixed(2)}
                    </span>
                    <span className="text-[10px] font-black text-slate-400 uppercase">Quintals</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2 opacity-30">
                  <Scale className="w-10 h-10 text-slate-300" />
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">No data for period</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6">
              {sourceData.map((item: any, index: number) => (
                <div key={item.name} className="flex flex-col gap-1 p-4 rounded-2xl bg-slate-50/50 border border-slate-100/50 hover:bg-white hover:shadow-md transition-all">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.name === 'Weighbridge' ? "#0369a1" : "#b45309" }} />
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{item.name}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-black text-lg text-slate-900">{Number(item.value || 0).toFixed(2)}</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase">Qtl</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions Table */}
      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 pb-6">
          <div>
            <CardTitle className="font-outfit text-xl font-black text-slate-900">Recent Slips</CardTitle>
            <CardDescription className="text-xs font-medium">Latest entries across the network</CardDescription>
          </div>
          <button className="text-[10px] font-black text-primary hover:underline uppercase tracking-widest bg-primary/10 px-3 py-1.5 rounded-full transition-all">View All</button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 uppercase text-[10px] font-black tracking-widest border-b border-slate-100">
                  <th className="text-left py-4 px-6">Slip #</th>
                  <th className="text-left py-4 px-6">Farmer</th>
                  {user?.role === 'superadmin' && <th className="text-left py-4 px-6">Branch</th>}
                  <th className="text-left py-4 px-6">Category</th>
                  <th className="text-left py-4 px-6">Net Weight</th>
                  <th className="text-left py-4 px-6">Status</th>
                  <th className="text-right py-4 px-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentSlips.length > 0 ? (
                  recentSlips.map((slip: any) => (
                    <tr key={slip.id} className="hover:bg-slate-50/30 transition-colors group">
                      <td className="py-4 px-6 font-black text-primary text-xs tracking-tighter">{slip.slip_no}</td>
                      <td className="py-4 px-6">
                        <p className="font-black text-slate-900 text-xs">{slip.farmer_name || 'N/A'}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{slip.farmer_village || 'N/A'}</p>
                      </td>
                      {user?.role === 'superadmin' && (
                        <td className="py-4 px-6">
                          <span className="font-bold text-slate-600 text-xs">{slip.branch_name || 'Global'}</span>
                        </td>
                      )}
                      <td className="py-4 px-6">
                        <span className="px-2 py-1 bg-slate-100 rounded-md text-[10px] font-black text-slate-600 uppercase tracking-tighter">
                          {slip.grain_category}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-mono font-black text-slate-700 text-xs">{(Number(slip.net_weight || 0) / 100).toFixed(3)} Qtl</td>
                      <td className="py-4 px-6">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                          slip.status === "PENDING" ? "bg-amber-100 text-amber-700" : 
                          slip.status === "APPROVED" ? "bg-green-100 text-green-700" :
                          "bg-red-100 text-red-700"
                        )}>
                          {slip.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button className="p-2 hover:bg-slate-100 rounded-xl transition-all border border-transparent hover:border-slate-200">
                          <MoreVertical className="w-4 h-4 text-slate-400" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-muted-foreground font-black uppercase text-xs tracking-widest opacity-50">
                      No records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Stock Breakdown Modal */}
      {isStockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">
              <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                 <div className="flex items-center gap-3">
                    {isSubView && (
                      <button 
                        onClick={() => {
                          if (stockModalMode === 'lifetime') {
                            setDrillDownData(data?.lifetimeCategorySplit || []);
                            setDrillDownTitle("Lifetime Category Wise Stock");
                          } else {
                            setDrillDownData(data?.categorySplit || []);
                            setDrillDownTitle("Category Wise Stock");
                          }
                          setIsSubView(false);
                        }}
                        className="p-2 hover:bg-slate-200 rounded-full transition-all"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                    )}
                    <div>
                       <h2 className="text-xl font-black font-outfit text-slate-900">{drillDownTitle}</h2>
                       <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                         {isSubView ? "Click back to see categories" : "Select a category to see subcategories"}
                       </p>
                    </div>
                 </div>
                 <button 
                   onClick={() => setIsStockModalOpen(false)}
                   className="p-2 hover:bg-slate-200 rounded-full transition-all"
                 >
                    <X className="w-5 h-5" />
                 </button>
              </div>

              <div className="p-6 max-h-[60vh] overflow-y-auto">
                 {drillDownLoading ? (
                   <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Loading Details...</p>
                   </div>
                 ) : (
                   <div className="grid grid-cols-1 gap-3">
                      {drillDownData.map((item, index) => (
                        <div 
                          key={item.name}
                          onClick={() => !isSubView && fetchSubcategoryStock(item.name)}
                          className={cn(
                            "group p-4 rounded-2xl border border-slate-100 hover:border-primary/20 hover:bg-primary/5 transition-all",
                            !isSubView ? "cursor-pointer" : "cursor-default"
                          )}
                        >
                           <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs" style={{ backgroundColor: `${COLORS[index % COLORS.length]}15`, color: COLORS[index % COLORS.length] }}>
                                    {item.name.substring(0, 2).toUpperCase()}
                                 </div>
                                 <div>
                                    <p className="text-sm font-black text-slate-900">{item.name}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                                      {isSubView ? "Subcategory Grade" : "Grain Category"}
                                    </p>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <p className="text-sm font-black text-slate-900">{Number(item.value || 0).toFixed(3)} <span className="text-[10px] opacity-50">Qtl</span></p>
                                 <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                                    <div 
                                      className="h-full rounded-full transition-all duration-1000" 
                                      style={{ 
                                        backgroundColor: COLORS[index % COLORS.length],
                                        width: `${Math.min((item.value / ((stockModalMode === 'lifetime' ? data?.kpis?.lifetimeStock : data?.kpis?.totalStock) || 1)) * 100, 100)}%`
                                      }} 
                                    />
                                 </div>
                              </div>
                           </div>
                        </div>
                      ))}
                      {drillDownData.length === 0 && (
                        <div className="py-20 text-center">
                           <p className="text-xs font-black text-muted-foreground uppercase tracking-widest opacity-30">No data found</p>
                        </div>
                      )}
                   </div>
                 )}
              </div>
              
              <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
                 <div className="text-left">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Net Stock</p>
                    <p className="text-lg font-black text-slate-900">{Number((stockModalMode === 'lifetime' ? data?.kpis?.lifetimeStock : data?.kpis?.totalStock) || 0).toFixed(3)} Qtl</p>
                 </div>
                 <button 
                   onClick={() => setIsStockModalOpen(false)}
                   className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
                 >
                   Close Breakdown
                 </button>
              </div>
           </div>
        </div>
      )}
      {/* Price Breakdown Modal */}
      {isPriceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">
              <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                 <div className="flex items-center gap-3">
                    {isSubView && (
                      <button 
                        onClick={() => {
                          setDrillDownData(data?.avgRateSplit || []);
                          setDrillDownTitle("Category Wise Avg Rate");
                          setIsSubView(false);
                        }}
                        className="p-2 hover:bg-slate-200 rounded-full transition-all"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                    )}
                    <div>
                       <h2 className="text-xl font-black font-outfit text-slate-900">{drillDownTitle}</h2>
                       <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                         {isSubView ? "Subcategory breakdown" : "Category breakdown"}
                       </p>
                    </div>
                 </div>
                 <button 
                   onClick={() => setIsPriceModalOpen(false)}
                   className="p-2 hover:bg-slate-200 rounded-full transition-all"
                 >
                    <X className="w-5 h-5" />
                 </button>
              </div>

              <div className="p-6 max-h-[60vh] overflow-y-auto">
                 {drillDownLoading ? (
                   <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Loading details...</p>
                   </div>
                 ) : (
                   <div className="grid grid-cols-1 gap-3">
                      {drillDownData.map((item, index) => (
                        <div 
                          key={item.name}
                          onClick={() => !isSubView && fetchSubcategoryStock(item.name, 'price')}
                          className={cn(
                            "group p-4 rounded-2xl border border-slate-100 hover:border-primary/20 hover:bg-primary/5 transition-all",
                            !isSubView ? "cursor-pointer" : "cursor-default"
                          )}
                        >
                           <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs" style={{ backgroundColor: `${COLORS[index % COLORS.length]}15`, color: COLORS[index % COLORS.length] }}>
                                    ₹
                                 </div>
                                 <div>
                                    <p className="text-sm font-black text-slate-900">{item.name}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                                      {isSubView ? "Subcategory Grade" : "Grain Category"}
                                    </p>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <p className="text-sm font-black text-slate-900">₹{Number(item.value || 0).toLocaleString()}</p>
                                 <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Avg Price / Qtl</p>
                              </div>
                           </div>
                        </div>
                      ))}
                      {drillDownData.length === 0 && (
                        <div className="py-20 text-center">
                           <p className="text-xs font-black text-muted-foreground uppercase tracking-widest opacity-30">No data found</p>
                        </div>
                      )}
                   </div>
                 )}
              </div>
              
              <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
                 <div className="text-left">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Global Avg Rate</p>
                    <p className="text-lg font-black text-slate-900">₹{Number(data?.kpis?.avgPurchaseRate || 0).toLocaleString()}</p>
                 </div>
                 <button 
                   onClick={() => setIsPriceModalOpen(false)}
                   className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
                 >
                   Close
                 </button>
              </div>
           </div>
        </div>
      )}
      {/* Purchase Breakdown Modal */}
      {isPurchaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">
              <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                 <div className="flex items-center gap-3">
                    {isSubView && (
                      <button 
                        onClick={() => {
                          setDrillDownData(data?.purchaseSplit || []);
                          setDrillDownTitle("Category Wise Purchase Value");
                          setIsSubView(false);
                        }}
                        className="p-2 hover:bg-slate-200 rounded-full transition-all"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                    )}
                    <div>
                       <h2 className="text-xl font-black font-outfit text-slate-900">{drillDownTitle}</h2>
                       <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                         {isSubView ? "Subcategory breakdown" : "Select a category to see subcategories"}
                       </p>
                    </div>
                 </div>
                 <button 
                   onClick={() => setIsPurchaseModalOpen(false)}
                   className="p-2 hover:bg-slate-200 rounded-full transition-all"
                 >
                    <X className="w-5 h-5" />
                 </button>
              </div>

              <div className="p-6 max-h-[60vh] overflow-y-auto">
                 {drillDownLoading ? (
                   <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Loading Details...</p>
                   </div>
                 ) : (
                   <div className="grid grid-cols-1 gap-3">
                      {drillDownData.map((item, index) => (
                        <div 
                          key={item.name}
                          onClick={() => !isSubView && fetchSubcategoryStock(item.name, 'purchase')}
                          className={cn(
                            "group p-4 rounded-2xl border border-slate-100 hover:border-primary/20 hover:bg-primary/5 transition-all",
                            !isSubView ? "cursor-pointer" : "cursor-default"
                          )}
                        >
                           <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs" style={{ backgroundColor: `${COLORS[index % COLORS.length]}15`, color: COLORS[index % COLORS.length] }}>
                                    {item.name.substring(0, 2).toUpperCase()}
                                 </div>
                                 <div>
                                    <p className="text-sm font-black text-slate-900">{item.name}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                                      {isSubView ? "Subcategory Grade" : "Grain Category"}
                                    </p>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <p className="text-sm font-black text-slate-900">{formatCurrency(item.value || 0)}</p>
                                 <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                                    <div 
                                      className="h-full rounded-full transition-all duration-1000" 
                                      style={{ 
                                        backgroundColor: COLORS[index % COLORS.length],
                                        width: `${Math.min((item.value / (data?.kpis?.todayPurchase || 1)) * 100, 100)}%`
                                      }} 
                                    />
                                 </div>
                              </div>
                           </div>
                        </div>
                      ))}
                      {drillDownData.length === 0 && (
                        <div className="py-20 text-center">
                           <p className="text-xs font-black text-muted-foreground uppercase tracking-widest opacity-30">No data found</p>
                        </div>
                      )}
                   </div>
                 )}
              </div>
              
              <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
                 <div className="text-left">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Purchase</p>
                    <p className="text-lg font-black text-slate-900">{formatCurrency(data?.kpis?.todayPurchase || 0)}</p>
                 </div>
                 <button 
                   onClick={() => setIsPurchaseModalOpen(false)}
                   className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
                 >
                   Close Breakdown
                 </button>
              </div>
           </div>
        </div>
      )}
    </>
  );
}

