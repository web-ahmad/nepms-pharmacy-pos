import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { 
  Department, Designation, Employee, Shift, Attendance, 
  LeaveRequest, PayrollRun, HRAnalytics,
  ClockInRequest, ClockOutRequest
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
export const useAttendance = (date?: string) => {
  return useQuery({
    queryKey: ['hr', 'attendance', date],
    queryFn: async () => {
      const params = date ? `?date=${date}` : '';
      const res = await api.get(`/api/v1/hr/attendance${params}`);
      return res.data as Attendance[];
    }
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
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'attendance'] });
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

// Payroll
export const usePayrollRuns = () => {
  return useQuery({
    queryKey: ['hr', 'payroll'],
    queryFn: async () => {
      const res = await api.get('/api/v1/hr/payroll');
      return res.data as PayrollRun[];
    }
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
    mutationFn: async (data: { month: number; year: number }) => {
      const res = await api.post('/api/v1/hr/payroll/run', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'payroll'] });
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
