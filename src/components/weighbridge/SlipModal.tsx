"use client";

import React, { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Printer, X, Download, Share2, Scale, Truck, User, Box } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";

interface SlipModalProps {
  slip: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function SlipModal({ slip, isOpen, onClose }: SlipModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: `Slip-${slip?.slip_no || 'Unknown'}`,
  });

  if (!isOpen || !slip) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl sm:rounded-[2.5rem] shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[98vh] sm:max-h-[95vh] border border-white/20">
        {/* Header */}
        <div className="px-4 sm:px-10 py-4 sm:py-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner shrink-0">
              <Printer className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-black text-gray-900 tracking-tight uppercase">Document Preview</h2>
              <p className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">Digital Weighbridge Slip • {slip.slip_no}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-gray-100 rounded-2xl transition-all text-gray-400 hover:text-gray-900 hover:rotate-90 duration-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-10 bg-slate-50/50">
          {/* Printable Area */}
          <div 
            ref={contentRef}
            className="bg-white p-4 sm:p-12 shadow-2xl border border-gray-100 rounded-2xl sm:rounded-[2rem] mx-auto max-w-[210mm] print:shadow-none print:border-none print:p-0 print:m-0"
          >
            {/* Slip Header - Branding */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8 sm:mb-12 pb-6 sm:pb-8 border-b-4 border-slate-900">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
                    <Scale className="w-6 h-6 text-white" />
                  </div>
                  <h1 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">RGrain</h1>
                </div>
                <p className="text-[10px] text-slate-500 font-black tracking-[0.3em] uppercase">Premium Agriculture Solutions</p>
                <div className="text-[9px] text-slate-400 font-bold uppercase leading-tight">
                  {/* <p>123 Mandi Road, Karnal, Haryana</p> */}
                  <p>Contact: +91 9098567944 | info@renixsolution.com</p>
                </div>
              </div>
              <div className="text-left sm:text-right space-y-2 w-full sm:w-auto">
                <div className="bg-slate-900 text-white px-5 py-2 rounded-xl text-xl font-black inline-block shadow-lg">
                  SLIP #{slip.serial_number || slip.slip_no.split('-')[1]}
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(slip.created_at).toLocaleString()}</p>
                <div className={cn(
                  "text-[9px] font-black px-3 py-1 rounded-full border inline-block uppercase tracking-widest",
                  slip.entry_type === 'OUT' ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"
                )}>
                  {slip.entry_type === 'OUT' ? 'Dispatch (OUT)' : 'Procurement (IN)'}
                </div>
              </div>
            </div>

            {/* Slip Body */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-16 mb-8 sm:mb-12">
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-400">
                    <User className="w-4 h-4" />
                    <span className="text-[10px] uppercase font-black tracking-widest">Party Details</span>
                  </div>
                  <div className="pl-6 border-l-2 border-slate-100">
                    <p className="text-xl font-black text-slate-900 uppercase">{slip.farmer_name || 'Walk-in Party'}</p>
                    <div className="flex gap-4 items-center">
                       <p className="text-sm font-bold text-slate-500">{slip.farmer_mobile || 'No Mobile'}</p>
                       {slip.address && <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-l pl-4 border-slate-200">{slip.address}</p>}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Truck className="w-4 h-4" />
                    <span className="text-[10px] uppercase font-black tracking-widest">Logistics</span>
                  </div>
                  <div className="pl-6 border-l-2 border-slate-100">
                    <p className="text-xl font-black text-slate-900 tracking-widest uppercase">{slip.vehicle_no}</p>
                    <div className="flex gap-4 mt-1">
                      <p className="text-xs font-bold text-slate-500 uppercase">{slip.vehicle_type || 'N/A'}</p>
                      <p className="text-xs font-bold text-slate-400 uppercase">Driver: {slip.driver_name || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Box className="w-4 h-4" />
                    <span className="text-[10px] uppercase font-black tracking-widest">Commodity</span>
                  </div>
                  <div className="pl-6 border-l-2 border-slate-100">
                    <p className="text-xl font-black text-slate-900 uppercase">{slip.grain_category}</p>
                    <p className="text-sm font-bold text-slate-500 uppercase">{slip.subcategory || 'Default Quality'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-50 p-8 rounded-[2rem] space-y-4 border border-slate-100">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-black uppercase tracking-widest">Gross Weight</span>
                    <span className="font-black text-slate-900">{(slip.gross_weight / 100).toFixed(2)} Qtl</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-black uppercase tracking-widest">Tare Weight</span>
                    <span className="font-black text-slate-900">{(slip.tare_weight / 100).toFixed(2)} Qtl</span>
                  </div>
                  <div className="h-px bg-slate-200" />
                  <div className="flex justify-between items-center">
                    <span className="text-slate-900 font-black uppercase tracking-widest text-xs">Net Payload</span>
                    <span className="text-2xl font-black text-slate-900">{(slip.net_weight / 100).toFixed(2)} Qtl</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 text-center">
                    <label className="text-[9px] uppercase font-black text-primary tracking-widest block mb-1">Tollkata Fee</label>
                    <p className="text-xl font-black text-primary">{formatCurrency(slip.tollkata_charges)}</p>
                  </div>
                  <div className="p-4 bg-slate-900 rounded-2xl text-center">
                    <label className="text-[9px] uppercase font-black text-white/40 tracking-widest block mb-1">Rate / Qtl</label>
                    <p className="text-xl font-black text-white">{formatCurrency(slip.rate_per_mt)}</p>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 rounded-[2rem] border-2 border-slate-900 text-center relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-20 h-20 bg-slate-900/5 rounded-full -mr-10 -mt-10" />
                  <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block mb-1">Total Transaction Value</label>
                  <p className="text-4xl font-black text-slate-900 tracking-tighter">{formatCurrency(slip.payable_amount)}</p>
                </div>
              </div>
            </div>

            {/* Signature & QR */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pt-8 sm:pt-12 border-t border-slate-100">
               <div className="col-span-1 flex flex-col justify-end">
                  <div className="text-center space-y-4">
                    <div className="h-16 flex items-center justify-center italic text-slate-300 font-serif">
                       Customer Signature
                    </div>
                    <div className="h-px bg-slate-200" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Driver / Party</p>
                  </div>
               </div>
               
               <div className="col-span-1 flex flex-col items-center justify-center space-y-3">
                  <div className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm">
                    <QRCodeSVG 
                      value={`SLIP:${slip.slip_no}|WT:${slip.net_weight}|AMT:${slip.payable_amount}`} 
                      size={100}
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-300">Scan to Verify</p>
               </div>

               <div className="col-span-1 flex flex-col justify-end">
                  <div className="text-center space-y-4">
                    <div className="h-16 flex items-center justify-center">
                       {/* Placeholder for stamp/e-signature */}
                       <div className="w-20 h-20 border-2 border-primary/20 rounded-full flex items-center justify-center border-dashed">
                          <p className="text-[8px] font-black text-primary/40 uppercase rotate-12">Authorized</p>
                       </div>
                    </div>
                    <div className="h-px bg-slate-200" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Authorized Operator</p>
                  </div>
               </div>
            </div>

            {/* Print Footer */}
            <div className="mt-12 text-center">
              <p className="text-[8px] text-slate-300 font-bold uppercase tracking-[0.3em]">Computer Generated Slip • Valid for Internal Records Only • Jashoda Grain ERP</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 sm:px-10 py-4 sm:py-6 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-4">
          <button 
            className="px-6 py-3 text-xs font-black text-slate-500 hover:bg-white hover:text-slate-900 rounded-xl flex items-center justify-center gap-2 transition-all border border-transparent hover:border-slate-200"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
          <button 
            className="px-6 py-3 text-xs font-black text-slate-500 hover:bg-white hover:text-slate-900 rounded-xl flex items-center justify-center gap-2 transition-all border border-transparent hover:border-slate-200"
          >
            <Share2 className="w-4 h-4" />
            Share Slip
          </button>
          <button 
            onClick={() => handlePrint()}
            className="px-10 py-3 bg-slate-900 text-white text-xs font-black rounded-xl flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20"
          >
            <Printer className="w-4 h-4" />
            Print Official Slip
          </button>
        </div>
      </div>
    </div>
  );
}
