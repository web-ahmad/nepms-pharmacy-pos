'use client';
import { DollarSign } from 'lucide-react';
import { PlaceholderPage } from '../PlaceholderPage';

export default function CurrencyPage() {
  return (
    <PlaceholderPage
      icon={DollarSign}
      title="Currency"
      description="Configure supported currencies, exchange rates, and regional pricing settings across the platform."
      accent="#10b981"
    />
  );
}
