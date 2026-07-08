"use client";

import React, { useEffect, useState, forwardRef } from 'react';
import { createPortal } from 'react-dom';

export interface PrintMetadata {
  label: string;
  value: string | number;
}

interface GlobalPrintTemplateProps {
  title: string;
  metadata?: PrintMetadata[];
  children: React.ReactNode;
  showSignatures?: boolean;
}

export const GlobalPrintTemplate = forwardRef<HTMLDivElement, GlobalPrintTemplateProps>(
  ({ title, metadata, children, showSignatures = true }, ref) => {
    return (
      <div 

        ref={ref}
        className="print-template-root absolute left-[-9999px] top-[-9999px] print:static print:block bg-white text-black min-h-[100vh] w-full font-sans print:z-[99999]"
      >
      {/* Header Background Curves */}
      <div className="absolute top-0 left-0 w-full h-48 overflow-hidden pointer-events-none z-0">
        <svg viewBox="0 0 1200 200" preserveAspectRatio="none" className="w-full h-full">
          <path d="M0,0 L1200,0 L1200,120 Q900,180 600,120 T0,80 Z" fill="#f4f4f5" />
          <path d="M0,0 L1200,0 L1200,80 Q900,140 600,100 T0,40 Z" fill="#059669" opacity="0.9" />
          <path d="M0,0 L1200,0 L1200,40 Q900,100 600,60 T0,20 Z" fill="#18181b" />
        </svg>
      </div>

      {/* Content wrapper */}
      <div className="relative z-10 p-10 pt-16 pb-[160px] flex flex-col min-h-[100vh]">
        
        {/* Header Content */}
        <div className="flex justify-between items-start mb-12">
          <div>
            <h1 className="text-4xl font-bold tracking-tight uppercase" style={{ color: '#18181b' }}>{title}</h1>
            
            {metadata && metadata.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2">
                {metadata.map((meta, idx) => (
                  <div key={idx}>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{meta.label}</p>
                    <p className="text-sm font-semibold text-zinc-900">{meta.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-black tracking-tighter" style={{ color: '#059669' }}>NEPMS<span style={{ color: '#18181b' }}>.</span></h2>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mt-1">Pharmacy</p>
            <div className="mt-2 text-right">
              <p className="text-[10px] text-zinc-500 font-medium">45-A, Commercial Zone, Phase 5, DHA, Lahore</p>
              <p className="text-[10px] text-zinc-500 font-medium">Tel: +92 300 1234567 | Email: info@nepms.com</p>
              <p className="text-[10px] text-zinc-500 font-medium">NTN: 1234567-8</p>
            </div>
          </div>
        </div>

        {/* Dynamic Table/Content */}
        <div className="flex-1 print-table-wrapper w-full">
          {children}
        </div>

        {/* Signatures */}
        {showSignatures && (
          <div className="mt-[50px] mb-[30px] flex justify-between px-10 bg-white relative z-20">
            <div className="text-center">
              <div className="w-48 border-b-[2px] border-zinc-800 mb-2"></div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-800">Prepared By</p>
            </div>
            <div className="text-center">
              <div className="w-48 border-b-[2px] border-zinc-800 mb-2"></div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-800">Authorized Manager</p>
            </div>
          </div>
        )}

      </div>

      {/* Footer Background Curves */}
      <div className="absolute bottom-0 left-0 w-full h-32 overflow-hidden pointer-events-none z-0 mt-8">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full">
          <path d="M0,120 L1200,120 L1200,40 Q900,0 600,40 T0,80 Z" fill="#f4f4f5" />
          <path d="M0,120 L1200,120 L1200,80 Q900,20 600,60 T0,100 Z" fill="#059669" opacity="0.9" />
          <path d="M0,120 L1200,120 L1200,100 Q900,60 600,80 T0,110 Z" fill="#18181b" />
        </svg>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body * {
            visibility: hidden;
          }
          .print-template-root, .print-template-root * {
            visibility: visible !important;
          }
          .print-template-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
          }
          body {
            background: white !important;
          }
          @page {
            size: A4;
            margin: 0;
          }
          .print-table-wrapper table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            margin-bottom: 2rem;
          }
          .print-table-wrapper thead th {
            background-color: #059669 !important;
            color: white !important;
            padding: 10px 12px !important;
            font-size: 10px !important;
            font-weight: 700 !important;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            text-align: left;
          }
          .print-table-wrapper thead th:first-child {
            border-top-left-radius: 6px;
          }
          .print-table-wrapper thead th:last-child {
            border-top-right-radius: 6px;
          }
          .print-table-wrapper tbody td {
            padding: 8px 12px !important;
            border-bottom: 1px solid #e4e4e7 !important;
            font-size: 11px !important;
            color: #18181b !important;
          }
          .print-table-wrapper tbody tr:nth-child(even) td {
            background-color: #f4f4f5 !important;
          }
          .print-table-wrapper tfoot td {
            padding: 10px 12px !important;
            font-size: 12px !important;
            font-weight: bold !important;
            border-bottom: 2px solid #18181b !important;
            border-top: 2px solid #18181b !important;
          }
        }
      `}} />
      </div>
    );
  }
);
