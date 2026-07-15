import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Trash2, Edit, Box, Loader2, Star, Percent } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { BranchSettingsOverview, BranchWarehouse } from '@/features/branches/types/branchConfig';
import { branchConfigService } from '@/features/branches/services/branchConfigService';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface Props {
  branchId: string;
  data: BranchSettingsOverview;
  refetch: () => void;
}

const inputClass =
  'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring';

export default function WarehousesTab({ branchId, data, refetch }: Props) {
  const warehouses = data.warehouses || [];
  
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { register, handleSubmit, reset } = useForm<Partial<BranchWarehouse>>();

  const openNew = () => {
    reset({ name: '', code: '', warehouse_type: 'main', is_active: true, capacity_units: undefined });
    setEditingId(null);
    setIsOpen(true);
  };

  const openEdit = (w: BranchWarehouse) => {
    reset(w);
    setEditingId(w.id);
    setIsOpen(true);
  };

  const onSubmit = async (values: Partial<BranchWarehouse>) => {
    try {
      setIsSaving(true);
      if (editingId) {
        await branchConfigService.updateWarehouse(branchId, editingId, values);
        toast.success('Warehouse updated');
      } else {
        await branchConfigService.createWarehouse(branchId, values);
        toast.success('Warehouse created');
      }
      setIsOpen(false);
      refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to save warehouse');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteWarehouse = async (id: string) => {
    if (!confirm('Are you sure you want to delete this warehouse?')) return;
    try {
      await branchConfigService.deleteWarehouse(branchId, id);
      toast.success('Warehouse deleted');
      refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to delete');
    }
  };

  const setDefault = async (id: string) => {
    try {
      await branchConfigService.setWarehouseDefault(branchId, id);
      toast.success('Default warehouse updated');
      refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to set default');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Warehouses</h2>
          <p className="text-muted-foreground mt-1">Manage physical storage locations and capacity.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger>
            <Button onClick={openNew} type="button">
              <Plus className="w-4 h-4 mr-2" />
              Add Warehouse
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Warehouse' : 'Add Warehouse'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Name</label>
                  <input {...register('name', { required: true })} className={inputClass} placeholder="e.g. Main Store" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Code</label>
                  <input {...register('code', { required: true })} className={inputClass} placeholder="e.g. WH-01" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Type</label>
                  <select {...register('warehouse_type')} className={inputClass}>
                    <option value="main">Main</option>
                    <option value="cold">Cold Storage</option>
                    <option value="quarantine">Quarantine</option>
                    <option value="transit">Transit</option>
                    <option value="virtual">Virtual</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Capacity (Units)</label>
                  <input type="number" {...register('capacity_units')} className={inputClass} placeholder="Leave empty for unlimited" />
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {warehouses.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed rounded-xl">
            <Box className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p>No warehouses configured.</p>
          </div>
        ) : (
          warehouses.map((w) => (
            <Card key={w.id} className={`shadow-sm relative overflow-hidden group ${w.is_default ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
              <div className={`absolute top-0 left-0 w-1 h-full ${w.is_active ? 'bg-blue-500' : 'bg-red-500'}`} />
              <CardContent className="p-5 pl-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Box className="w-5 h-5 text-muted-foreground" />
                      {w.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs font-mono">{w.code}</Badge>
                      <Badge variant="secondary" className="text-xs capitalize">{w.warehouse_type}</Badge>
                      {w.is_default && <Badge className="text-[10px] bg-primary text-primary-foreground"><Star className="w-3 h-3 mr-1" /> Default</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!w.is_default && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:text-primary" onClick={() => setDefault(w.id)} title="Set as default">
                        <Star className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(w)}>
                      <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-red-600" onClick={() => deleteWarehouse(w.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-3 mt-4 pt-4 border-t border-border/50">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Capacity</span>
                    <span className="font-medium">
                      {w.current_units || 0} / {w.capacity_units ? w.capacity_units.toLocaleString() : '∞'}
                    </span>
                  </div>
                  {w.capacity_units && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Utilization</span>
                        <span>{Math.round((w.utilization_percent || 0))}%</span>
                      </div>
                      <Progress value={w.utilization_percent || 0} className="h-1.5" />
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
