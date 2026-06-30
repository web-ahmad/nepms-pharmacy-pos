export interface SystemModule {
  id: string;
  module_key: string;
  module_name: string;
  category: string;
  is_enabled: boolean;
}

export interface TenantSettings {
  id: string;
  company_settings?: Record<string, any>;
  branch_settings?: Record<string, any>;
  tax_settings?: Record<string, any>;
  currency_settings?: Record<string, any>;
  invoice_settings?: Record<string, any>;
  pos_settings?: Record<string, any>;
  inventory_settings?: Record<string, any>;
  crm_settings?: Record<string, any>;
  prescription_settings?: Record<string, any>;
  hr_settings?: Record<string, any>;
}
