'use client';
import { Settings } from 'lucide-react';
import { PlaceholderPage } from '../PlaceholderPage';

export default function SettingsPage() {
  return (
    <PlaceholderPage
      icon={Settings}
      title="Settings"
      description="Configure global platform settings, feature flags, email templates, and system-wide defaults for NEPMS."
      accent="#64748b"
    />
  );
}
