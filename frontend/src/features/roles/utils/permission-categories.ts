// Maps each real module key (see backend repositories/enterprise/role.py `_MODULES`)
// to a friendly category used to group the permission matrix in the UI.
export const MODULE_MAPPING: Record<string, string[]> = {
  'Overview': ['dashboard', 'analytics'],
  'Sales & POS': ['pos', 'cashier', 'sales'],
  'Customers & Marketing': ['customers', 'prescriptions', 'marketing'],
  'Inventory': ['inventory', 'stock', 'medicines', 'physical_audit'],
  'Purchase': ['purchase', 'suppliers'],
  'Accounts & Expenses': ['accounts', 'expenses'],
  'Reports': ['reports'],
  'HR & Payroll': ['hr', 'payroll'],
  'Governance': ['compliance', 'audit', 'branches'],
  'Access Control': ['users', 'roles'],
  'Configuration': ['settings', 'notifications'],
  'System': ['system_health', 'backup', 'super_admin'],
};

// Preferred display order for categories.
export const CATEGORY_ORDER: string[] = [
  'Overview', 'Sales & POS', 'Customers & Marketing', 'Inventory', 'Purchase',
  'Accounts & Expenses', 'Reports', 'HR & Payroll', 'Governance',
  'Access Control', 'Configuration', 'System', 'Other',
];

// Preferred display order for the module-wise permission matrix (mirrors the
// backend catalog order). Modules not listed here fall to the end, alphabetical.
export const MODULE_ORDER: string[] = [
  'dashboard', 'analytics',
  'pos', 'cashier', 'sales',
  'customers', 'prescriptions', 'marketing',
  'inventory', 'stock', 'medicines', 'physical_audit',
  'purchase', 'suppliers',
  'accounts', 'expenses',
  'reports',
  'hr', 'payroll',
  'compliance', 'audit', 'branches',
  'users', 'roles',
  'settings', 'notifications',
  'system_health', 'backup', 'super_admin',
];

export const getModuleCategory = (moduleName: string): string => {
  for (const [parentModule, subModules] of Object.entries(MODULE_MAPPING)) {
    if (subModules.includes(moduleName)) {
      return parentModule;
    }
  }
  return 'Other';
};
