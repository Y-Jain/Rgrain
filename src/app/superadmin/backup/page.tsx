"use client";

import React from "react";
import SuperAdminLayout from "@/components/layout/SuperAdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Database, Download, History, RefreshCw, ShieldCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function BackupPage() {
  const handleBackup = () => {
    toast.promise(new Promise(res => setTimeout(res, 2000)), {
      loading: 'Preparing system-wide snapshot...',
      success: 'Database backup archived and ready for download.',
      error: 'Backup failed due to storage limits.',
    });
  };

  return (
    <SuperAdminLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-outfit">Backup & Recovery</h1>
          <p className="text-slate-500">Secure your enterprise data with manual and automated backups.</p>
        </div>
        <button 
          onClick={handleBackup}
          className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-xl"
        >
          <Database className="w-4 h-4" />
          Trigger Manual Backup
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="md:col-span-1 border-none shadow-sm">
          <CardHeader>
             <CardTitle>System Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="flex items-center gap-4 p-4 bg-green-50 rounded-2xl border border-green-100">
                <ShieldCheck className="w-10 h-10 text-green-600" />
                <div>
                   <p className="text-sm font-bold text-green-900">Encrypted Storage</p>
                   <p className="text-xs text-green-700">All backups are AES-256 encrypted.</p>
                </div>
             </div>
             <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-400">
                   <span>Storage Used</span>
                   <span>142 GB / 500 GB</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                   <div className="h-full bg-blue-600 rounded-full" style={{ width: '28%' }} />
                </div>
             </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-none shadow-sm">
          <CardHeader>
             <CardTitle>Backup History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black tracking-widest border-b border-slate-100">
                   <tr>
                      <th className="text-left py-4 px-6">Timestamp</th>
                      <th className="text-left py-4 px-6">Size</th>
                      <th className="text-left py-4 px-6">Type</th>
                      <th className="text-left py-4 px-6">Status</th>
                      <th className="text-right py-4 px-6">Action</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                   {[1, 2, 3].map(i => (
                     <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-6 font-bold text-slate-700">22 APR 2024, 02:00 AM</td>
                        <td className="py-4 px-6 text-slate-500">1.2 GB</td>
                        <td className="py-4 px-6"><span className="text-[10px] font-black text-blue-600 uppercase">Automated</span></td>
                        <td className="py-4 px-6"><span className="text-[10px] font-black text-green-600 uppercase">Success</span></td>
                        <td className="py-4 px-6 text-right">
                           <button 
                             onClick={() => toast.success(`Downloading backup archive from 22 APR 2024...`)}
                             className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"
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
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex gap-4">
         <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
         <div>
            <p className="text-sm font-bold text-amber-900">Restoration Warning</p>
            <p className="text-xs text-amber-800 leading-relaxed">
               Restoring from a backup will overwrite all current system data across all branches. This action is irreversible and should only be performed under expert supervision.
            </p>
         </div>
      </div>
    </SuperAdminLayout>
  );
}
