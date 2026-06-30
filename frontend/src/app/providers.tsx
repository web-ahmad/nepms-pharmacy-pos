'use client';

// Override Intl.NumberFormat globally to format USD / standard currency as PKR (Rs)
if (typeof Intl !== 'undefined') {
  const OriginalNumberFormat = Intl.NumberFormat;
  // @ts-ignore
  Intl.NumberFormat = function (locales, options) {
    if (options && options.style === 'currency') {
      const opt = { ...options };
      delete opt.style;
      delete opt.currency;
      opt.minimumFractionDigits = opt.minimumFractionDigits ?? 2;
      opt.maximumFractionDigits = opt.maximumFractionDigits ?? 2;
      const formatter = new OriginalNumberFormat(locales, opt);
      return {
        format: (val: number) => `Rs ${formatter.format(val)}`
      };
    }
    return new OriginalNumberFormat(locales, options);
  };
}

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import { ModuleProvider } from '@/lib/modules';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'react-hot-toast';

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <ModuleProvider>
          {children}
          <Toaster position="top-right" />
        </ModuleProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
