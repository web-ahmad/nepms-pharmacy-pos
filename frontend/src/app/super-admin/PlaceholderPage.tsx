'use client';

import { Clock } from 'lucide-react';
import React from 'react';

export function PlaceholderPage({
  icon: Icon,
  title,
  description,
  accent = 'var(--sa-accent)',
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  accent?: string;
}) {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-60px)] p-8">
      <div className="text-center max-w-md sa-fade-up">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
          style={{ background: accent + '18', border: `1px solid ${accent}30` }}
        >
          <Icon className="w-9 h-9" style={{ color: accent }} />
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--sa-text)' }}>
          {title}
        </h2>
        <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--sa-text-muted)' }}>
          {description}
        </p>
        <span
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
          style={{
            background: 'var(--sa-warning-muted)',
            color: 'var(--sa-warning)',
            border: '1px solid var(--sa-warning)30',
          }}
        >
          <Clock className="w-3.5 h-3.5" />
          Coming Soon
        </span>
      </div>
    </div>
  );
}
