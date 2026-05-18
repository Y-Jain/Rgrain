"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { BarChart3, FileText, Download, Filter, Calendar } from "lucide-react";

const reportCategories = [
  { name: "Operational Reports", items: ["Slip Report", "Weight Report", "Vehicle Report"] },
  { name: "Staff & Activity", items: ["Staff Activity Log", "Pending Approval Report"] },
  { name: "Inventory Reports", items: ["Daily Stock Report", "Godown Utilization"] },
  { name: "Financial Reports", items: ["Farmer Statement", "Top Farmer Report", "Payment Summary"] },
];

export default function ReportsPage() {
  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-outfit">Reporting Center</h1>
          <p className="text-muted-foreground">Generate and export detailed branch-level reports.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {reportCategories.map((cat) => (
          <Card key={cat.name} className="border-none shadow-sm">
            <CardHeader className="pb-4">
               <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">{cat.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
               {cat.items.map(item => (
                 <div key={item} className="group flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-all cursor-pointer">
                    <div className="flex items-center gap-3">
                       <FileText className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                       <span className="text-sm font-medium text-slate-700 group-hover:text-primary transition-colors">{item}</span>
                    </div>
                    <Download className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                 </div>
               ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
         <CardHeader className="bg-slate-900 text-white pb-8 pt-8">
            <div className="flex items-center justify-between">
               <div>
                  <CardTitle className="text-white">Quick Export: Daily Summary</CardTitle>
                  <CardDescription className="text-slate-400">Generate a comprehensive PDF of today's activities.</CardDescription>
               </div>
               <button className="bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Download Today's Report
               </button>
            </div>
         </CardHeader>
         <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Select Date Range</label>
                  <div className="relative">
                     <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                     <input type="text" value="Last 7 Days" readOnly className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-xl text-sm font-bold outline-none" />
                  </div>
               </div>
               <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Export Format</label>
                  <div className="flex gap-2">
                     <button className="flex-1 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold">XLSX</button>
                     <button className="flex-1 py-2 bg-primary text-white rounded-xl text-xs font-bold">PDF</button>
                     <button className="flex-1 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold">CSV</button>
                  </div>
               </div>
               <div className="flex items-end">
                  <button className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                     <Filter className="w-4 h-4" />
                     Run Custom Report
                  </button>
               </div>
            </div>
         </CardContent>
      </Card>
    </>
  );
}
