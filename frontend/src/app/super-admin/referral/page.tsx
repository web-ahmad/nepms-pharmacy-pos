'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Share2, Gift, Loader2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useReferralSettings, useUpdateReferralSettings,
  useReferrals, useMarkReferralRewarded,
  type ReferralSettings,
} from '@/features/super-admin/api/useReferral';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString();
}

const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  pending:   { bg: 'var(--sa-warning-muted)', fg: 'var(--sa-warning)' },
  converted: { bg: 'var(--sa-accent-muted)',  fg: 'var(--sa-accent)' },
  rewarded:  { bg: 'var(--sa-success-muted)', fg: 'var(--sa-success)' },
};

function SettingsCard({ settings }: { settings: ReferralSettings }) {
  const updateSettings = useUpdateReferralSettings();
  const [rewardType, setRewardType] = useState(settings.reward_type);
  const [rewardValue, setRewardValue] = useState(String(settings.reward_value));
  const [durationMonths, setDurationMonths] = useState(String(settings.reward_duration_months ?? ''));
  const [isActive, setIsActive] = useState(settings.is_active);
  const [terms, setTerms] = useState(settings.terms ?? '');

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        reward_type: rewardType,
        reward_value: Number(rewardValue) || 0,
        reward_duration_months: durationMonths ? Number(durationMonths) : null,
        is_active: isActive,
        terms: terms.trim() || null,
      });
      toast.success('Referral settings saved');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Failed to save settings');
    }
  };

  return (
    <div className="rounded-2xl p-5 mb-6 sa-fade-up" style={{ background: 'var(--sa-surface)', border: '1px solid var(--sa-border)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--sa-accent-muted)' }}>
            <Gift className="w-4.5 h-4.5" style={{ color: 'var(--sa-accent)' }} />
          </div>
          <h2 className="text-base font-semibold" style={{ color: 'var(--sa-text)' }}>Reward Rules</h2>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-xs font-medium" style={{ color: 'var(--sa-text-muted)' }}>Program Active</span>
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 accent-indigo-500" />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--sa-text-muted)' }}>Reward Type</label>
          <select
            value={rewardType}
            onChange={(e) => setRewardType(e.target.value as 'percentage' | 'fixed')}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'var(--sa-surface-raised)', border: '1px solid var(--sa-border)', color: 'var(--sa-text)' }}
          >
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed Amount</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--sa-text-muted)' }}>
            {rewardType === 'percentage' ? 'Reward %' : 'Reward Amount'}
          </label>
          <input
            type="number" step="0.01" min="0"
            value={rewardValue}
            onChange={(e) => setRewardValue(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'var(--sa-surface-raised)', border: '1px solid var(--sa-border)', color: 'var(--sa-text)' }}
          />
        </div>
        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--sa-text-muted)' }}>Duration (months)</label>
          <input
            type="number" min="0"
            value={durationMonths}
            onChange={(e) => setDurationMonths(e.target.value)}
            placeholder="One-time"
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'var(--sa-surface-raised)', border: '1px solid var(--sa-border)', color: 'var(--sa-text)' }}
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--sa-text-muted)' }}>Terms &amp; Conditions (optional)</label>
        <textarea
          value={terms}
          onChange={(e) => setTerms(e.target.value)}
          rows={3}
          placeholder="Describe eligibility rules for the referral program…"
          className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
          style={{ background: 'var(--sa-surface-raised)', border: '1px solid var(--sa-border)', color: 'var(--sa-text)' }}
        />
      </div>

      <button
        onClick={handleSave}
        disabled={updateSettings.isPending}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
        style={{ background: 'var(--sa-accent)' }}
      >
        {updateSettings.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        Save Settings
      </button>
    </div>
  );
}

export default function ReferralPage() {
  const { data: settings, isLoading: settingsLoading } = useReferralSettings();
  const { data: referrals, isLoading: referralsLoading } = useReferrals();
  const markRewarded = useMarkReferralRewarded();

  const handleMarkRewarded = async (id: string) => {
    try {
      await markRewarded.mutateAsync(id);
      toast.success('Referral marked as rewarded');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Failed to update referral');
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto">
      <div className="mb-6 sa-fade-up">
        <h1 className="text-xl font-bold" style={{ color: 'var(--sa-text)' }}>Referral Program</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--sa-text-muted)' }}>Reward pharmacies for referring new pharmacies to NEPMS.</p>
      </div>

      {settingsLoading || !settings ? (
        <div className="sa-skeleton h-64 mb-6" />
      ) : (
        <SettingsCard settings={settings} />
      )}

      <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--sa-text)' }}>Referrals</h2>

      {referralsLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="sa-skeleton h-14" />)}
        </div>
      ) : !referrals || referrals.length === 0 ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="text-center sa-fade-up">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--sa-accent-muted)' }}>
              <Share2 className="w-7 h-7" style={{ color: 'var(--sa-accent)' }} />
            </div>
            <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--sa-text)' }}>No referrals yet</h3>
            <p className="text-sm" style={{ color: 'var(--sa-text-muted)' }}>Referrals will appear here once pharmacies start inviting others.</p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--sa-surface)', border: '1px solid var(--sa-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--sa-border)' }}>
                {['Referrer', 'Referred', 'Code', 'Status', 'Reward', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--sa-text-faint)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {referrals.map((r, i) => {
                const s = STATUS_STYLE[r.status] ?? STATUS_STYLE.pending;
                return (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.25, delay: i * 0.03 }}
                    style={{ borderBottom: '1px solid var(--sa-border)' }}
                  >
                    <td className="px-4 py-3" style={{ color: 'var(--sa-text)' }}>{r.referrer_pharmacy_name}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--sa-text-muted)' }}>{r.referred_pharmacy_name ?? '—'}</td>
                    <td className="px-4 py-3 font-mono" style={{ color: 'var(--sa-text-muted)' }}>{r.referral_code}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-semibold px-2 py-1 rounded-full capitalize" style={{ background: s.bg, color: s.fg }}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--sa-text-muted)' }}>{r.reward_amount != null ? `$${r.reward_amount.toFixed(2)}` : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      {r.status === 'converted' && (
                        <button
                          onClick={() => handleMarkRewarded(r.id)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg"
                          style={{ color: 'var(--sa-success)', background: 'var(--sa-success-muted)' }}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Mark Rewarded
                        </button>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
