import { ReactNode } from 'react';

// The Compliance Center is a single page — audit trail, risk signals, sign-in
// history and retention all live there, so no sub-navigation is needed.
export default function ComplianceLayout({ children }: { children: ReactNode }) {
  return <div className="flex h-full flex-col">{children}</div>;
}
