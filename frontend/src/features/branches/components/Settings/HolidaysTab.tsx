import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Trash2, Edit, Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { BranchSettingsOverview, BranchHoliday } from '@/features/branches/types/branchConfig';
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

export default function HolidaysTab({ branchId, data, refetch }: Props) {
  const holidays = data.holidays || [];
  
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { register, handleSubmit, reset, setValue } = useForm<Partial<BranchHoliday>>();

  const openNew = () => {
    reset({ name: '', holiday_date: '', holiday_type: 'national', is_recurring: false, is_active: true, description: '' });
    setEditingId(null);
    setIsOpen(true);
  };

  const openEdit = (h: BranchHoliday) => {
    reset({ ...h, holiday_date: h.holiday_date.split('T')[0] });
    setEditingId(h.id);
    setIsOpen(true);
  };

  const onSubmit = async (values: Partial<BranchHoliday>) => {
    try {
      setIsSaving(true);
      if (editingId) {
        await branchConfigService.updateHoliday(branchId, editingId, values);
        toast.success('Holiday updated');
      } else {
        await branchConfigService.createHoliday(branchId, values);
        toast.success('Holiday created');
      }
      setIsOpen(false);
      refetch();
    } catch (error: any) {
      toast.error(parseApiError(err));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteHoliday = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await branchConfigService.deleteHoliday(branchId, id);
      toast.success('Holiday deleted');
      refetch();
    } catch (error: any) {
      toast.error(parseApiError(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Holidays</h2>
          <p className="text-muted-foreground mt-1">Manage public holidays and branch closures.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger>
            <Button onClick={openNew} type="button">
              <Plus className="w-4 h-4 mr-2" />
              Add Holiday
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Holiday' : 'Add Holiday'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Name</label>
                <input {...register('name', { required: true })} className={inputClass} placeholder="e.g. Eid-ul-Fitr" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Date</label>
                  <input type="date" {...register('holiday_date', { required: true })} className={inputClass} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Type</label>
                  <select {...register('holiday_type')} className={inputClass}>
                    <option value="national">National</option>
                    <option value="religious">Religious</option>
                    <option value="company">Company</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 pt-2">
                <input type="checkbox" {...register('is_recurring')} className="w-4 h-4 rounded border-gray-300 text-primary" />
                <span className="text-sm font-medium">Recurs every year</span>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {holidays.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed rounded-xl">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p>No holidays configured.</p>
          </div>
        ) : (
          holidays.map((h) => (
            <Card key={h.id} className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-base">{h.name}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(h.holiday_date).toLocaleDateString()}
                      {h.is_recurring && <Badge variant="secondary" className="ml-2 text-[10px]">Recurring</Badge>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(h)}>
                      <Edit className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950" onClick={() => deleteHoliday(h.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
