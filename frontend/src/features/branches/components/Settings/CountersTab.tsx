import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Trash2, Edit, Monitor, Loader2, Network } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { BranchSettingsOverview, BranchCounter } from '@/features/branches/types/branchConfig';
import { branchConfigService } from '@/features/branches/services/branchConfigService';
import { Badge } from '@/components/ui/badge';
import { parseApiError } from '@/utils/errorParser';

interface Props {
  branchId: string;
  data: BranchSettingsOverview;
  refetch: () => void;
}

const inputClass =
  'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring';

export default function CountersTab({ branchId, data, refetch }: Props) {
  const counters = data.counters || [];
  
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { register, handleSubmit, reset } = useForm<Partial<BranchCounter>>();

  const openNew = () => {
    reset({ name: '', code: '', ip_address: '', mac_address: '', is_active: true, notes: '' });
    setEditingId(null);
    setIsOpen(true);
  };

  const openEdit = (c: BranchCounter) => {
    reset(c);
    setEditingId(c.id);
    setIsOpen(true);
  };

  const onSubmit = async (values: Partial<BranchCounter>) => {
    try {
      setIsSaving(true);
      if (editingId) {
        await branchConfigService.updateCounter(branchId, editingId, values);
        toast.success('Counter updated');
      } else {
        await branchConfigService.createCounter(branchId, values);
        toast.success('Counter created');
      }
      setIsOpen(false);
      refetch();
    } catch (error: any) {
      toast.error(parseApiError(err));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCounter = async (id: string) => {
    if (!confirm('Are you sure you want to delete this counter?')) return;
    try {
      await branchConfigService.deleteCounter(branchId, id);
      toast.success('Counter deleted');
      refetch();
    } catch (error: any) {
      toast.error(parseApiError(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">POS Counters</h2>
          <p className="text-muted-foreground mt-1">Manage billing and checkout counters.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger>
            <Button onClick={openNew} type="button">
              <Plus className="w-4 h-4 mr-2" />
              Add Counter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Counter' : 'Add Counter'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Name</label>
                  <input {...register('name', { required: true })} className={inputClass} placeholder="e.g. Counter 1" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Code</label>
                  <input {...register('code', { required: true })} className={inputClass} placeholder="e.g. C01" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">IP Address</label>
                  <input {...register('ip_address')} className={inputClass} placeholder="192.168.1.100" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">MAC Address</label>
                  <input {...register('mac_address')} className={inputClass} placeholder="00:1B:44:11:3A:B7" />
                </div>
              </div>
              <label className="flex items-center gap-2 pt-2">
                <input type="checkbox" {...register('is_active')} className="w-4 h-4 rounded border-gray-300 text-primary" />
                <span className="text-sm font-medium">Active</span>
              </label>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {counters.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed rounded-xl">
            <Monitor className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p>No counters configured.</p>
          </div>
        ) : (
          counters.map((c) => (
            <Card key={c.id} className="shadow-sm relative overflow-hidden group">
              <div className={`absolute top-0 left-0 w-1 h-full ${c.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
              <CardContent className="p-4 pl-5">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-base flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-muted-foreground" />
                      {c.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs font-mono">{c.code}</Badge>
                      {!c.is_active && <Badge variant="destructive" className="text-[10px]">Inactive</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}>
                      <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-red-600" onClick={() => deleteCounter(c.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                
                <div className="mt-4 space-y-1 text-sm text-muted-foreground">
                  {c.ip_address && (
                    <div className="flex items-center gap-2">
                      <Network className="w-3.5 h-3.5" />
                      <span className="font-mono text-xs">{c.ip_address}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
