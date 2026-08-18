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
  EmployeeDocument,
  PerformanceReview,
  EmployeeTask,
  TrainingProgram,
  TrainingAttendance
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

export const useDeleteDepartment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/api/v1/hr/departments/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'departments'] });
    },
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

// ── Self attendance (logged-in employee clocks themselves) ──────────────────────
export interface MyAttendance {
  employee_id: string;
  employee_name: string;
  attendance: Attendance | null;
}
export const useMyTodayAttendance = () => useQuery({
  queryKey: ['hr', 'attendance', 'my-today'],
  queryFn: async () => (await api.get('/api/v1/hr/attendance/my/today')).data as MyAttendance,
  retry: false,
  refetchInterval: 60000,
});
// Clocking in/out must refresh BOTH the admin attendance lists (['hr','attendance'])
// and the employee's own list on My Attendance (['hr','me','attendance']) — the
// two key prefixes don't overlap, so each has to be invalidated explicitly.
const invalidateAttendance = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['hr', 'attendance'] });
  qc.invalidateQueries({ queryKey: ['hr', 'me', 'attendance'] });
};

export const useMyClockIn = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post('/api/v1/hr/attendance/my/clock-in')).data as Attendance,
    onSuccess: () => invalidateAttendance(qc),
  });
};
export const useMyClockOut = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post('/api/v1/hr/attendance/my/clock-out')).data as Attendance,
    onSuccess: () => invalidateAttendance(qc),
  });
};

// ── Employee Self-Service (ESS): each employee sees ONLY their own HR data ──────
export interface MyHrProfile {
  id: string; name: string; employee_code: string | null;
  email: string | null; phone: string | null;
  department: string | null; designation: string | null;
  joining_date: string | null; base_salary: number | null; salary_type: string | null;
}
export interface MyPayslip {
  id: string; month: number; year: number; status: string;
  base_salary: number; allowances: number; overtime: number;
  bonuses: number; deductions: number; tax: number; net_pay: number;
}
export interface MyLeave {
  id: string; leave_type: string; start_date: string; end_date: string;
  reason: string | null; status: string; rejection_reason?: string | null;
}
export interface MyTraining {
  id: string; title: string; trainer: string | null;
  start_date: string | null; end_date: string | null;
  program_status: string; my_status: string;
}
export interface MyAttendanceSummary {
  month: number; year: number; records: Attendance[];
  present: number; absent: number; total: number;
}

export const useMyHrProfile = () => useQuery({
  queryKey: ['hr', 'me', 'profile'],
  queryFn: async () => (await api.get('/api/v1/hr/me')).data as MyHrProfile,
  retry: false,
});
export const useMyAttendanceSummary = (month?: number, year?: number) => useQuery({
  queryKey: ['hr', 'me', 'attendance', month, year],
  queryFn: async () => (await api.get('/api/v1/hr/me/attendance', { params: { month, year } })).data as MyAttendanceSummary,
  retry: false,
});
export const useMyPayroll = () => useQuery({
  queryKey: ['hr', 'me', 'payroll'],
  queryFn: async () => (await api.get('/api/v1/hr/me/payroll')).data as MyPayslip[],
  retry: false,
});
export const useMyLeaves = () => useQuery({
  queryKey: ['hr', 'me', 'leaves'],
  queryFn: async () => (await api.get('/api/v1/hr/me/leaves')).data as MyLeave[],
  retry: false,
});
export const useMyTraining = () => useQuery({
  queryKey: ['hr', 'me', 'training'],
  queryFn: async () => (await api.get('/api/v1/hr/me/training')).data as MyTraining[],
  retry: false,
});
export const useApplyLeave = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { leave_type: string; start_date: string; end_date: string; reason: string }) =>
      (await api.post('/api/v1/hr/me/leaves', data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr', 'me', 'leaves'] }),
  });
};

