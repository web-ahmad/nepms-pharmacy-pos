'use client';
// features/branches/components/BranchFormWizard/WizardStepper.tsx
// Animated step indicator for the 7-step branch creation wizard.

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export interface WizardStep {
  id: number;
  label: string;
  description: string;
  icon: React.ElementType;
}

interface Props {
  steps: WizardStep[];
  currentStep: number;
}

export function WizardStepper({ steps, currentStep }: Props) {
  return (
    <div className="flex flex-col gap-1">
      {steps.map((step, i) => {
        const isCompleted = i < currentStep;
        const isCurrent   = i === currentStep;
        const Icon = step.icon;

        return (
          <div key={step.id} className="flex items-start gap-3">
            {/* Circle */}
            <div className="flex flex-col items-center">
              <motion.div
                animate={{
                  backgroundColor: isCompleted
                    ? '#4f46e5'
                    : isCurrent
                    ? '#6366f1'
                    : 'transparent',
                  borderColor: isCompleted || isCurrent ? '#6366f1' : '#d4d4d8',
                  scale: isCurrent ? 1.1 : 1,
                }}
                transition={{ duration: 0.25 }}
                className="w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0"
              >
                {isCompleted ? (
                  <Check size={14} className="text-white" />
                ) : (
                  <Icon
                    size={14}
                    className={isCurrent ? 'text-white' : 'text-zinc-400'}
                  />
                )}
              </motion.div>
              {i < steps.length - 1 && (
                <motion.div
                  className="w-0.5 h-6 mt-1"
                  animate={{ backgroundColor: isCompleted ? '#6366f1' : '#e4e4e7' }}
                  transition={{ duration: 0.25, delay: 0.1 }}
                />
              )}
            </div>

            {/* Label */}
            <div className="pt-1 pb-6 last:pb-0">
              <p
                className={`text-sm font-medium leading-none ${
                  isCurrent
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : isCompleted
                    ? 'text-zinc-700 dark:text-zinc-300'
                    : 'text-zinc-400 dark:text-zinc-600'
                }`}
              >
                {step.label}
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-0.5">{step.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
