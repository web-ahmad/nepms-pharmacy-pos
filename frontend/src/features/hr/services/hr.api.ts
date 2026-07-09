import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { 
  Department, Designation, Employee, Shift,  Attendance,
  ClockInRequest,
  ClockOutRequest,
  AttendanceUpdate,
  BulkAttendanceRow,
  BulkAttendanceResponse,
  AttendanceWeeklySummaryResponse,
  LeaveRequest,
  PayrollRun,
  PayrollLine,
  HRAnalytics,
  AdvanceSalary,
} from '../types/hr';

// Departments
export const useDepartments = () => {
  return useQuery({
    queryKey: ['hr', 'departments'],
    queryFn: async () => {
      const res = await api.get('/api/v1/hr/departments');
      return res.data as Department[];
    }
  });
};

export const useCreateDepartment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Department>) => {
      const res = await api.post('/api/v1/hr/departments', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'departments'] });
    }
  });
};

export const useUpdateDepartment = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Department>) => {
      const res = await api.put(`/api/v1/hr/departments/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'departments'] });
    }
  });
};

// Designations
export const useDesignations = () => {
  return useQuery({
    queryKey: ['hr', 'designations'],
    queryFn: async () => {
      const res = await api.get('/api/v1/hr/designations');
      return res.data as Designation[];
    }
  });
};

export const useCreateDesignation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Designation>) => {
      const res = await api.post('/api/v1/hr/designations', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'designations'] });
    }
  });
};

export const useUpdateDesignation = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Designation>) => {
      const res = await api.put(`/api/v1/hr/designations/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'designations'] });
    }
  });
};

// Employees
export const useEmployees = () => {
  return useQuery({
    queryKey: ['hr', 'employees'],
    queryFn: async () => {
      const res = await api.get('/api/v1/hr/employees');
      return res.data as Employee[];
    }
  });
};

export const useEmployee = (id: string) => {
  return useQuery({
    queryKey: ['hr', 'employees', id],
    queryFn: async () => {
      const res = await api.get(`/api/v1/hr/employees/${id}`);
      return res.data as Employee;
    },
    enabled: !!id
  });
};

export const useCreateEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Employee>) => {
      const res = await api.post('/api/v1/hr/employees', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'employees'] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'analytics'] });
    }
  });
};

export const useUpdateEmployee = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Employee>) => {
      const res = await api.put(`/api/v1/hr/employees/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'employees'] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'employees', id] });
    }
  });
};

export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/api/v1/hr/employees/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'employees'] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'analytics'] });
    }
  });
};

// Shifts
export const useShifts = () => {
  return useQuery({
    queryKey: ['hr', 'shifts'],
    queryFn: async () => {
      const res = await api.get('/api/v1/hr/shifts');
      return res.data as Shift[];
    }
  });
};

export const useCreateShift = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Shift>) => {
      const res = await api.post('/api/v1/hr/shifts', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'shifts'] });
    }
  });
};

export const useUpdateShift = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Shift>) => {
      const res = await api.put(`/api/v1/hr/shifts/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'shifts'] });
    }
  });
};

// Attendance
export const useAttendance = (month?: number, year?: number) => {
  return useQuery({
    queryKey: ['hr', 'attendance', month, year],
    queryFn: async () => {
      let url = '/api/v1/hr/attendance?';
      if (month) url += `month=${month}&`;
      if (year) url += `year=${year}&`;
      const res = await api.get(url);
      return res.data as Attendance[];
    }
  });
};


export const useMonthlyAttendance = (employeeId?: string, month?: number, year?: number) => {
  return useQuery({
    queryKey: ['hr', 'attendance', employeeId, month, year],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (employeeId) queryParams.append('employee_id', employeeId);
      if (month) queryParams.append('month', month.toString());
      if (year) queryParams.append('year', year.toString());
      
      const res = await api.get(`/api/v1/hr/attendance?${queryParams.toString()}`);
      return res.data as Attendance[];
    },
    enabled: !!employeeId && !!month && !!year
  });
};

