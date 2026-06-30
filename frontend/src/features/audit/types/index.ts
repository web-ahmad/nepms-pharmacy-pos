export interface AuditLog {
  timestamp: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
}

export interface AuditResponse {
  title: string;
  headers: string[];
  rows: AuditLog[];
  total_records: number;
}