// ── Admin: one employee's payroll / training (same shape as the ESS versions) ──
export const useEmployeePayroll = (employeeId?: string) => useQuery({
  queryKey: ['hr', 'employee', employeeId, 'payroll'],
  queryFn: async () => (await api.get(`/api/v1/hr/employees/${employeeId}/payroll`)).data as MyPayslip[],
  enabled: !!employeeId,
  retry: false,
});
export const useEmployeeTraining = (employeeId?: string) => useQuery({
  queryKey: ['hr', 'employee', employeeId, 'training'],
  queryFn: async () => (await api.get(`/api/v1/hr/employees/${employeeId}/training`)).data as MyTraining[],
  enabled: !!employeeId,
  retry: false,
});

// ── ESS: shift / advances / performance / tasks / documents ────────────────────
export interface MyShift {
  id: string; name: string; start_time: string; end_time: string;
  grace_period: number; is_active: boolean;
}
export interface MyAdvance {
  id: string; amount: number; request_date: string | null;
  deduction_month: string | null; reason: string | null; status: string;
  rejection_reason?: string | null;
}
export interface MyReview {
  id: string; review_period: string | null; rating: number | null;
  comments: string | null; goals: unknown; achievements: unknown;
  next_review_date: string | null; reviewer: string | null;
}
export interface MyTask {
  id: string; title: string; description: string | null;
  status: string; priority: string; due_date: string | null;
}
export interface MyDocument {
  id: string; document_type: string; file_path: string;
  expiry_date: string | null; verification_status: string; created_at: string | null;
}

export const useMyShift = () => useQuery({
  queryKey: ['hr', 'me', 'shift'],
  queryFn: async () => (await api.get('/api/v1/hr/me/shift')).data as MyShift | null,
  retry: false,
});
export const useMyAdvances = () => useQuery({
  queryKey: ['hr', 'me', 'advances'],
  queryFn: async () => (await api.get('/api/v1/hr/me/advances')).data as MyAdvance[],
  retry: false,
});
export const useRequestAdvance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { amount: number; deduction_month?: string; reason?: string }) =>
      (await api.post('/api/v1/hr/me/advances', data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr', 'me', 'advances'] }),
  });
};
export const useMyPerformance = () => useQuery({
  queryKey: ['hr', 'me', 'performance'],
  queryFn: async () => (await api.get('/api/v1/hr/me/performance')).data as MyReview[],
  retry: false,
});
export const useMyTasks = () => useQuery({
  queryKey: ['hr', 'me', 'tasks'],
  queryFn: async () => (await api.get('/api/v1/hr/me/tasks')).data as MyTask[],
  retry: false,
});
export const useUpdateMyTaskStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      (await api.patch(`/api/v1/hr/me/tasks/${id}`, { status })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr', 'me', 'tasks'] }),
  });
};
export const useMyDocuments = () => useQuery({
  queryKey: ['hr', 'me', 'documents'],
  queryFn: async () => (await api.get('/api/v1/hr/me/documents')).data as MyDocument[],
  retry: false,
});
export const useUploadMyDocumentFile = () =>
  useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/api/v1/hr/me/documents/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data as { url: string; name: string };
    },
  });
export const useAddMyDocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { document_type: string; file_path: string; expiry_date?: string }) =>
      (await api.post('/api/v1/hr/me/documents', data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr', 'me', 'documents'] }),
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

export const useDeleteAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/api/v1/hr/attendance/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'attendance'] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'me', 'attendance'] });
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

// Rejecting always carries a reason so the employee knows why.
export const useRejectLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, rejection_reason }: { id: string; rejection_reason: string }) => {
      const res = await api.post(`/api/v1/hr/leaves/${id}/reject`, { rejection_reason });
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

// Rejecting always carries a reason so the employee knows why.
export const useRejectAdvance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, rejection_reason }: { id: string; rejection_reason: string }) => {
      const res = await api.post(`/api/v1/hr/advances/${id}/reject`, { rejection_reason });
      return res.data as AdvanceSalary;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'advances'] });
    }
  });
};

// ============================================================================
// Phase 10 New API Hooks
// ============================================================================

