import { CheckCircle2, CircleDashed, CheckCircle } from 'lucide-react';

interface PurchaseOrderTimelineProps {
  status: string;
}

export default function PurchaseOrderTimeline({ status }: PurchaseOrderTimelineProps) {
  const steps = [
    { id: 'Draft', label: 'Drafted' },
    { id: 'Approved', label: 'Approved' },
    { id: 'Partially Received', label: 'Partially Received', isOptional: true },
    { id: 'Completed', label: 'Completed' }
  ];

  // Logic to determine active step
  let currentStepIndex = 0;
  if (status === 'Approved') currentStepIndex = 1;
  if (status === 'Partially Received') currentStepIndex = 2;
  if (status === 'Completed') currentStepIndex = 3;
  if (status === 'Cancelled') {
    return (
      <div className="flex items-center justify-center p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 dark:bg-red-900/10 dark:border-red-900/50 dark:text-red-400">
        <span className="font-semibold flex items-center gap-2">
          <CircleDashed size={20} />
          This Purchase Order was Cancelled
        </span>
      </div>
    );
  }

  // If status is Approved or Completed, we can skip Partially Received visually if we want, but let's show the flow.
  // If Completed directly from Approved, mark Partially Received as skipped or done.
  
  return (
    <div className="py-6">
      <div className="relative">
        <div className="absolute left-0 top-1/2 -mt-px w-full h-0.5 bg-zinc-200 dark:bg-zinc-800" aria-hidden="true" />
        <ul className="relative flex justify-between w-full">
          {steps.map((step, stepIdx) => {
            const isCompleted = currentStepIndex > stepIdx || (status === 'Completed' && stepIdx <= 3);
            const isCurrent = currentStepIndex === stepIdx && status !== 'Completed';
            
            // Skip Partially Received visual fill if Completed directly
            if (status === 'Completed' && step.id === 'Partially Received') {
               // Render as a pass-through node
            }

            return (
              <li key={step.id} className="relative text-center">
                <div className="flex flex-col items-center">
                  <span
                    className={`relative flex h-8 w-8 items-center justify-center rounded-full z-10 
                      ${isCompleted 
                        ? 'bg-blue-600' 
                        : isCurrent 
                          ? 'bg-white border-2 border-blue-600 dark:bg-zinc-950' 
                          : 'bg-white border-2 border-zinc-300 dark:bg-zinc-950 dark:border-zinc-700'
                      }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-white" aria-hidden="true" />
                    ) : isCurrent ? (
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-600" aria-hidden="true" />
                    ) : (
                      <span className="h-2.5 w-2.5 rounded-full bg-transparent" aria-hidden="true" />
                    )}
                  </span>
                  <span className={`mt-2 text-xs font-medium ${isCompleted || isCurrent ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
                    {step.label}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
