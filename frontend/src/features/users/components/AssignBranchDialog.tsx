'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useAssignBranch } from '../services/user.api';
import { useBranches } from '@/features/branches/services/branch.api';
import { parseApiError } from '@/utils/errorParser';

const schema = z.object({
  branch_id: z.string().min(1, 'Please select a branch'),
  role: z.string().min(1, 'Please select a role'),
  is_default_branch: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AssignBranchDialog({ userId, isOpen, onClose }: Props) {
  const { data: branchesData, isLoading: isLoadingBranches } = useBranches({ limit: 100 });
  const assignMut = useAssignBranch(userId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      role: 'staff',
      is_default_branch: false,
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      await assignMut.mutateAsync({
        branch_id: data.branch_id,
        role: data.role,
        is_default_branch: data.is_default_branch,
      });
      toast.success('Branch assigned successfully');
      reset();
      onClose();
    } catch (err: any) {
      toast.error(parseApiError(err));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 size={18} className="text-indigo-600" />
              Assign Branch
            </DialogTitle>
            <DialogDescription>
              Grant this user access to a specific branch.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="branch_id">Branch</Label>
              <select
                id="branch_id"
                {...register('branch_id')}
                className="flex h-10 w-full items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:placeholder:text-zinc-400 dark:focus:ring-zinc-300"
              >
                <option value="">Select a branch...</option>
                {branchesData?.items.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
              {errors.branch_id && <p className="text-xs text-red-500">{errors.branch_id.message}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role">Role in Branch</Label>
              <select
                id="role"
                {...register('role')}
                className="flex h-10 w-full items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:placeholder:text-zinc-400 dark:focus:ring-zinc-300"
              >
                <option value="manager">Manager</option>
                <option value="pharmacist">Pharmacist</option>
                <option value="cashier">Cashier</option>
                <option value="staff">Staff</option>
                <option value="auditor">Auditor</option>
              </select>
              {errors.role && <p className="text-xs text-red-500">{errors.role.message}</p>}
            </div>

            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id="is_default_branch"
                {...register('is_default_branch')}
                className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-600"
              />
              <Label htmlFor="is_default_branch" className="font-normal cursor-pointer">
                Set as default branch for this user
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={assignMut.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={assignMut.isPending || isLoadingBranches}>
              {assignMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign Branch
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
