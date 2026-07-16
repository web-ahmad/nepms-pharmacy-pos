import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BranchSettingsOverview } from '@/features/branches/types/branchConfig';
import { branchConfigService } from '@/features/branches/services/branchConfigService';
import { parseApiError } from '@/utils/errorParser';

interface Props {
  branchId: string;
  data: BranchSettingsOverview;
  refetch: () => void;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function WorkingHoursTab({ branchId, data, refetch }: Props) {
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form with 7 days, merging existing data
  const defaultHours = DAYS.map((day) => {
    const existing = data.working_hours?.find((h) => h.day_of_week === day);
    return {
      day_of_week: day,
      is_closed: existing?.is_closed ?? (day === 'sunday'),
      open_time: existing?.open_time || '09:00',
      close_time: existing?.close_time || '18:00',
      break_start: existing?.break_start || '',
      break_end: existing?.break_end || '',
    };
  });

  const { register, handleSubmit, watch, formState: { isDirty } } = useForm({
    defaultValues: { hours: defaultHours }
  });

  const hoursList = watch('hours');

  const onSubmit = async (values: any) => {
    try {
      setIsSaving(true);
      // Upsert each day individually
      for (const dayData of values.hours) {
        await branchConfigService.upsertWorkingHours(branchId, dayData);
      }
      toast.success('Working hours updated successfully');
      refetch();
    } catch (error: any) {
      toast.error(parseApiError(err));
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass =
    'px-3 py-1.5 text-sm rounded-lg border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Working Hours</h2>
          <p className="text-muted-foreground mt-1">Set the weekly operating schedule for this branch.</p>
        </div>
        <Button type="submit" disabled={!isDirty || isSaving} className="w-full sm:w-auto shrink-0">
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Schedule
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="divide-y">
            {hoursList.map((day, index) => (
              <div key={day.day_of_week} className="p-4 flex flex-col md:flex-row md:items-center gap-4 hover:bg-muted/50 transition-colors">
                <div className="w-40 flex items-center gap-3">
                  <input
                    type="checkbox"
                    {...register(`hours.${index}.is_closed`)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="font-medium capitalize">{day.day_of_week}</span>
                </div>
                
                {day.is_closed ? (
                  <div className="flex-1 text-sm text-muted-foreground italic pl-2">Closed all day</div>
                ) : (
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1 text-sm">
                      <label className="text-muted-foreground text-xs">Open Time</label>
                      <input type="time" {...register(`hours.${index}.open_time`)} className={`w-full ${inputClass}`} />
                    </div>
                    <div className="space-y-1 text-sm">
                      <label className="text-muted-foreground text-xs">Close Time</label>
                      <input type="time" {...register(`hours.${index}.close_time`)} className={`w-full ${inputClass}`} />
                    </div>
                    <div className="space-y-1 text-sm">
                      <label className="text-muted-foreground text-xs">Break Start</label>
                      <input type="time" {...register(`hours.${index}.break_start`)} className={`w-full ${inputClass}`} />
                    </div>
                    <div className="space-y-1 text-sm">
                      <label className="text-muted-foreground text-xs">Break End</label>
                      <input type="time" {...register(`hours.${index}.break_end`)} className={`w-full ${inputClass}`} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