// Employee Documents
export const useEmployeeDocuments = (employeeId?: string) => {
  return useQuery({
    queryKey: ['hr', 'employee-documents', employeeId],
    queryFn: async () => {
      const url = employeeId ? `/api/v1/hr/employee-documents?employee_id=${employeeId}` : '/api/v1/hr/employee-documents';
      const res = await api.get(url);
      return res.data as EmployeeDocument[];
    }
  });
};

export const useUploadEmployeeDocument = () => {
  return useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/api/v1/hr/employee-documents/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data as { url: string; name: string };
    },
  });
};

export const useCreateEmployeeDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<EmployeeDocument>) => {
      const res = await api.post('/api/v1/hr/employee-documents', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'employee-documents'] });
    }
  });
};

export const useUpdateEmployeeDocument = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<EmployeeDocument>) => {
      const res = await api.put(`/api/v1/hr/employee-documents/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'employee-documents'] });
    }
  });
};

export const useDeleteEmployeeDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/hr/employee-documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'employee-documents'] });
    }
  });
};

// Performance Reviews
export const usePerformanceReviews = (employeeId?: string) => {
  return useQuery({
    queryKey: ['hr', 'performance-reviews', employeeId],
    queryFn: async () => {
      const url = employeeId ? `/api/v1/hr/performance-reviews?employee_id=${employeeId}` : '/api/v1/hr/performance-reviews';
      const res = await api.get(url);
      return res.data as PerformanceReview[];
    }
  });
};

export const useCreatePerformanceReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<PerformanceReview>) => {
      const res = await api.post('/api/v1/hr/performance-reviews', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'performance-reviews'] });
    }
  });
};

export const useUpdatePerformanceReview = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<PerformanceReview>) => {
      const res = await api.put(`/api/v1/hr/performance-reviews/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'performance-reviews'] });
    }
  });
};

// Employee Tasks
export const useEmployeeTasks = (employeeId?: string) => {
  return useQuery({
    queryKey: ['hr', 'employee-tasks', employeeId],
    queryFn: async () => {
      const url = employeeId ? `/api/v1/hr/employee-tasks?employee_id=${employeeId}` : '/api/v1/hr/employee-tasks';
      const res = await api.get(url);
      return res.data as EmployeeTask[];
    }
  });
};

export const useCreateEmployeeTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<EmployeeTask>) => {
      const res = await api.post('/api/v1/hr/employee-tasks', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'employee-tasks'] });
    }
  });
};

export const useUpdateEmployeeTask = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<EmployeeTask>) => {
      const res = await api.put(`/api/v1/hr/employee-tasks/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'employee-tasks'] });
    }
  });
};

export const useDeleteEmployeeTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/hr/employee-tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'employee-tasks'] });
    }
  });
};

// Training Programs
export const useTrainingPrograms = () => {
  return useQuery({
    queryKey: ['hr', 'training-programs'],
    queryFn: async () => {
      const res = await api.get('/api/v1/hr/training-programs');
      return res.data as TrainingProgram[];
    }
  });
};

export const useCreateTrainingProgram = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<TrainingProgram>) => {
      const res = await api.post('/api/v1/hr/training-programs', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'training-programs'] });
    }
  });
};

export const useUpdateTrainingProgram = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<TrainingProgram>) => {
      const res = await api.put(`/api/v1/hr/training-programs/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'training-programs'] });
    }
  });
};

export const useDeleteTrainingProgram = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/hr/training-programs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'training-programs'] });
    }
  });
};

// Training Attendance
export const useTrainingAttendances = (programId: string) => {
  return useQuery({
    queryKey: ['hr', 'training-attendance', programId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/hr/training-programs/${programId}/attendance`);
      return res.data as TrainingAttendance[];
    },
    enabled: !!programId
  });
};

export const useCreateTrainingAttendance = (programId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<TrainingAttendance>) => {
      const res = await api.post(`/api/v1/hr/training-programs/${programId}/attendance`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'training-attendance', programId] });
    }
  });
};

export const useUpdateTrainingAttendance = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<TrainingAttendance>) => {
      const res = await api.put(`/api/v1/hr/training-attendance/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'training-attendance'] });
    }
  });
};

export const useDeleteTrainingAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/hr/training-attendance/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'training-attendance'] });
    }
  });
};
