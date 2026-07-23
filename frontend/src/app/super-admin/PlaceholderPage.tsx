'use client';

import { Clock } from 'lucide-react';
import { motion } from 'framer-motion';
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
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="text-center max-w-md"
      >
        <motion.div
          initial={{ scale: 0.8, rotate: -6 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
          style={{ background: accent + '18', border: `1px solid ${accent}30` }}
        >
          <Icon className="w-9 h-9" style={{ color: accent }} />
        </motion.div>
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
      </motion.div>
    </div>
  );
}
