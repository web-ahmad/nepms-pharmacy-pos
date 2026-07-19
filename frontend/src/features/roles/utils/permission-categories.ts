export const MODULE_CATEGORIES: Record<string, string> = {
  // SaaS & System
  tenant: "Platform & Administration",
  subscription: "Platform & Administration",
  billing: "Platform & Administration",
  saas_settings: "Platform & Administration",
  feature_flags: "Platform & Administration",
  system_health: "Platform & Administration",
  system_logs: "Platform & Administration",
  backups: "Platform & Administration",
  superadmin_audit: "Platform & Administration",
  system: "Platform & Administration",
  branches: "Platform & Administration",
  branch_settings: "Platform & Administration",
  compliance: "Platform & Administration",
  audit: "Platform & Administration",
  users: "Platform & Administration",
  roles: "Platform & Administration",
  permissions: "Platform & Administration",
  settings: "Platform & Administration",
  notifications: "Platform & Administration",

  // Dashboard & Analytics
  dashboard: "Analytics & Dashboards",
  analytics: "Analytics & Dashboards",
  executive_dashboard: "Analytics & Dashboards",
  reports: "Analytics & Dashboards",
  bi_reports: "Analytics & Dashboards",
  report_builder: "Analytics & Dashboards",

  // Sales & POS
  pos: "Sales & POS",
  cashier: "Sales & POS",
  sales: "Sales & POS",
  sales_returns: "Sales & POS",

  // CRM & Marketing
  customers: "CRM & Marketing",
  customer_wallet: "CRM & Marketing",
  customer_loyalty: "CRM & Marketing",
  customer_referrals: "CRM & Marketing",
  crm: "CRM & Marketing",
  marketing: "CRM & Marketing",
  campaigns: "CRM & Marketing",
  coupons: "CRM & Marketing",
  gift_vouchers: "CRM & Marketing",

  // Clinical
  prescriptions: "Clinical",
  doctors: "Clinical",

  // Inventory
  inventory: "Inventory Management",
  medicines: "Inventory Management",
  medicine_categories: "Inventory Management",
  medicine_brands: "Inventory Management",
  medicine_manufacturers: "Inventory Management",
  medicine_generics: "Inventory Management",
  medicine_units: "Inventory Management",
  medicine_strengths: "Inventory Management",
  medicine_dosage_forms: "Inventory Management",
  medicine_routes: "Inventory Management",
  medicine_interactions: "Inventory Management",
  medicine_batches: "Inventory Management",
  warehouses: "Inventory Management",
  rack_management: "Inventory Management",
  stock_transfers: "Inventory Management",
  stock_reservations: "Inventory Management",
  physical_audit: "Inventory Management",
  inventory_adjustments: "Inventory Management",
  ocr_queue: "Inventory Management",

  // Procurement
  purchase: "Procurement",
  purchase_requests: "Procurement",
  purchase_quotations: "Procurement",
  purchase_orders: "Procurement",
  goods_receiving: "Procurement",
  purchase_returns: "Procurement",
  suppliers: "Procurement",
  supplier_payments: "Procurement",
  supplier_ledger: "Procurement",

  // Accounting
  accounting: "Accounting & Finance",
  chart_of_accounts: "Accounting & Finance",
  journal_entries: "Accounting & Finance",
  general_ledger: "Accounting & Finance",
  cash_book: "Accounting & Finance",
  bank_book: "Accounting & Finance",
  receivables: "Accounting & Finance",
  payables: "Accounting & Finance",
  expenses: "Accounting & Finance",
  fixed_assets: "Accounting & Finance",
  profit_loss: "Accounting & Finance",
  balance_sheet: "Accounting & Finance",
  trial_balance: "Accounting & Finance",
  tax_management: "Accounting & Finance",

  // HR
  hr: "HR & Payroll",
  employees: "HR & Payroll",
  attendance: "HR & Payroll",
  leaves: "HR & Payroll",
  payroll: "HR & Payroll",
  payroll_setup: "HR & Payroll",
  departments: "HR & Payroll",
  designations: "HR & Payroll",
  shifts: "HR & Payroll",
  training: "HR & Payroll",
  performance_reviews: "HR & Payroll",
  employee_tasks: "HR & Payroll",
  employee_documents: "HR & Payroll",
  org_chart: "HR & Payroll",
};

export const getModuleCategory = (moduleName: string): string => {
  return MODULE_CATEGORIES[moduleName] || "Other Operations";
};