export const useTodayAttendance = (employeeId: string | null) => {
  return useQuery({
    queryKey: ['hr', 'attendance', 'today', employeeId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/hr/attendance/today/${employeeId}`);
      return res.data as Attendance | null;
    },
    enabled: !!employeeId,
    retry: false,
  });
};

export const useClockIn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ClockInRequest) => {
      const res = await api.post('/api/v1/hr/attendance/clock-in', data);
      return res.data as Attendance;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'attendance'] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'attendance', 'today', variables.employee_id] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'analytics'] });
    }
  });
};

export const useClockOut = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ClockOutRequest & { employee_id: string }) => {
      const res = await api.post('/api/v1/hr/attendance/clock-out', { attendance_id: data.attendance_id });
      return res.data as Attendance;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'attendance'] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'attendance', 'today', variables.employee_id] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'analytics'] });
    }
  });
};

export const useCreateAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Attendance>) => {
      const res = await api.post('/api/v1/hr/attendance', data);
      return res.data as Attendance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'attendance'] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'analytics'] });
    }
  });
};

export const useUpdateAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AttendanceUpdate }) => {
      const res = await api.put(`/api/v1/hr/attendance/${id}`, data);
      return res.data as Attendance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'attendance'] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'analytics'] });
    }
  });
};

export const useBulkAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: BulkAttendanceRow[]) => {
      const res = await api.post('/api/v1/hr/attendance/bulk', data);
      return res.data as BulkAttendanceResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'attendance'] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'analytics'] });
    }
  });
};

export const useResetMonthlyAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { employeeId: string; month: number; year: number }) => {
      const res = await api.delete(
        `/api/v1/hr/attendance/monthly-batch?employeeId=${params.employeeId}&month=${params.month}&year=${params.year}`
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'attendance'] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'analytics'] });
    }
  });
};

export const useAttendanceWeeklySummary = () => {
  return useQuery({
    queryKey: ['hr', 'attendance', 'weekly-summary'],
    queryFn: async () => {
      const res = await api.get('/api/v1/hr/attendance/weekly-summary');
      return res.data as AttendanceWeeklySummaryResponse;
    }
  });
};

// Leaves
export const useLeaveRequests = () => {
  return useQuery({
    queryKey: ['hr', 'leaves'],
    queryFn: async () => {
      const res = await api.get('/api/v1/hr/leaves');
      return res.data as LeaveRequest[];
    }
  });
};

export const useCreateLeaveRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<LeaveRequest>) => {
      const res = await api.post('/api/v1/hr/leaves', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'leaves'] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'analytics'] });
    }
  });
};

export const useApproveLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/api/v1/hr/leaves/${id}/approve`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'leaves'] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'analytics'] });
    }
  });
};

export const useRejectLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/api/v1/hr/leaves/${id}/reject`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'leaves'] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'analytics'] });
    }
  });
};


// Payroll
export const usePayrollRuns = () => {
  return useQuery({
    queryKey: ['hr', 'payroll'],
    queryFn: async () => {
      try {
        const res = await api.get('/api/v1/hr/payroll');
        return res.data as PayrollRun[];
      } catch (error: any) {
        console.error("Failed to fetch payroll runs:", error.response?.data || error.message);
        throw error;
      }
    }
  });
};

export const usePreviewPayroll = (month: number, year: number, departmentId?: string) => {
  return useQuery({
    queryKey: ['hr', 'payroll', 'preview', month, year, departmentId],
    queryFn: async () => {
      let url = `/api/v1/hr/payroll/preview?month=${month}&year=${year}`;
      if (departmentId && departmentId !== 'all') {
        url += `&department_id=${departmentId}`;
      }
      const res = await api.get(url);
      return res.data as PayrollLine[];
    },
    enabled: !!month && !!year,
    staleTime: 0,
  });
};

export const usePayrollDetails = (id: string) => {
  return useQuery({
    queryKey: ['hr', 'payroll', id],
    queryFn: async () => {
      const res = await api.get(`/api/v1/hr/payroll/${id}`);
      return res.data as PayrollRun;
    },
    enabled: !!id
  });
};

export const useRunPayroll = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { month: number; year: number; department_id?: string }) => {
      const payload = { ...data };
      if (payload.department_id === 'all') {
        delete payload.department_id;
      }
      const res = await api.post('/api/v1/hr/payroll/run', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'payroll'] });
    }
  });
};

export const usePayrollSummary = () => {
  return useQuery({
    queryKey: ['hr', 'payroll', 'summary'],
    queryFn: async () => {
      const res = await api.get('/api/v1/hr/payroll/summary');
      return res.data as { total_payroll_cost: number, pending_payouts: number, overtime_burden: number };
    }
  });
};

export const useFinalizePayroll = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/api/v1/hr/payroll/${id}/finalize`);
      return res.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'payroll'] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'payroll', id] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'payroll', 'summary'] });
    }
  });
};

export const useSubmitPayroll = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/api/v1/hr/payroll/${id}/submit`);
      return res.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'payroll'] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'payroll', id] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'payroll', 'summary'] });
    }
  });
};

export const useApprovePayroll = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; override?: boolean; remarks?: string }) => {
      const { id, override, remarks } = data;
      const res = await api.post(`/api/v1/hr/payroll/${id}/approve`, { override, remarks });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'payroll'] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'payroll', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'payroll', 'summary'] });
    }
  });
};

export const useRejectPayroll = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/api/v1/hr/payroll/${id}/reject`);
      return res.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'payroll'] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'payroll', id] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'payroll', 'summary'] });
    }
  });
};

// Analytics
export const useHRAnalytics = () => {
  return useQuery({
    queryKey: ['hr', 'analytics'],
    queryFn: async () => {
      const res = await api.get('/api/v1/hr/analytics');
      return res.data as HRAnalytics;
    }
  });
};

// Advances
export const useAdvances = () => {
  return useQuery({
    queryKey: ['hr', 'advances'],
    queryFn: async () => {
      const res = await api.get('/api/v1/hr/advances');
      return res.data as AdvanceSalary[];
    }
  });
};

export const useCreateAdvance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/api/v1/hr/advances', data);
      return res.data as AdvanceSalary;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'advances'] });
    }
  });
};

export const useApproveAdvance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/api/v1/hr/advances/${id}/approve`);
      return res.data as AdvanceSalary;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'advances'] });
    }
  });
};
