import { useState } from 'react';
import { Customer } from '../types/crm';
import { useCreateCustomerPayment } from '../services/crm.api';
import { notify } from '@/utils/toast';
import { X } from 'lucide-react';

interface CustomerPaymentModalProps {
  customer: Customer;
  isOpen: boolean;
  onClose: () => void;
}

export default function CustomerPaymentModal({ customer, isOpen, onClose }: CustomerPaymentModalProps) {
  const [amount, setAmount] = useState(customer.current_balance > 0 ? customer.current_balance : 0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  
  const paymentMutation = useCreateCustomerPayment(customer.id);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      notify.error(`Payment amount must be greater than zero`);
      return;
    }

    try {
      await paymentMutation.mutateAsync({
        amount,
        payment_method: paymentMethod,
        reference_number: reference,
        notes
      });
      notify.success('Payment recorded successfully');
      onClose();
    } catch (err) {
      console.error('Payment failed', err);
      notify.error('Failed to record payment');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg dark:bg-zinc-950 border dark:border-zinc-800">
        <div className="flex items-center justify-between mb-4 border-b border-zinc-200 pb-4 dark:border-zinc-800">
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Record Customer Payment</h3>
            <p className="text-sm text-zinc-500 font-medium mt-1">{customer.full_name}</p>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
            <X size={20} />
          </button>
        </div>

        <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-lg text-center mb-6 border border-zinc-200 dark:border-zinc-800">
          <div className="text-zinc-500 dark:text-zinc-400 mb-1 font-medium">Outstanding Balance</div>
          <div className="text-2xl font-mono font-bold text-red-600 dark:text-red-400">
            ${customer.current_balance.toFixed(2)}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Payment Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">Rs</span>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full rounded-md border border-zinc-300 py-2 pl-7 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            {customer.current_balance > 0 && (
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => setAmount(customer.current_balance)} className="text-xs text-blue-600 hover:underline">Full Settlement</button>
                <button type="button" onClick={() => setAmount(customer.current_balance / 2)} className="text-xs text-blue-600 hover:underline">50%</button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Payment Method</label>
            <select
              required
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Check">Check</option>
              <option value="Credit Card">Credit Card</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Reference Number</label>
            <input
              type="text"
              placeholder="e.g., Check #, Transaction ID"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={paymentMutation.isPending || amount <= 0}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50"
            >
              {paymentMutation.isPending ? 'Processing...' : 'Confirm Payment'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
