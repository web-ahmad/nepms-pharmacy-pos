"use client";

import { useOCRQueue } from '@/features/system/services/system.api';
import OCRQueueTable from '@/features/system/components/OCRQueueTable';

export default function OCRQueuePage() {
  const { data, isLoading } = useOCRQueue();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">AI Extraction Queue</h2>
          <p className="text-sm text-zinc-500 mt-1">Monitor the background workers processing digital prescriptions via OCR.</p>
        </div>
      </div>

      <OCRQueueTable data={data!} isLoading={isLoading} />
    </div>
  );
}
