'use client';

import { useMarketingCampaigns } from '@/features/crm/services/crm.api';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';

export default function MarketingCampaignsPage() {
  const { data: campaigns, isLoading } = useMarketingCampaigns();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Campaigns
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage your SMS, WhatsApp, and Email marketing campaigns.
          </p>
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
        >
          <Plus size={16} /> Create Campaign
        </button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-400">
              <tr>
                <th className="p-4 font-medium">Campaign Name</th>
                <th className="p-4 font-medium">Channel</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Target</th>
                <th className="p-4 font-medium text-right">Reach</th>
                <th className="p-4 font-medium">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-500 animate-pulse">Loading campaigns...</td>
                </tr>
              ) : !campaigns || campaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-500">No campaigns found.</td>
                </tr>
              ) : (
                campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="p-4 font-medium text-zinc-900 dark:text-zinc-100">{campaign.name}</td>
                    <td className="p-4 text-zinc-600 dark:text-zinc-400 uppercase text-xs">{campaign.channel}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        {campaign.status}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-600 dark:text-zinc-400">{campaign.target_audience_type}</td>
                    <td className="p-4 text-right">{campaign.estimated_reach}</td>
                    <td className="p-4 text-zinc-600 dark:text-zinc-400">{format(new Date(campaign.created_at), 'dd MMM yyyy')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
