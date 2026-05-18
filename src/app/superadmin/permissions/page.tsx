"use client";

import React from "react";
import SuperAdminLayout from "@/components/layout/SuperAdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { FileLock2, Plus, Shield, Search, CheckCircle2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const globalTemplates = [
  { name: "Senior Manager", users: 12, modules: ["Approvals", "Financials", "Reports", "Staff Mgmt"] },
  { name: "Weighman Pro", users: 45, modules: ["Weighbridge", "Small Scale", "Vehicle Logs"] },
  { name: "Inventory Lead", users: 8, modules: ["Stock", "Warehouse", "Transfers"] },
];

export default function PermissionTemplatesPage() {
  return (
    <SuperAdminLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-outfit">Permission Templates</h1>
          <p className="text-slate-500">Define global access patterns for branch staff.</p>
        </div>
        <button 
          onClick={() => toast.info("Template creation wizard is being initialized...")}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg"
        >
          <Plus className="w-4 h-4" />
          Create Template
        </button>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-6">
           <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Search templates..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
           </div>
        </CardHeader>
        <CardContent className="p-0">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 divide-x divide-y divide-slate-100">
              {globalTemplates.map(tmpl => (
                <div key={tmpl.name} className="p-6 hover:bg-slate-50 transition-all group cursor-pointer">
                   <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                         <Shield className="w-6 h-6 text-blue-600" />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{tmpl.users} Active Users</span>
                   </div>
                   <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-all">{tmpl.name}</h3>
                   <div className="flex flex-wrap gap-1.5 mt-4">
                      {tmpl.modules.map(mod => (
                        <span key={mod} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-bold text-slate-500 uppercase tracking-tight">
                           {mod}
                        </span>
                      ))}
                   </div>
                   <div className="mt-6 flex items-center justify-between">
                      <button 
                        onClick={() => toast.info(`Configuring logic for ${tmpl.name} template...`)}
                        className="text-[10px] font-black uppercase tracking-widest text-blue-600"
                      >
                        Configure Logic
                      </button>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                   </div>
                </div>
              ))}
           </div>
        </CardContent>
      </Card>
    </SuperAdminLayout>
  );
}
