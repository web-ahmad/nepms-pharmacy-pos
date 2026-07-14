'use client';

import { useAlertConfigs, useUpdateAlertConfig } from '../hooks/useAuditData';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Loader2, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { toast } from 'sonner';

export default function AlertConfigForm({ branchId }: { branchId?: string }) {
  const { data: configs, isLoading } = useAlertConfigs(branchId);
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center items-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {configs?.map((config: any) => (
        <ConfigRow key={config.id} config={config} />
      ))}
      {(!configs || configs.length === 0) && (
        <Card>
          <CardContent className="p-6 text-zinc-500 text-center">
            No alert configurations found for this branch.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ConfigRow({ config }: { config: any }) {
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      is_enabled: config.is_enabled,
      threshold_value: config.threshold_value || '',
      schedule_hour: config.schedule_hour ?? '',
      schedule_day_of_week: config.schedule_day_of_week ?? ''
    }
  });

  const { mutate, isPending } = useUpdateAlertConfig();
  const isReport = config.event_type.startsWith('report:');

  // Reset form if parent data changes
  useEffect(() => {
    reset({
      is_enabled: config.is_enabled,
      threshold_value: config.threshold_value || '',
      schedule_hour: config.schedule_hour ?? '',
      schedule_day_of_week: config.schedule_day_of_week ?? ''
    });
  }, [config, reset]);

  const onSubmit = (data: any) => {
    const payload = {
      id: config.id,
      is_enabled: data.is_enabled,
      ...(data.threshold_value !== '' && { threshold_value: Number(data.threshold_value) }),
      ...(data.schedule_hour !== '' && { schedule_hour: Number(data.schedule_hour) }),
      ...(data.schedule_day_of_week !== '' && { schedule_day_of_week: Number(data.schedule_day_of_week) }),
    };

    mutate(payload, {
      onSuccess: () => toast.success(`Configuration for ${config.event_type} updated!`),
      onError: (err) => toast.error(err.message)
    });
  };

  return (
    <Card>
      <CardHeader className="py-4 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {config.event_type}
            </CardTitle>
            <CardDescription>
              Delivered via: <span className="uppercase font-medium text-blue-600 dark:text-blue-400">{config.notify_via}</span>
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500">Enabled</span>
            <input 
              type="checkbox" 
              {...register('is_enabled')}
              className="w-4 h-4 text-blue-600 rounded border-zinc-300 focus:ring-blue-500"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="py-4">
        <form onSubmit={handleSubmit(onSubmit)} className="flex items-end gap-4">
          
          {!isReport && (
            <div className="flex-1">
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Trigger Threshold
              </label>
              <input
                type="number"
                step="0.01"
                {...register('threshold_value')}
                className="block w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:bg-zinc-900 dark:border-zinc-700 dark:text-white"
                placeholder="e.g. 50.00"
              />
            </div>
          )}

          {isReport && (
            <>
              <div className="flex-1">
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Schedule Hour (0-23)
                </label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  {...register('schedule_hour')}
                  className="block w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:bg-zinc-900 dark:border-zinc-700 dark:text-white"
                  placeholder="e.g. 9 for 9AM"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Day of Week (0-6, 0=Mon)
                </label>
                <input
                  type="number"
                  min="0"
                  max="6"
                  {...register('schedule_day_of_week')}
                  className="block w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:bg-zinc-900 dark:border-zinc-700 dark:text-white"
                  placeholder="e.g. 0 for Monday"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 px-4 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
