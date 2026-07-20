export const MODULE_MAPPING: Record<string, string[]> = {
  'Accounting & Finance': [
    'accounting', 'balance_sheet', 'bank_book', 'cash_book', 
    'chart_of_accounts', 'expenses', 'general_ledger', 
    'journal_entries', 'payables', 'receivables', 
    'profit_loss', 'trial_balance', 'tax_management'
  ],
  'HR & Payroll': [
    'attendance', 'departments', 'designations', 'employees', 
    'employee_documents', 'employee_tasks', 'hr', 'leaves', 
    'payroll', 'payroll_setup', 'performance_reviews', 'shifts', 'training'
  ],
  'Inventory & Stock': [
    'inventory', 'inventory_adjustments', 'goods_receiving', 
    'physical_audit', 'rack_management', 'stock_reservations', 
    'stock_transfers', 'warehouses', 'medicine_batches'
  ],
  'Catalog & Medicines': [
    'medicine_brands', 'medicine_categories', 'medicine_dosage_forms', 
    'medicine_generics', 'medicine_interactions', 'medicine_manufacturers', 
    'medicine_routes', 'medicine_strengths', 'medicine_units', 'medicines'
  ],
  'Sales & POS': [
    'pos', 'sales', 'sales_returns', 'prescriptions', 'coupons', 'gift_vouchers'
  ],
  'Purchases': [
    'purchase', 'purchase_orders', 'purchase_quotations', 'purchase_requests', 'purchase_returns', 'suppliers', 'supplier_ledger', 'supplier_payments'
  ],
  'CRM & Customers': [
    'crm', 'customers', 'customer_loyalty', 'customer_referrals', 'customer_wallet'
  ],
  'System & Settings': [
    'audit', 'branches', 'branch_settings', 'dashboard', 'executive_dashboard', 'notifications', 'permissions', 'roles', 'settings', 'users'
  ]
};

export const getModuleCategory = (moduleName: string): string => {
  for (const [parentModule, subModules] of Object.entries(MODULE_MAPPING)) {
    if (subModules.includes(moduleName)) {
      return parentModule;
    }
  }
  return 'Other';
};
