"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api';
import { useQueryClient } from '@tanstack/react-query';

export default function RetentionPolicyPage() {
  const [auditDays, setAuditDays] = useState(365);
  const [systemDays, setSystemDays] = useState(90);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/v1/compliance/retention', {
        audit_logs_retention_days: auditDays,
        system_logs_retention_days: systemDays
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Data Retention Policies</h2>
          <p className="text-sm text-zinc-500 mt-1">Configure how long audit and system logs are retained before automated purging.</p>
        </div>
      </div>

      <div className="max-w-lg rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
              Audit Log Retention (days)
            </label>
            <p className="text-xs text-zinc-500 mb-3">How many days to keep audit logs before auto-purging.</p>
            <input
              type="number"
              min={30}
              max={3650}
              value={auditDays}
              onChange={(e) => setAuditDays(Number(e.target.value))}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
              System Log Retention (days)
            </label>
            <p className="text-xs text-zinc-500 mb-3">How many days to keep system/application logs.</p>
            <input
              type="number"
              min={7}
              max={365}
              value={systemDays}
              onChange={(e) => setSystemDays(Number(e.target.value))}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Policy'}
            </Button>
            {saved && <span className="text-sm text-green-600 dark:text-green-400 font-medium">✓ Policy updated</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
