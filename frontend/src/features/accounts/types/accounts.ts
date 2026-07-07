export type AccountCategory = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';

export interface Account {
  id: string;
  code: string;
  name: string;
  category: AccountCategory;
  is_active: boolean;
  is_system: boolean;
  current_balance: number;
}

export interface JournalEntryLine {
  id?: string;
  account_id: string;
  description?: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  reference: string;
  date: string;
  description: string;
  status: 'Draft' | 'Approved' | 'Voided';
  created_at: string;
  lines: JournalEntryLine[];
}

export interface LedgerRow {
  date: string;
  reference: string;
  journal_desc?: string;
  line_desc?: string;
  account_name: string;
  debit: number;
  credit: number;
  balance: number;
  status?: string;
  source_id?: string;
  created_by_name?: string;
}

export interface LedgerResponse {
  account_name?: string;
  rows: LedgerRow[];
  total_debit: number;
  total_credit: number;
  closing_balance: number;
}

export interface TrialBalanceRow {
  account_code: string;
  account_name: string;
  category: string;
  debit: number;
  credit: number;
}

export interface TrialBalanceResponse {
  date: string;
  rows: TrialBalanceRow[];
  total_debit: number;
  total_credit: number;
}

export interface FinancialReportRow {
  account_name: string;
  amount: number;
}

export interface ProfitLossResponse {
  revenue: FinancialReportRow[];
  expenses: FinancialReportRow[];
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
}

export interface BalanceSheetResponse {
  assets: FinancialReportRow[];
  liabilities: FinancialReportRow[];
  equity: FinancialReportRow[];
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
}

export interface DashboardStatsResponse {
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  total_assets: number;
  cash_balance: number;
  bank_balance: number;
  ar_balance: number;
  ap_balance: number;
}
