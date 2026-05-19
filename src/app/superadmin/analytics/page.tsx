"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import SuperAdminLayout from "@/components/layout/SuperAdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { 
  BarChart4, 
  Building2, 
  Users, 
  Truck, 
  ArrowUpRight, 
  ArrowDownRight,
  Globe,
  Wallet,
  Calendar,
  Filter,
  Loader2
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell 
} from "recharts";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

export default function SuperAdminAnalytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/analytics/global');
      const json = await res.json();
      setData(json);
    } catch (error) {
      toast.error("Failed to load global analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const globalKpis = data?.globalKpis ? [
    { title: "Total Grain Procured", value: `${((data.globalKpis.totalWeight || 0) / 1000).toFixed(2)}k MT`, change: "+8.4%", trend: "up", icon: Globe, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Total Payments", value: `₹${((data.globalKpis.totalAmount || 0) / 10000000).toFixed(2)} Cr`, change: "+12.1%", trend: "up", icon: Wallet, color: "text-green-600", bg: "bg-green-50" },
    { title: "Active Farmers", value: (data.globalKpis.farmers || 0).toLocaleString(), change: "+240", trend: "up", icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
    { title: "Active Branches", value: (data.globalKpis.branches || 0).toString(), change: "0", trend: "neutral", icon: Building2, color: "text-slate-600", bg: "bg-slate-50" },
  ] : [
    { title: "Total Grain Procured", value: "0.00k MT", change: "0%", trend: "neutral", icon: Globe, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Total Payments", value: "₹0.00 Cr", change: "0%", trend: "neutral", icon: Wallet, color: "text-green-600", bg: "bg-green-50" },
    { title: "Active Farmers", value: "0", change: "0", trend: "neutral", icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
    { title: "Active Branches", value: "0", change: "0", trend: "neutral", icon: Building2, color: "text-slate-600", bg: "bg-slate-50" },
  ];

  const categoryDistribution = [
    { name: "Wheat", value: 45, color: "#2563eb" },
    { name: "Paddy", value: 30, color: "#16a34a" },
    { name: "Maize", value: 15, color: "#d97706" },
    { name: "Other", value: 10, color: "#64748b" },
  ];

  if (loading) {
    return (
      <SuperAdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          <p className="text-slate-500 font-bold font-outfit animate-pulse">Syncing HQ Intelligence...</p>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-outfit">Global Analytics</h1>
          <p className="text-slate-500">Cross-branch performance overview and system health.</p>
        </div>
        <div className="flex gap-3">
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all text-slate-700 shadow-sm">
            <Calendar className="w-4 h-4" />
            Last 30 Days
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20">
            <Filter className="w-4 h-4" />
            Global Filter
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {globalKpis.map((kpi) => (
          <Card key={kpi.title} className="border-none shadow-sm bg-white overflow-hidden group">
            <CardContent className="p-6 relative">
              <div className="flex items-center justify-between">
                <div className={cn("p-3 rounded-2xl transition-transform group-hover:scale-110", kpi.bg)}>
                  <kpi.icon className={cn("w-6 h-6", kpi.color)} />
                </div>
                <div className={cn(
                  "flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full",
                  kpi.trend === "up" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"
                )}>
                  {kpi.trend === "up" && <ArrowUpRight className="w-3 h-3" />}
                  {kpi.change}
                </div>
              </div>
              <div className="mt-5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{kpi.title}</p>
                <h3 className="text-3xl font-black text-slate-900 mt-1 font-outfit">{kpi.value}</h3>
              </div>
              <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-50 group-hover:bg-blue-500 transition-colors" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Branch Performance Comparison */}
        <Card className="lg:col-span-2 border-none shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Branch Procurement Ranking</CardTitle>
                <CardDescription>Procurement volume (MT) across top performing branches</CardDescription>
              </div>
              <BarChart4 className="w-5 h-5 text-slate-300" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] min-h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={data?.branchPerformance || []} layout="vertical" margin={{ left: 40, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "#64748b", fontSize: 12, fontWeight: 600 }}
                    width={100}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar 
                    dataKey="volume" 
                    fill="#2563eb" 
                    radius={[0, 8, 8, 0]} 
                    barSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* System-wide Grain Split */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Global Grain Mix</CardTitle>
            <CardDescription>Aggregation of categories across all MANDIs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] min-h-[280px] w-full relative">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={data?.categorySplit || categoryDistribution}
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {(data?.categorySplit || categoryDistribution).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color || categoryDistribution[index % categoryDistribution.length].color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-4xl font-black text-slate-900 font-outfit">{data?.categorySplit ? '100%' : 'Mix'}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Coverage</span>
              </div>
            </div>
            <div className="space-y-3 mt-6">
              {(data?.categorySplit || categoryDistribution).map((item: any, idx: number) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color || categoryDistribution[idx % categoryDistribution.length].color }} />
                    <span className="text-sm font-semibold text-slate-600">{item.name}</span>
                  </div>
                  <span className="text-sm font-black text-slate-900">{data?.categorySplit ? `${item.value}%` : item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Branches Table */}
      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl">Branch Oversight</CardTitle>
            <CardDescription>Operational health indicators per branch</CardDescription>
          </div>
          <Link href="/superadmin/branches" className="text-sm font-bold text-blue-600 hover:underline transition-all">Manage Branches</Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black tracking-widest">
                  <th className="text-left py-4 px-6">Branch Name</th>
                  <th className="text-left py-4 px-6">Live Volume</th>
                  <th className="text-left py-4 px-6">Status</th>
                  <th className="text-right py-4 px-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.branchPerformance || []).map((b: any, i: number) => (
                  <tr key={b.name} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                          {b.name.charAt(0)}
                        </div>
                        <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{b.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-slate-600">
                       {parseFloat(b.volume || 0).toLocaleString()} MT
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tight bg-green-100 text-green-700">
                        Active
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button 
                        onClick={() => toast.info(`Accessing deep-dive metrics for ${b.name}...`)}
                        className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all"
                      >
                        Deep Dive
                      </button>
                    </td>
                  </tr>
                ))}
                {(!data?.branchPerformance || data.branchPerformance.length === 0) && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400 italic">No branch data available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </SuperAdminLayout>
  );
}
