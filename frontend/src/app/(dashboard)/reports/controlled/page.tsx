"use client";

import { ShieldAlert, Lock, AlertTriangle } from 'lucide-react';

export default function ControlledSubstancePage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Controlled Substance Reports</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Regulatory compliance — narcotic & psychotropic substance logs</p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/50 dark:bg-amber-950/20">
        <div className="flex gap-4">
          <div className="flex-shrink-0 rounded-lg bg-amber-100 p-3 dark:bg-amber-900/40">
            <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-amber-900 dark:text-amber-200">Module Pending Activation</h3>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
              The Controlled Substance register requires a dedicated <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-mono dark:bg-amber-900/50">ControlledDrugLog</code> database model to be set up. Once your pharmacist configures the controlled substances list and the model is seeded, these reports will auto-populate.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { title: 'Controlled Drug Register', desc: 'Full log of all narcotics dispensed', icon: ShieldAlert },
          { title: 'Narcotic / Psychotropic Log', desc: 'Separate register per drug schedule', icon: Lock },
          { title: 'Daily Drug Count', desc: 'Opening + received – dispensed = closing', icon: ShieldAlert },
          { title: 'Controlled Returns', desc: 'Returns to supplier with authorisation ref', icon: Lock },
          { title: 'Discrepancy Report', desc: 'System count vs physical count variance', icon: AlertTriangle },
          { title: 'Prescriber Log', desc: 'Doctors who prescribed controlled substances', icon: ShieldAlert },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="rounded-xl border border-zinc-200 bg-white p-5 opacity-60 dark:border-zinc-800 dark:bg-zinc-950/50">
              <div className="flex items-center gap-3 mb-2">
                <div className="rounded-lg bg-zinc-100 p-2 dark:bg-zinc-900">
                  <Icon className="h-4 w-4 text-zinc-500" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{card.title}</h3>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{card.desc}</p>
              <span className="mt-3 inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800">Coming Soon</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
