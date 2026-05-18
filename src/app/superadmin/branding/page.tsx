"use client";

import React, { useState } from "react";
import SuperAdminLayout from "@/components/layout/SuperAdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { 
  Palette, 
  Upload, 
  Eye, 
  Save, 
  Building2, 
  FileText, 
  Printer, 
  MapPin, 
  Globe,
  Info,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function BrandingPage() {
  const [brandColor, setBrandColor] = useState("#b45309"); // Grain Amber
  const [companyName, setCompanyName] = useState("Premium Grain Solutions");
  const [tagline, setTagline] = useState("Empowering Modern Agriculture");
  const [address, setAddress] = useState("123, Mandi Road, Industrial Area, Karnal - 132001");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success("Branding settings saved and applied system-wide.");
    }, 1000);
  };

  return (
    <SuperAdminLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-outfit">Company Branding</h1>
          <p className="text-slate-500">Customize the portal identity and print document headers.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
        >
          {isSaving ? "Saving..." : <><Save className="w-4 h-4" /> Save Branding</>}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Settings Panel */}
        <div className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Visual Identity</CardTitle>
              <CardDescription>Upload logos and set primary colors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Logo Upload */}
                <div className="space-y-4">
                  <label className="text-sm font-bold text-slate-700">Company Logo</label>
                  <div 
                    onClick={() => toast.info("Logo upload interface is being prepared...")}
                    className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 bg-slate-50/50 hover:bg-slate-50 transition-all cursor-pointer group"
                  >
                    <div className="w-16 h-16 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-blue-500 group-hover:border-blue-200 transition-all">
                      <Upload className="w-8 h-8" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-slate-600">Click to upload logo</p>
                      <p className="text-[10px] text-slate-400 mt-1">PNG, SVG up to 2MB (Recommended 256x256)</p>
                    </div>
                  </div>
                </div>

                {/* Brand Color */}
                <div className="space-y-4">
                  <label className="text-sm font-bold text-slate-700">Primary Brand Color</label>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl shadow-inner border border-slate-200" style={{ backgroundColor: brandColor }} />
                      <input 
                        type="text" 
                        value={brandColor} 
                        onChange={(e) => setBrandColor(e.target.value)}
                        className="flex-1 px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl font-mono text-sm uppercase font-bold"
                      />
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {["#b45309", "#166534", "#0369a1", "#be123c", "#334155"].map(c => (
                        <button 
                          key={c}
                          onClick={() => setBrandColor(c)}
                          className={cn(
                            "h-8 rounded-lg border-2 transition-all",
                            brandColor === c ? "border-blue-500 scale-110 shadow-md" : "border-transparent"
                          )}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* Company Info */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Company Name</label>
                    <input 
                      type="text" 
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Tagline</label>
                    <input 
                      type="text" 
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Registered Office Address</label>
                  <textarea 
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex gap-4">
            <Info className="w-6 h-6 text-blue-600 shrink-0 mt-1" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-blue-900">Branding Inheritance</p>
              <p className="text-xs text-blue-700 leading-relaxed">
                These settings will be inherited by all branches. Changes take effect immediately on all printed slips, report headers, and dashboard accents across the entire organization.
              </p>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-5 h-5 text-slate-400" />
            <h3 className="text-lg font-bold text-slate-900 font-outfit">Live Preview</h3>
          </div>

          {/* Slip Preview */}
          <Card className="border-none shadow-xl overflow-hidden bg-white max-w-md mx-auto transform hover:scale-[1.02] transition-transform">
            <div className="p-1 text-center text-[8px] font-bold uppercase tracking-[0.2em] text-white" style={{ backgroundColor: brandColor }}>
              Weighbridge Slip Preview
            </div>
            <CardContent className="p-8">
              {/* Slip Header */}
              <div className="flex flex-col items-center text-center space-y-2 mb-8">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: brandColor }}>
                  <Building2 className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 font-outfit uppercase tracking-tight">{companyName}</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{tagline}</p>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] text-slate-400 max-w-[200px]">
                  <MapPin className="w-3 h-3 shrink-0" />
                  {address}
                </div>
              </div>

              {/* Slip Body Mock */}
              <div className="space-y-4 border-y border-dashed border-slate-200 py-6">
                <div className="flex justify-between text-[10px]">
                  <span className="font-bold text-slate-400 uppercase">Slip Number</span>
                  <span className="font-black text-slate-900">#GP-SLIP-8842</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="font-bold text-slate-400 uppercase">Date/Time</span>
                  <span className="font-black text-slate-900">22 APR 2024 | 14:30</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="font-bold text-slate-400 uppercase">Net Weight</span>
                  <span className="font-black text-slate-900 text-sm">4.250 MT</span>
                </div>
              </div>

              <div className="mt-8 flex justify-center">
                <div className="w-24 h-24 bg-slate-50 border border-slate-100 rounded flex items-center justify-center text-slate-300">
                  <Printer className="w-10 h-10 opacity-20" />
                </div>
              </div>
            </CardContent>
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-center gap-2">
               <CheckCircle2 className="w-4 h-4 text-green-500" />
               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Print Layout Verified</span>
            </div>
          </Card>

          {/* Report Header Preview */}
          <Card className="border-none shadow-md overflow-hidden bg-white">
            <div className="h-1" style={{ backgroundColor: brandColor }} />
            <CardContent className="p-6">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: brandColor }}>
                      <Building2 className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-black text-slate-900">{companyName}</span>
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 text-right">
                    <p>Financial Statement 2023-24</p>
                    <p>Internal Audit Report</p>
                  </div>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
