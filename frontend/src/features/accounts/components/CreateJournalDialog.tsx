import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { useChartAccounts, useCreateJournal } from '../services/accounts.api';
import { toast } from 'sonner';

const journalSchema = z.object({
  reference: z.string().min(1, 'Reference is required'),
  description: z.string().min(1, 'Description is required'),
  date: z.string().min(1, 'Date is required'),
  lines: z.array(z.object({
    account_id: z.string().min(1, 'Account is required'),
    description: z.string().optional(),
    debit: z.any().transform(v => Number(v) || 0),
    credit: z.any().transform(v => Number(v) || 0)
  })).min(2, 'At least 2 lines are required')
}).superRefine((data, ctx) => {
  const totalDebit = data.lines.reduce((sum, line) => sum + line.debit, 0);
  const totalCredit = data.lines.reduce((sum, line) => sum + line.credit, 0);
  
  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Total Debits (${totalDebit.toFixed(2)}) must equal Total Credits (${totalCredit.toFixed(2)})`,
      path: ['lines']
    });
  }
  
  if (totalDebit === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Journal entry must have non-zero amounts',
      path: ['lines']
    });
  }
});

type JournalFormValues = {
  reference: string;
  description: string;
  date: string;
  lines: {
    account_id: string;
    description?: string;
    debit: number;
    credit: number;
  }[];
};

export default function CreateJournalDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { data: accounts } = useChartAccounts();
  const createMutation = useCreateJournal();

  const form = useForm<JournalFormValues>({
    resolver: zodResolver(journalSchema),
    defaultValues: {
      reference: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      lines: [
        { account_id: '', description: '', debit: 0, credit: 0 },
        { account_id: '', description: '', debit: 0, credit: 0 }
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    name: 'lines',
    control: form.control
  });

  const onSubmit = (data: JournalFormValues) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        toast.success('Journal Entry created successfully');
        setOpen(false);
        form.reset();
        window.location.reload(); 
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.detail || 'Failed to create entry');
      }
    });
  };

  const totalDebit = form.watch('lines').reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
  const totalCredit = form.watch('lines').reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) <= 0.001 && totalDebit > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children as any} />
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Journal Entry</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Reference</Label>
              <Input {...form.register('reference')} placeholder="e.g. JE-001" />
              {form.formState.errors.reference && <p className="text-sm text-red-500">{form.formState.errors.reference.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" {...form.register('date')} />
              {form.formState.errors.date && <p className="text-sm text-red-500">{form.formState.errors.date.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input {...form.register('description')} placeholder="Entry description" />
              {form.formState.errors.description && <p className="text-sm text-red-500">{form.formState.errors.description.message}</p>}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Line Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ account_id: '', description: '', debit: 0, credit: 0 })}>
                <Plus className="h-4 w-4 mr-2" /> Add Line
              </Button>
            </div>
            
            {form.formState.errors.lines?.root && (
              <p className="text-sm font-medium text-red-500 p-2 bg-red-50 dark:bg-red-950/20 rounded-md">
                {form.formState.errors.lines.root.message}
              </p>
            )}

            <div className="border border-zinc-200 dark:border-zinc-800 rounded-md overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="p-2 text-left font-medium">Account</th>
                    <th className="p-2 text-left font-medium">Description</th>
                    <th className="p-2 text-right font-medium w-32">Debit</th>
                    <th className="p-2 text-right font-medium w-32">Credit</th>
                    <th className="p-2 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {fields.map((field, index) => (
                    <tr key={field.id}>
                      <td className="p-2">
                        <select 
                          {...form.register(`lines.${index}.account_id` as const)}
                          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:ring-zinc-300"
                        >
                          <option value="">Select Account...</option>
                          {accounts?.map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <Input {...form.register(`lines.${index}.description` as const)} placeholder="Line description" className="h-9" />
                      </td>
                      <td className="p-2">
                        <Input type="number" step="0.01" {...form.register(`lines.${index}.debit` as const)} className="h-9 text-right" />
                      </td>
                      <td className="p-2">
                        <Input type="number" step="0.01" {...form.register(`lines.${index}.credit` as const)} className="h-9 text-right" />
                      </td>
                      <td className="p-2 text-center">
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => remove(index)} disabled={fields.length <= 2}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 font-medium">
                  <tr>
                    <td colSpan={2} className="p-2 text-right">Totals:</td>
                    <td className={`p-2 text-right ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>{totalDebit.toFixed(2)}</td>
                    <td className={`p-2 text-right ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>{totalCredit.toFixed(2)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending || !isBalanced}>
              {createMutation.isPending ? 'Saving...' : 'Save Entry'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
