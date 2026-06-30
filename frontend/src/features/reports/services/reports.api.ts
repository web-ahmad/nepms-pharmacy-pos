import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { DateRangeParams, ReportResponse } from '../types';
import { format } from 'date-fns';

const toQueryString = (params: DateRangeParams) => {
  const query = new URLSearchParams();
  if (params.start_date) query.append('start_date', params.start_date);
  if (params.end_date) query.append('end_date', params.end_date);
  if (params.period) query.append('period', params.period);
  if (params.cashier_id) query.append('cashier_id', params.cashier_id);
  if (params.branch_id) query.append('branch_id', params.branch_id);
  if (params.export) query.append('export', params.export);
  if (params.expired !== undefined) query.append('expired', params.expired.toString());
  return query.toString();
};

export const exportReport = async (endpoint: string, params: DateRangeParams) => {
  try {
    const qs = toQueryString(params);
    const url = `${endpoint}?${qs}`;
    const response = await api.get(url, { responseType: 'blob' });
    
    // Create blob link to download
    const urlBlob = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = urlBlob;
    
    // Extract filename from headers if possible, or fallback
    const contentDisposition = response.headers['content-disposition'];
    let fileName = `export_${format(new Date(), 'yyyyMMdd_HHmmss')}.${params.export}`;
    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      if (fileNameMatch && fileNameMatch.length === 2) {
        fileName = fileNameMatch[1];
      }
    }
    
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(urlBlob);
  } catch (error) {
    console.error('Export failed', error);
    throw error;
  }
};

export const useReportQuery = (endpoint: string, params: DateRangeParams, enabled = true) => {
  return useQuery({
    queryKey: ['report', endpoint, params],
    queryFn: async () => {
      // Don't send 'export' param for standard JSON fetch
      const fetchParams = { ...params };
      delete fetchParams.export;
      const res = await api.get(`${endpoint}?${toQueryString(fetchParams)}`);
      return res.data as ReportResponse;
    },
    enabled: enabled && !!params.start_date && !!params.end_date,
  });
};
