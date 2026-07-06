import { useState } from 'react';
import { Customer } from '../types/crm';
import { useRedeemPoints, useLoyaltyHistory } from '../services/crm.api';
import { notify } from '@/utils/toast';
import { Award, Gift, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

export default function LoyaltyWidget({ customer }: { customer: Customer }) {
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
  const redeemMutation = useRedeemPoints(customer.id);
  const { data: history, isLoading } = useLoyaltyHistory(customer.id);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pointsToRedeem <= 0 || pointsToRedeem > customer.loyalty_points) {
      notify.error('Invalid points amount');
      return;
    }

    try {
      await redeemMutation.mutateAsync({
        points_to_redeem: pointsToRedeem,
        reason: 'Manual Redemption via Dashboard'
      });
      setPointsToRedeem(0);
      notify.success('Points redeemed successfully!');
    } catch (err) {
      console.error('Failed to redeem points', err);
      notify.error('Failed to redeem points');
    }
  };

  const lifetimeEarned = history?.filter(t => t.points > 0).reduce((acc, t) => acc + t.points, 0) || 0;
  const lifetimeRedeemed = history?.filter(t => t.points < 0).reduce((acc, t) => acc + Math.abs(t.points), 0) || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-6">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center gap-4 mb-4">
            <div className="rounded-lg bg-amber-100 p-3 dark:bg-amber-900/30">
              <Award className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Available Points</p>
              <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">{customer.loyalty_points} <span className="text-sm font-normal text-zinc-500">pts</span></p>
            </div>
          </div>
          
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-2 gap-4">
            <div>
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">Lifetime Earned</span>
              <span className="font-medium text-green-600 dark:text-green-400">+{lifetimeEarned}</span>
            </div>
            <div>
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">Lifetime Redeemed</span>
              <span className="font-medium text-red-600 dark:text-red-400">-{lifetimeRedeemed}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
            <Gift size={18} /> Redeem Points
          </h3>
          <form onSubmit={handleRedeem} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Points to Redeem</label>
              <div className="flex gap-3">
                <input
                  type="number"
                  min="1"
                  max={customer.loyalty_points}
                  value={pointsToRedeem}
                  onChange={(e) => setPointsToRedeem(Number(e.target.value))}
                  className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
                <button
                  type="submit"
                  disabled={redeemMutation.isPending || pointsToRedeem <= 0 || pointsToRedeem > customer.loyalty_points}
                  className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2 disabled:opacity-50"
                >
                  {redeemMutation.isPending ? 'Processing...' : 'Redeem'}
                </button>
              </div>
            </div>
            <p className="text-xs text-zinc-500">
              Note: POS redemptions are handled directly during checkout. Use this only for manual adjustments or physical rewards.
            </p>
          </form>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden flex flex-col">
        <div className="border-b border-zinc-200 dark:border-zinc-800 p-4 bg-zinc-50 dark:bg-zinc-900/50 flex items-center gap-2">
          <TrendingUp size={18} className="text-zinc-500" />
          <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Loyalty Transactions</h3>
        </div>
        <div className="p-0 flex-1 overflow-y-auto max-h-96">
          {isLoading ? (
            <div className="p-8 text-center animate-pulse text-zinc-500">Loading history...</div>
          ) : !history || history.length === 0 ? (
            <div className="p-8 flex flex-col items-center justify-center text-center">
              <p className="text-zinc-500 dark:text-zinc-400 mb-2">No loyalty history found</p>
              <p className="text-xs text-zinc-400 max-w-xs">Detailed earn/burn ledger will populate here as the customer makes purchases.</p>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {history.map(tx => (
                <li key={tx.id} className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100">{tx.transaction_type}</span>
                    <span className={`font-bold text-sm ${tx.points > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {tx.points > 0 ? `+Rs {tx.points}` : tx.points}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-zinc-500 dark:text-zinc-400">
                    <span>{tx.reason || (tx.sale_id ? `Sale Ref: ${tx.sale_id.split('-')[0]}` : 'Adjustment')}</span>
                    <span>{format(new Date(tx.transaction_date), 'MMM dd, yyyy HH:mm')}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
