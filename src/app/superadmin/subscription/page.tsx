"use client";

import React from "react";
import SuperAdminLayout from "@/components/layout/SuperAdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { CreditCard, CheckCircle2, Download, History, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function SubscriptionPage() {
  return (
    <SuperAdminLayout>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-outfit">Subscription & Billing</h1>
        <p className="text-slate-500">Manage your enterprise plan and view billing history.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 border-none shadow-sm">
          <CardHeader>
            <CardTitle>Current Plan: Enterprise Pro</CardTitle>
            <CardDescription>Renewing on June 15, 2024</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs font-bold text-blue-600 uppercase">Branches Used</p>
                <p className="text-2xl font-black text-blue-900">12 / 20</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                <p className="text-xs font-bold text-purple-600 uppercase">Total Users</p>
                <p className="text-2xl font-black text-purple-900">84 / 150</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-900">Included Features:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  "Unlimited Multi-Branch Support",
                  "Advanced Inventory Analytics",
                  "White-label Branding",
                  "Full API Access",
                  "Priority 24/7 Support",
                  "Weekly System Backups"
                ].map(f => (
                  <div key={f} className="flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 text-white border-none shadow-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full -mr-16 -mt-16 blur-3xl" />
          <CardHeader>
             <CardTitle className="text-white">Quick Upgrade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <p className="text-sm text-slate-400">Scale your grain business with our Ultimate Plan.</p>
             <div className="text-3xl font-black text-primary">₹49,999<span className="text-sm font-normal text-slate-500">/year</span></div>
             <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2">
               <Zap className="w-4 h-4" />
               Go Ultimate
             </button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
           <table className="w-full text-sm">
             <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black tracking-widest border-b border-slate-100">
                <tr>
                  <th className="text-left py-4 px-6">Invoice #</th>
                  <th className="text-left py-4 px-6">Date</th>
                  <th className="text-left py-4 px-6">Amount</th>
                  <th className="text-left py-4 px-6">Status</th>
                  <th className="text-right py-4 px-6">Action</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-50">
                {[1, 2, 3].map(i => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-900">INV-2024-00{i}</td>
                    <td className="py-4 px-6 text-slate-500">15 {i === 1 ? 'Jan' : i === 2 ? 'Feb' : 'Mar'} 2024</td>
                    <td className="py-4 px-6 font-bold text-slate-700">₹24,999</td>
                    <td className="py-4 px-6"><span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-bold">PAID</span></td>
                    <td className="py-4 px-6 text-right">
                       <button 
                         onClick={() => toast.success(`Downloading Invoice INV-2024-00${i}...`)}
                         className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-all"
                       >
                         <Download className="w-4 h-4" />
                       </button>
                    </td>
                  </tr>
                ))}
             </tbody>
           </table>
        </CardContent>
      </Card>
    </SuperAdminLayout>
  );
}
