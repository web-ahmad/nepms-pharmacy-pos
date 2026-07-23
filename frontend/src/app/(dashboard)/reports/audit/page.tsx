"use client";
import ReportPageShell from '@/features/reports/components/ReportPageShell';
import { Shield, AlertTriangle, Users, Bell, Flame, Banknote } from 'lucide-react';

const TABS = [
  { id: 'audit_event_log',    label: 'Event Log',      icon: Shield,        description: 'Complete chronological audit trail of all system events' },
  { id: 'audit_by_event_type',label: 'By Event Type',  icon: AlertTriangle, description: 'Events grouped by type with severity breakdown' },
  { id: 'audit_by_staff',     label: 'By Staff',       icon: Users,         description: 'Event count and severity per staff member' },
  { id: 'audit_high_severity',label: 'High Severity',  icon: Flame,         description: 'Critical events requiring immediate attention' },
  { id: 'audit_alert_history',label: 'Alert History',  icon: Bell,          description: 'WhatsApp and dashboard notification delivery log' },
  { id: 'cash_session_report',label: 'Cash Sessions',  icon: Banknote,      description: 'Opening/closing balances, discrepancies per session' },
];

export default function AuditReportsPage() {
  return <ReportPageShell title="Audit & Security Reports" icon={Shield} accent="red" tabs={TABS} />;
}
