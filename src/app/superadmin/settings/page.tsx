"use client";

import React from "react";
import SuperAdminLayout from "@/components/layout/SuperAdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Settings, Bell, Shield, Smartphone, Globe, Save } from "lucide-react";
import { toast } from "sonner";

export default function MasterSettingsPage() {
  return (
    <SuperAdminLayout>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-outfit">Master Settings</h1>
        <p className="text-slate-500">System-wide configuration and feature flags.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="border-none shadow-sm">
          <CardHeader>
             <CardTitle>System Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Default Unit System</label>
                <select className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none">
                   <option>Metric (KG, MT)</option>
                   <option>Imperial (LB, TONS)</option>
                </select>
             </div>
             <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Currency Locale</label>
                <select className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none">
                   <option>INR (₹) - India</option>
                   <option>USD ($) - International</option>
                </select>
             </div>
             <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                   <Bell className="w-5 h-5 text-slate-400" />
                   <div>
                      <p className="text-sm font-bold text-slate-700">Push Notifications</p>
                      <p className="text-[10px] text-slate-400">Enable system-wide alerts</p>
                   </div>
                </div>
                <div className="w-10 h-5 bg-blue-600 rounded-full relative"><div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm" /></div>
             </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
             <CardTitle>Communication APIs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="space-y-4">
                <div className="flex items-center gap-2">
                   <Smartphone className="w-4 h-4 text-slate-400" />
                   <span className="text-xs font-bold text-slate-600 uppercase">SMS Provider (Twilio)</span>
                </div>
                <input type="password" value="••••••••••••••••" readOnly className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none" />
             </div>
             <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2">
                   <Globe className="w-4 h-4 text-slate-400" />
                   <span className="text-xs font-bold text-slate-600 uppercase">WhatsApp Gateway</span>
                </div>
                <div className="p-4 bg-green-50 border border-green-100 rounded-xl flex items-center justify-between">
                   <span className="text-xs font-bold text-green-700">CONNECTED</span>
                   <button className="text-[10px] font-black text-green-700 uppercase underline">Configure</button>
                </div>
             </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
         <button 
           onClick={() => toast.success("System settings updated successfully.")}
           className="inline-flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-xl"
         >
           <Save className="w-4 h-4" />
           Apply Changes
         </button>
      </div>
    </SuperAdminLayout>
  );
}
