import React from 'react';
import { Star, Truck, ShieldCheck, Clock, TrendingUp } from 'lucide-react';
import { useSupplierScorecard } from '../services/purchase.api';

interface SupplierScorecardProps {
  supplierId: string;
}

export default function SupplierScorecard({ supplierId }: SupplierScorecardProps) {
  const { fulfillmentRate, avgLeadTime, qualityScore, overallStars, totalOrders, isLoading, isError } = useSupplierScorecard(supplierId);

  if (isLoading) {
    return <div className="p-8 flex justify-center text-zinc-500 animate-pulse">Loading performance analytics...</div>;
  }

  if (isError) {
    return <div className="p-8 flex justify-center text-red-500">Failed to load analytics.</div>;
  }

  if (totalOrders === 0) {
    return (
      <div className="p-8 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
        <TrendingUp className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
        <h4 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">No Data Available</h4>
        <p className="text-zinc-500 text-sm mt-1">This supplier doesn't have any purchase orders yet to generate a scorecard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-zinc-900 border border-indigo-100 dark:border-indigo-500/20 rounded-xl p-6 shadow-sm flex items-center justify-between">
        <div>
          <h4 className="text-indigo-900 dark:text-indigo-400 font-semibold mb-1">Overall Reliability Score</h4>
          <p className="text-sm text-indigo-700/80 dark:text-indigo-400/80">Based on {totalOrders} total purchase orders</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-3xl font-bold text-indigo-700 dark:text-indigo-400">{overallStars.toFixed(1)}</span>
          <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star 
                key={star} 
                className={`w-6 h-6 ${star <= overallStars ? 'fill-yellow-400 text-yellow-400' : 'fill-zinc-200 text-zinc-200 dark:fill-zinc-800 dark:text-zinc-800'}`} 
              />
            ))}
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Fulfillment Rate */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
              <Truck className="w-5 h-5" />
            </div>
            <h5 className="font-medium text-zinc-700 dark:text-zinc-300">Fulfillment Rate</h5>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">{fulfillmentRate.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 mt-4">
            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${fulfillmentRate}%` }}></div>
          </div>
        </div>

        {/* Avg Lead Time */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
              <Clock className="w-5 h-5" />
            </div>
            <h5 className="font-medium text-zinc-700 dark:text-zinc-300">Avg Lead Time</h5>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">{avgLeadTime.toFixed(1)}</span>
            <span className="text-sm font-medium text-zinc-500">Days</span>
          </div>
          <p className="text-xs text-zinc-500 mt-4">Time from order to receive</p>
        </div>

        {/* Quality Score */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h5 className="font-medium text-zinc-700 dark:text-zinc-300">Quality Score</h5>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">{qualityScore.toFixed(0)}</span>
            <span className="text-sm font-medium text-zinc-500">/ 100</span>
          </div>
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 mt-4">
            <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${qualityScore}%` }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
