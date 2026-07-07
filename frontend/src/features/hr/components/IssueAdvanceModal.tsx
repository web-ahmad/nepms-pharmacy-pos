import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCreateAdvance } from '../services/hr.api';
import { useEmployees } from '../services/hr.api';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function IssueAdvanceModal({ isOpen, onClose }: Props) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const { data: employees = [], isLoading: loadingEmps } = useEmployees();
  const { mutate: createAdvance, isPending } = useCreateAdvance();

  const onSubmit = (data: any) => {
    createAdvance({
      employee_id: data.employee_id,
      amount: parseFloat(data.amount),
      request_date: data.request_date,
      deduction_month: data.deduction_month,
      reason: data.reason
    }, {
      onSuccess: () => {
        toast.success("Advance Salary issued successfully");
        reset();
        onClose();
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.detail || "Failed to issue advance");
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Issue Advance Salary</DialogTitle>
        </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Employee</label>
          <select 
            {...register("employee_id", { required: true })}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          >
            <option value="">Select Employee</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
            ))}
          </select>
          {errors.employee_id && <span className="text-red-500 text-xs">Required</span>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Amount</label>
            <Input type="number" step="0.01" {...register("amount", { required: true, min: 1 })} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Request Date</label>
            <Input type="date" {...register("request_date", { required: true })} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Deduction Month (MM-YYYY)</label>
          <Input 
            placeholder="e.g. 07-2026"
            {...register("deduction_month", { 
              required: true,
              pattern: /^(0[1-9]|1[0-2])-20\d{2}$/
            })} 
          />
          {errors.deduction_month && <span className="text-red-500 text-xs">Must be in MM-YYYY format</span>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Reason (Optional)</label>
          <Textarea {...register("reason")} rows={3} />
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isPending || loadingEmps}>
            {isPending ? 'Issuing...' : 'Issue Advance'}
          </Button>
        </div>
      </form>
      </DialogContent>
    </Dialog>
  );
}
