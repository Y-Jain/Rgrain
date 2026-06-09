"use client";

import React, { useRef, useState } from "react";
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
  const [printFormat, setPrintFormat] = useState<'A4' | 'A5' | 'THERMAL'>('A4');

  const getWeightInQtl = (weight: number | string | undefined | null) => {
    const num = parseFloat(weight as string) || 0;
    return (num / 100).toFixed(2);
  };

  const getPageStyle = () => {
    if (printFormat === 'THERMAL') {
      return `@page { size: 80mm auto; margin: 0mm; }`;
    }
    if (printFormat === 'A5') {
      return `@page { size: A5; margin: 5mm; }`;
    }
    return `@page { size: A4; margin: 10mm; }`;
  };

  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: `Slip-${slip?.slip_no || 'Unknown'}`,
    pageStyle: getPageStyle(),
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
            className={cn(
              "bg-white mx-auto print:shadow-none print:border-none print:m-0",
              printFormat === 'A4' ? "p-4 sm:p-12 shadow-2xl border border-gray-100 rounded-2xl sm:rounded-[2rem] max-w-[210mm] print:p-0" : "",
              printFormat === 'A5' ? "p-4 sm:p-8 shadow-2xl border border-gray-100 rounded-2xl sm:rounded-[1.5rem] max-w-[148mm] print:p-0 text-sm" : "",
              printFormat === 'THERMAL' ? "p-4 max-w-[80mm] print:w-full print:p-0 font-mono text-black mx-auto" : ""
            )}
          >
            {printFormat === 'THERMAL' ? (
              <div className="flex flex-col text-[10px] leading-tight space-y-2 w-full mx-auto pb-4">
                <div className="text-center pb-2 border-b border-black border-dashed">
                  <h1 className="text-lg font-black uppercase tracking-tighter">RGrain</h1>
                  <p className="text-[8px] uppercase font-bold">Premium Agriculture Solutions</p>
                  <p className="text-[8px]">Contact: +91 7693072877</p>
                </div>
                
                <div className="pb-2 border-b border-black border-dashed text-[9px]">
                  <p><strong>SLIP:</strong> #{slip.serial_number || slip.slip_no?.split('-')[1]}</p>
                  <p><strong>DATE:</strong> {new Date(slip.created_at).toLocaleString()}</p>
                  <p><strong>TYPE:</strong> {slip.entry_type === 'OUT' ? 'Dispatch (OUT)' : 'Procurement (IN)'}</p>
                </div>

                <div className="pb-2 border-b border-black border-dashed text-[9px]">
                  <p><strong>PARTY:</strong> {slip.farmer_name || 'Walk-in Party'}</p>
                  <p><strong>MOB:</strong> {slip.farmer_mobile || 'No Mobile'}</p>
                </div>

                {slip.items && slip.items.length > 0 ? (
                  <>
                    <div className="pb-2 border-b border-black border-dashed text-[9px] space-y-2 pt-1">
                      <p className="font-bold text-center">--- ITEMS ---</p>
                      {slip.items.map((item: any, idx: number) => (
                        <div key={item.id || idx} className="space-y-0.5">
                          <p><strong>{idx + 1}. VEHICLE:</strong> {item.vehicle_no}</p>
                          <p><strong>GRAIN:</strong> {item.grain_category} ({item.subcategory || '-'})</p>
                          <div className="flex justify-between">
                            <span>NET WT: {getWeightInQtl(item.net_weight)} Qtl</span>
                            <span>RATE: {formatCurrency(item.rate_per_mt)}</span>
                          </div>
                          <div className="flex justify-between font-bold">
                            <span>TOLL: {formatCurrency(item.tollkata_charges)}</span>
                            <span>VAL: {formatCurrency((parseFloat(item.payable_amount as any) || 0) + (parseFloat(item.tollkata_charges as any) || 0))}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="pb-2 border-b border-black border-dashed space-y-1 text-[9px] mt-1">
                       <div className="flex justify-between">
                         <span>GRAND WT:</span>
                         <span>{(slip.items.reduce((sum: number, item: any) => sum + (parseFloat(item.net_weight as any) || 0), 0) / 100).toFixed(2)} Qtl</span>
                       </div>
                       <div className="flex justify-between">
                         <span>TOTAL TOLL:</span>
                         <span>{formatCurrency(slip.items.reduce((sum: number, item: any) => sum + (parseFloat(item.tollkata_charges as any) || 0), 0))}</span>
                       </div>
                       <div className="flex justify-between text-[11px] font-black mt-2">
                         <span>GRAND TOTAL:</span>
                         <span>{formatCurrency(slip.items.reduce((sum: number, item: any) => sum + (parseFloat(item.payable_amount as any) || 0) + (parseFloat(item.tollkata_charges as any) || 0), 0))}</span>
                       </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="pb-2 border-b border-black border-dashed text-[9px]">
                      <p><strong>VEHICLE:</strong> {slip.vehicle_no}</p>
                      <p><strong>GRAIN:</strong> {slip.grain_category} ({slip.subcategory || 'Default'})</p>
                    </div>

                    <div className="pb-2 border-b border-black border-dashed flex justify-between text-[10px] font-bold mt-1">
                       <span>NET WEIGHT:</span>
                       <span>{getWeightInQtl(slip.net_weight)} Qtl</span>
                    </div>

                    <div className="pb-2 border-b border-black border-dashed space-y-1 text-[9px] mt-1">
                       <div className="flex justify-between">
                         <span>RATE/QTL:</span>
                         <span>{formatCurrency(slip.rate_per_mt)}</span>
                       </div>
                       <div className="flex justify-between">
                         <span>TOLLKATA:</span>
                         <span>{formatCurrency(slip.tollkata_charges)}</span>
                       </div>
                       <div className="flex justify-between text-[11px] font-black mt-2">
                         <span>TOTAL:</span>
                         <span>{formatCurrency((parseFloat(slip.payable_amount as any) || 0) + (parseFloat(slip.tollkata_charges as any) || 0))}</span>
                       </div>
                    </div>
                  </>
                )}

                <div className="text-center pt-3 text-[8px] font-bold">
                  <p>Thank you for your business!</p>
                  <p>Renixsolution Grain ERP</p>
                </div>
              </div>
            ) : (
              <>
            {/* Slip Header - Branding */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8 sm:mb-12 pb-6 sm:pb-8 border-b-4 border-slate-900 print:mb-4 print:pb-4 print:gap-4">
              <div className="space-y-2 print:space-y-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
                    <Scale className="w-6 h-6 text-white" />
                  </div>
                  <h1 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">RGrain</h1>
                </div>
                <p className="text-[10px] text-slate-500 font-black tracking-[0.3em] uppercase">Premium Agriculture Solutions</p>
                <div className="text-[9px] text-slate-400 font-bold uppercase leading-tight">
                  {/* <p>123 Mandi Road, Karnal, Haryana</p> */}
                  <p>Contact: +91 7693072877 | info@renixsolution.com</p>
                </div>
              </div>
              <div className="text-left sm:text-right space-y-2 w-full sm:w-auto print:space-y-1">
                <div className="bg-slate-900 text-white px-5 py-2 rounded-xl text-xl font-black inline-block shadow-lg">
                  SLIP #{slip.serial_number || slip.slip_no?.split('-')[1]}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-16 mb-8 sm:mb-12 print:mb-4 print:gap-4">
              <div className="space-y-8 print:space-y-3">
                <div className="space-y-4 print:space-y-1">
                  <div className="flex items-center gap-2 text-slate-400">
                    <User className="w-4 h-4 print:w-3 print:h-3" />
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

                {!(slip.items && slip.items.length > 0) && (
                  <>
                    <div className="space-y-4 print:space-y-1">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Truck className="w-4 h-4 print:w-3 print:h-3" />
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

                    <div className="space-y-4 print:space-y-1">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Box className="w-4 h-4 print:w-3 print:h-3" />
                        <span className="text-[10px] uppercase font-black tracking-widest">Commodity</span>
                      </div>
                      <div className="pl-6 border-l-2 border-slate-100">
                        <p className="text-xl font-black text-slate-900 uppercase">{slip.grain_category}</p>
                        <p className="text-sm font-bold text-slate-500 uppercase">{slip.subcategory || 'Default Quality'}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {slip.items && slip.items.length > 0 ? (
                <div className="col-span-1 sm:col-span-2 mt-4 print:mt-2">
                  <div className="mb-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Batch Details</h3>
                    <div className="overflow-hidden border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-[10px] sm:text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-black uppercase tracking-widest border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2">Vehicle</th>
                            <th className="px-3 py-2">Commodity</th>
                            <th className="px-3 py-2 text-right">Net Wt</th>
                            <th className="px-3 py-2 text-right">Rate</th>
                            <th className="px-3 py-2 text-right">Tollkata</th>
                            <th className="px-3 py-2 text-right">Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-bold text-slate-900">
                          {slip.items.map((item: any, idx: number) => (
                            <tr key={item.id || idx}>
                              <td className="px-3 py-2 uppercase">{item.vehicle_no}</td>
                              <td className="px-3 py-2 uppercase">{item.grain_category} <span className="opacity-50">({item.subcategory || '-'})</span></td>
                              <td className="px-3 py-2 text-right">{getWeightInQtl(item.net_weight)} Qtl</td>
                              <td className="px-3 py-2 text-right">{formatCurrency(item.rate_per_mt)}</td>
                              <td className="px-3 py-2 text-right">{formatCurrency(item.tollkata_charges)}</td>
                              <td className="px-3 py-2 text-right">{formatCurrency(item.payable_amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-50 font-black uppercase border-t-2 border-slate-200 text-slate-900">
                          <tr>
                            <td colSpan={2} className="px-3 py-3 text-right text-[10px] tracking-widest">Grand Total:</td>
                            <td className="px-3 py-3 text-right">{(slip.items.reduce((sum: number, item: any) => sum + (parseFloat(item.net_weight as any) || 0), 0) / 100).toFixed(2)} Qtl</td>
                            <td className="px-3 py-3 text-right">-</td>
                            <td className="px-3 py-3 text-right text-primary">{formatCurrency(slip.items.reduce((sum: number, item: any) => sum + (parseFloat(item.tollkata_charges as any) || 0), 0))}</td>
                            <td className="px-3 py-3 text-right text-lg tracking-tighter">{formatCurrency(slip.items.reduce((sum: number, item: any) => sum + (parseFloat(item.payable_amount as any) || 0) + (parseFloat(item.tollkata_charges as any) || 0), 0))}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
              <div className="space-y-6 print:space-y-3">
                <div className="bg-slate-50 p-8 rounded-[2rem] space-y-4 border border-slate-100 print:p-4 print:space-y-2">
                  {slip.gross_weight !== undefined && slip.gross_weight !== null && slip.tare_weight !== undefined && slip.tare_weight !== null ? (
                    <>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-black uppercase tracking-widest">Gross Weight</span>
                        <span className="font-black text-slate-900">{getWeightInQtl(slip.gross_weight)} Qtl</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-black uppercase tracking-widest">Tare Weight</span>
                        <span className="font-black text-slate-900">{getWeightInQtl(slip.tare_weight)} Qtl</span>
                      </div>
                      <div className="h-px bg-slate-200" />
                    </>
                  ) : null}
                  <div className="flex justify-between items-center">
                    <span className="text-slate-900 font-black uppercase tracking-widest text-xs">Net Payload</span>
                    <span className="text-2xl font-black text-slate-900">{getWeightInQtl(slip.net_weight)} Qtl</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 print:gap-2">
                  <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 text-center print:p-2">
                    <label className="text-[9px] uppercase font-black text-primary tracking-widest block mb-1">Tollkata Fee</label>
                    <p className="text-xl font-black text-primary">{formatCurrency(slip.tollkata_charges)}</p>
                  </div>
                  <div className="p-4 bg-slate-900 rounded-2xl text-center print:p-2">
                    <label className="text-[9px] uppercase font-black text-white/40 tracking-widest block mb-1">Rate / Qtl</label>
                    <p className="text-xl font-black text-white">{formatCurrency(slip.rate_per_mt)}</p>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 rounded-[2rem] border-2 border-slate-900 text-center relative overflow-hidden print:p-3">
                   <div className="absolute top-0 right-0 w-20 h-20 bg-slate-900/5 rounded-full -mr-10 -mt-10" />
                  <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block mb-1">Total Transaction Value</label>
                  <p className="text-4xl font-black text-slate-900 tracking-tighter">{formatCurrency((parseFloat(slip.payable_amount as any) || 0) + (parseFloat(slip.tollkata_charges as any) || 0))}</p>
                </div>
              </div>
              )}
            </div>

            {/* Print Footer */}
            <div className="mt-12 text-center print:mt-4">
              <p className="text-[8px] text-slate-300 font-bold uppercase tracking-[0.3em]">Computer Generated Slip • Valid for Internal Records Only • Renixsolution Grain ERP</p>
            </div>
            </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 sm:px-10 py-4 sm:py-6 border-t border-gray-100 bg-gray-50 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex items-center gap-1 sm:gap-2 bg-white border border-gray-200 rounded-xl p-1 shrink-0 overflow-x-auto mx-auto lg:mx-0">
            <button 
              onClick={() => setPrintFormat('A4')}
              className={cn("px-4 py-2 text-xs font-black rounded-lg transition-all whitespace-nowrap", printFormat === 'A4' ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100")}
            >A4 Size</button>
            <button 
              onClick={() => setPrintFormat('A5')}
              className={cn("px-4 py-2 text-xs font-black rounded-lg transition-all whitespace-nowrap", printFormat === 'A5' ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100")}
            >A5 (Half)</button>
            <button 
              onClick={() => setPrintFormat('THERMAL')}
              className={cn("px-4 py-2 text-xs font-black rounded-lg transition-all whitespace-nowrap", printFormat === 'THERMAL' ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100")}
            >3" Thermal</button>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 sm:gap-4 w-full lg:w-auto">
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
              className="px-10 py-3 bg-slate-900 text-white text-xs font-black rounded-xl flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 w-full sm:w-auto"
            >
              <Printer className="w-4 h-4" />
              Print Official Slip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
