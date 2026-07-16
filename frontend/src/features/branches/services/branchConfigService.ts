import { api } from '@/services/api';
import {
  BranchSettingsOverview,
  BranchHealth,
  BranchConfiguration,
  BranchWorkingHours,
  BranchHoliday,
  BranchWarehouse,
  BranchCounter,
  BranchPrinter,
  BranchDevice,
  BranchDocumentSeries,
  BranchTaxSetting,
  BranchPreference,
  BranchLicense,
  BranchFinancialAccount,
  BranchPaymentMethod,
  BranchNotificationSetting,
  BranchBranding,
  BranchPosConfig,
  BranchSecuritySetting,
  BranchBackupSetting,
  BranchConfigAuditLog
} from '../types/branchConfig';

export const branchConfigService = {
  // Overview & Health
  getSettingsOverview: async (branchId: string): Promise<BranchSettingsOverview> => {
    const response = await api.get(`/api/v1/enterprise/branches/${branchId}/overview`);
    return response.data;
  },
  getHealth: async (branchId: string): Promise<BranchHealth> => {
    const response = await api.get(`/api/v1/enterprise/branches/${branchId}/health`);
    return response.data;
  },

  // Configuration
  updateConfiguration: async (branchId: string, data: Partial<BranchConfiguration>): Promise<BranchConfiguration> => {
    const response = await api.patch(`/api/v1/enterprise/branches/${branchId}/configuration`, data);
    return response.data;
  },

  // Working Hours
  upsertWorkingHours: async (branchId: string, data: Partial<BranchWorkingHours> & { day_of_week: string }): Promise<BranchWorkingHours> => {
    const response = await api.post(`/api/v1/enterprise/branches/${branchId}/working-hours`, data);
    return response.data;
  },
  deleteWorkingHours: async (branchId: string, id: string): Promise<void> => {
    await api.delete(`/api/v1/enterprise/branches/${branchId}/working-hours/${id}`);
  },

  // Holidays
  createHoliday: async (branchId: string, data: Partial<BranchHoliday>): Promise<BranchHoliday> => {
    const response = await api.post(`/api/v1/enterprise/branches/${branchId}/holidays`, data);
    return response.data;
  },
  updateHoliday: async (branchId: string, id: string, data: Partial<BranchHoliday>): Promise<BranchHoliday> => {
    const response = await api.patch(`/api/v1/enterprise/branches/${branchId}/holidays/${id}`, data);
    return response.data;
  },
  deleteHoliday: async (branchId: string, id: string): Promise<void> => {
    await api.delete(`/api/v1/enterprise/branches/${branchId}/holidays/${id}`);
  },

  // Warehouses
  createWarehouse: async (branchId: string, data: Partial<BranchWarehouse>): Promise<BranchWarehouse> => {
    const response = await api.post(`/api/v1/enterprise/branches/${branchId}/warehouses`, data);
    return response.data;
  },
  updateWarehouse: async (branchId: string, id: string, data: Partial<BranchWarehouse>): Promise<BranchWarehouse> => {
    const response = await api.patch(`/api/v1/enterprise/branches/${branchId}/warehouses/${id}`, data);
    return response.data;
  },
  deleteWarehouse: async (branchId: string, id: string): Promise<void> => {
    await api.delete(`/api/v1/enterprise/branches/${branchId}/warehouses/${id}`);
  },
  setWarehouseDefault: async (branchId: string, id: string): Promise<BranchWarehouse> => {
    const response = await api.post(`/api/v1/enterprise/branches/${branchId}/warehouses/${id}/set-default`);
    return response.data;
  },

  // Counters
  createCounter: async (branchId: string, data: Partial<BranchCounter>): Promise<BranchCounter> => {
    const response = await api.post(`/api/v1/enterprise/branches/${branchId}/counters`, data);
    return response.data;
  },
  updateCounter: async (branchId: string, id: string, data: Partial<BranchCounter>): Promise<BranchCounter> => {
    const response = await api.patch(`/api/v1/enterprise/branches/${branchId}/counters/${id}`, data);
    return response.data;
  },
  deleteCounter: async (branchId: string, id: string): Promise<void> => {
    await api.delete(`/api/v1/enterprise/branches/${branchId}/counters/${id}`);
  },

  // Printers
  createPrinter: async (branchId: string, data: Partial<BranchPrinter>): Promise<BranchPrinter> => {
    const response = await api.post(`/api/v1/enterprise/branches/${branchId}/printers`, data);
    return response.data;
  },
  updatePrinter: async (branchId: string, id: string, data: Partial<BranchPrinter>): Promise<BranchPrinter> => {
    const response = await api.patch(`/api/v1/enterprise/branches/${branchId}/printers/${id}`, data);
    return response.data;
  },
  deletePrinter: async (branchId: string, id: string): Promise<void> => {
    await api.delete(`/api/v1/enterprise/branches/${branchId}/printers/${id}`);
  },
  setPrinterDefault: async (branchId: string, id: string): Promise<BranchPrinter> => {
    const response = await api.post(`/api/v1/enterprise/branches/${branchId}/printers/${id}/set-default`);
    return response.data;
  },

  // Devices
  updateDevice: async (branchId: string, id: string, data: Partial<BranchDevice>): Promise<BranchDevice> => {
    const response = await api.patch(`/api/v1/enterprise/branches/${branchId}/devices/${id}`, data);
    return response.data;
  },
  deleteDevice: async (branchId: string, id: string): Promise<void> => {
    await api.delete(`/api/v1/enterprise/branches/${branchId}/devices/${id}`);
  },

  // Document Series
  upsertDocumentSeries: async (branchId: string, data: Partial<BranchDocumentSeries> & { document_type: string }): Promise<BranchDocumentSeries> => {
    const response = await api.post(`/api/v1/enterprise/branches/${branchId}/document-series`, data);
    return response.data;
  },
  resetDocumentSeries: async (branchId: string, id: string): Promise<BranchDocumentSeries> => {
    const response = await api.post(`/api/v1/enterprise/branches/${branchId}/document-series/${id}/reset`);
    return response.data;
  },

  // Tax Settings
  createTaxSetting: async (branchId: string, data: Partial<BranchTaxSetting>): Promise<BranchTaxSetting> => {
    const response = await api.post(`/api/v1/enterprise/branches/${branchId}/tax-settings`, data);
    return response.data;
  },
  updateTaxSetting: async (branchId: string, id: string, data: Partial<BranchTaxSetting>): Promise<BranchTaxSetting> => {
    const response = await api.patch(`/api/v1/enterprise/branches/${branchId}/tax-settings/${id}`, data);
    return response.data;
  },
  deleteTaxSetting: async (branchId: string, id: string): Promise<void> => {
    await api.delete(`/api/v1/enterprise/branches/${branchId}/tax-settings/${id}`);
  },

  // Preferences
  bulkSetPreferences: async (branchId: string, preferences: Partial<BranchPreference>[]): Promise<BranchPreference[]> => {
    const response = await api.post(`/api/v1/enterprise/branches/${branchId}/preferences/bulk`, { preferences });
    return response.data;
  },

  // Licenses
  createLicense: async (branchId: string, data: Partial<BranchLicense>): Promise<BranchLicense> => {
    const response = await api.post(`/api/v1/enterprise/branches/${branchId}/licenses`, data);
    return response.data;
  },
  updateLicense: async (branchId: string, id: string, data: Partial<BranchLicense>): Promise<BranchLicense> => {
    const response = await api.patch(`/api/v1/enterprise/branches/${branchId}/licenses/${id}`, data);
    return response.data;
  },
  deleteLicense: async (branchId: string, id: string): Promise<void> => {
    await api.delete(`/api/v1/enterprise/branches/${branchId}/licenses/${id}`);
  },

  // Financial Accounts
  createFinancialAccount: async (branchId: string, data: Partial<BranchFinancialAccount>): Promise<BranchFinancialAccount> => {
    const response = await api.post(`/api/v1/enterprise/branches/${branchId}/financial-accounts`, data);
    return response.data;
  },
  updateFinancialAccount: async (branchId: string, id: string, data: Partial<BranchFinancialAccount>): Promise<BranchFinancialAccount> => {
    const response = await api.patch(`/api/v1/enterprise/branches/${branchId}/financial-accounts/${id}`, data);
    return response.data;
  },
  deleteFinancialAccount: async (branchId: string, id: string): Promise<void> => {
    await api.delete(`/api/v1/enterprise/branches/${branchId}/financial-accounts/${id}`);
  },
  setFinancialAccountDefault: async (branchId: string, id: string): Promise<BranchFinancialAccount> => {
    const response = await api.post(`/api/v1/enterprise/branches/${branchId}/financial-accounts/${id}/set-default`);
    return response.data;
  },

  // Payment Methods
  createPaymentMethod: async (branchId: string, data: Partial<BranchPaymentMethod>): Promise<BranchPaymentMethod> => {
    const response = await api.post(`/api/v1/enterprise/branches/${branchId}/payment-methods`, data);
    return response.data;
  },
  updatePaymentMethod: async (branchId: string, id: string, data: Partial<BranchPaymentMethod>): Promise<BranchPaymentMethod> => {
    const response = await api.patch(`/api/v1/enterprise/branches/${branchId}/payment-methods/${id}`, data);
    return response.data;
  },
  deletePaymentMethod: async (branchId: string, id: string): Promise<void> => {
    await api.delete(`/api/v1/enterprise/branches/${branchId}/payment-methods/${id}`);
  },

  // Notification Settings
  updateNotificationSetting: async (branchId: string, eventType: string, data: Partial<BranchNotificationSetting>): Promise<BranchNotificationSetting> => {
    const response = await api.patch(`/api/v1/enterprise/branches/${branchId}/notification-settings/${eventType}`, data);
    return response.data;
  },

  // Branding
  updateBranding: async (branchId: string, data: Partial<BranchBranding>): Promise<BranchBranding> => {
    const response = await api.patch(`/api/v1/enterprise/branches/${branchId}/branding`, data);
    return response.data;
  },

  // POS Config
  updatePosConfig: async (branchId: string, data: Partial<BranchPosConfig>): Promise<BranchPosConfig> => {
    const response = await api.patch(`/api/v1/enterprise/branches/${branchId}/pos-config`, data);
    return response.data;
  },

  // Security Settings
  updateSecuritySettings: async (branchId: string, data: Partial<BranchSecuritySetting>): Promise<BranchSecuritySetting> => {
    const response = await api.patch(`/api/v1/enterprise/branches/${branchId}/security-settings`, data);
    return response.data;
  },

  // Backup Settings
  updateBackupSettings: async (branchId: string, data: Partial<BranchBackupSetting>): Promise<BranchBackupSetting> => {
    const response = await api.patch(`/api/v1/enterprise/branches/${branchId}/backup-settings`, data);
    return response.data;
  },

  // Audit Logs
  getAuditLogs: async (branchId: string, params?: { module?: string; search?: string; skip?: number; limit?: number }): Promise<{ items: BranchConfigAuditLog[]; total: number }> => {
    const response = await api.get(`/api/v1/enterprise/branches/${branchId}/config-audit-log`, { params });
    return response.data;
  },
};

