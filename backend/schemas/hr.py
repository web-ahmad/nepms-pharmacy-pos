from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, date

# Department
class DepartmentBase(BaseModel):
    name: str
    description: Optional[str] = None
    head_id: Optional[str] = None
    is_active: bool = True

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    head_id: Optional[str] = None
    is_active: Optional[bool] = None

class DepartmentResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    head_id: Optional[str] = None
    is_active: bool = True
    employee_count: Optional[int] = 0

    class Config:
        from_attributes = True

# Designation
class DesignationBase(BaseModel):
    name: str
    department_id: str
    description: Optional[str] = None
    is_active: bool = True

class DesignationCreate(DesignationBase):
    pass

class DesignationUpdate(BaseModel):
    name: Optional[str] = None
    department_id: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class DesignationResponse(BaseModel):
    id: str
    name: str
    department_id: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True
    employee_count: Optional[int] = 0
    department_name: Optional[str] = None

    class Config:
        from_attributes = True

# Employee
class EmployeeBase(BaseModel):
    branch_id: Optional[str] = None
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    cnic: Optional[str] = None
    address: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[str] = None
    employee_id: Optional[str] = None
    username: Optional[str] = None
    shift_id: Optional[str] = None
    department_id: str
    designation_id: str
    join_date: date
    base_salary: float = 0.0
    salary_type: str = "Monthly"
    account_no: Optional[str] = None

    weekend_days: List[str] = []
    overtime_allowed: bool = False
    standard_break_time: int = 60

    is_active: bool = True
    # NOTE: created_at is NOT included here — it is server-generated

class EmployeeCreate(EmployeeBase):
    system_access: bool = False
    password: Optional[str] = None
    role_id: Optional[str] = None

class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    cnic: Optional[str] = None
    address: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[str] = None
    employee_id: Optional[str] = None
    username: Optional[str] = None
    shift_id: Optional[str] = None
    department_id: Optional[str] = None
    designation_id: Optional[str] = None
    join_date: Optional[date] = None
    base_salary: Optional[float] = None
    salary_type: Optional[str] = None
    account_no: Optional[str] = None
    is_active: Optional[bool] = None
    # Attendance rule fields
    weekend_days: Optional[List[str]] = None
    overtime_allowed: Optional[bool] = None
    standard_break_time: Optional[int] = None

class EmployeeResponse(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    cnic: Optional[str] = None
    address: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[str] = None
    employee_id: Optional[str] = None
    username: Optional[str] = None
    shift_id: Optional[str] = None
    department_id: Optional[str] = None
    designation_id: Optional[str] = None
    join_date: Optional[date] = None
    base_salary: Optional[float] = 0.0
    salary_type: Optional[str] = "Monthly"
    account_no: Optional[str] = None
    is_active: bool = True
    created_at: datetime
    # Attendance rule fields
    weekend_days: Optional[List[str]] = []
    overtime_allowed: Optional[bool] = False
    standard_break_time: Optional[int] = 60

    class Config:
        from_attributes = True


# Shift
class ShiftBase(BaseModel):
    name: str
    start_time: str
    end_time: str
    grace_period: Optional[int] = 15
    is_active: bool = True

class ShiftCreate(ShiftBase):
    pass

class ShiftUpdate(BaseModel):
    name: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    grace_period: Optional[int] = None
    is_active: Optional[bool] = None

class ShiftResponse(BaseModel):
    id: str
    name: str
    start_time: str
    end_time: str
    grace_period: Optional[int] = 15
    is_active: bool = True

    class Config:
        from_attributes = True

# Attendance
class AttendanceBase(BaseModel):
    employee_id: str
    date: date
    clock_in: Optional[datetime] = None
    clock_out: Optional[datetime] = None
    status: str

class AttendanceCreate(AttendanceBase):
    pass

class ClockInRequest(BaseModel):
    employee_id: str

class ClockOutRequest(BaseModel):
    attendance_id: str

class AttendanceResponse(AttendanceBase):
    id: str
    # Enriched fields for admin logs
    employee_name: Optional[str] = None
    shift_name: Optional[str] = None
    total_hours_worked: Optional[float] = None
    break_time: Optional[float] = None
    overtime: Optional[float] = None

    class Config:
        from_attributes = True

class AttendanceUpdate(BaseModel):
    clock_in: Optional[datetime] = None
    clock_out: Optional[datetime] = None
    status: Optional[str] = None

class BulkAttendanceRow(BaseModel):
    employee_id: Optional[str] = None       # matches Employee.employee_id field (e.g. EMP-1001)
    employeeId: Optional[str] = None        # UUID from Mark Monthly
    date: date
    clock_in: Optional[str] = None    # "HH:MM" string from CSV
    clock_out: Optional[str] = None   # "HH:MM" string from CSV
    checkInAt: Optional[str] = None
    checkOutAt: Optional[str] = None
    workedHour: Optional[float] = None
    breakTime: Optional[float] = None
    overtime: Optional[float] = None
    status: Optional[str] = None
    shiftId: Optional[str] = None

class BulkAttendanceResponse(BaseModel):
    created: int
    skipped: int
    errors: List[str]

class AttendanceWeeklySummaryDay(BaseModel):
    date: str          # YYYY-MM-DD
    label: str         # Mon, Tue, …
    present: int
    late: int
    absent: int

class AttendanceWeeklySummaryResponse(BaseModel):
    days: List[AttendanceWeeklySummaryDay]

# LeaveRequest
class LeaveRequestBase(BaseModel):
    employee_id: str
    leave_type: str
    start_date: date
    end_date: date
    reason: str
    status: str = "Pending"

class LeaveRequestCreate(LeaveRequestBase):
    pass

class LeaveRequestUpdate(BaseModel):
    status: Optional[str] = None
    approved_by: Optional[str] = None

class LeaveRequestResponse(LeaveRequestBase):
    id: str
    approved_by: Optional[str] = None
    created_at: datetime
    employee_name: Optional[str] = None

    class Config:
        from_attributes = True

# Payroll
class PayrollLineBase(BaseModel):
    employee_id: str
    base_salary: float = 0.0
    worked_units: Optional[str] = None
    allowances: float = 0.0
    deductions: float = 0.0
    deductions_breakdown: Optional[dict] = None
    net_pay: float = 0.0

class PayrollLineResponse(PayrollLineBase):
    id: str
    employee_name: Optional[str] = None
    department_name: Optional[str] = None
    total_ot_hours: Optional[float] = None
    total_ut_hours: Optional[float] = None

    class Config:
        from_attributes = True

class PayrollRunBase(BaseModel):
    month: int
    year: int
    total_gross: float = 0.0
    total_deductions: float = 0.0
    total_net: float = 0.0
    status: str = "Draft"

class PayrollRunCreate(PayrollRunBase):
    department_id: Optional[str] = None

class PayrollApprovalRequest(BaseModel):
    override: bool = False
    remarks: Optional[str] = None

class PayrollRunResponse(PayrollRunBase):
    id: str
    created_by: str
    approved_by: Optional[str] = None
    remarks: Optional[str] = None
    created_at: datetime
    lines: List[PayrollLineResponse] = []

    class Config:
        from_attributes = True

# Holiday
class HolidayBase(BaseModel):
    date: date
    name: str

class HolidayCreate(HolidayBase):
    pass

class HolidayResponse(HolidayBase):
    id: str

    class Config:
        from_attributes = True


# Analytics
class HRAnalyticsResponse(BaseModel):
    total_employees: int
    active_employees: int
    attendance_percent: float
    present_today: int
    late_today: int
    absent_today: int
    on_leave_today: int
    pending_leaves: int
    monthly_payroll_cost: float
    open_tasks: int
    training_progress: float
    pending_reviews: int


# Advance Salary
class AdvanceSalaryBase(BaseModel):
    employee_id: str
    amount: float
    request_date: date
    deduction_month: str
    reason: Optional[str] = None

class AdvanceSalaryCreate(AdvanceSalaryBase):
    pass

class AdvanceSalaryResponse(AdvanceSalaryBase):
    id: str
    status: str
    approved_by: Optional[str] = None
    journal_entry_id: Optional[str] = None
    created_at: datetime
    
    employee_name: Optional[str] = None # Added for convenience in UI

    class Config:
        from_attributes = True

# Payroll Settings
class PayrollSettingBase(BaseModel):
    employee_id: str
    grace_period_mins: Optional[int] = 15
    ot_type: Optional[str] = "FIXED_AMOUNT"
    ot_rate: Optional[float] = 0.0
    ut_type: Optional[str] = "FIXED_AMOUNT"
    ut_rate: Optional[float] = 0.0
    bonus_amount: Optional[float] = 0.0

class PayrollSettingCreate(PayrollSettingBase):
    pass

class PayrollSettingUpdate(BaseModel):
    grace_period_mins: Optional[int] = None
    ot_type: Optional[str] = None
    ot_rate: Optional[float] = None
    ut_type: Optional[str] = None
    ut_rate: Optional[float] = None
    bonus_amount: Optional[float] = None

class PayrollSettingResponse(PayrollSettingBase):
    id: str
    tenant_id: str
    employee_name: Optional[str] = None

    class Config:
        from_attributes = True

# =========================================================================
# Enterprise Phase 10: Missing Schemas
# =========================================================================

# Employee Document
class EmployeeDocumentBase(BaseModel):
    employee_id: str
    document_type: str
    file_path: str
    expiry_date: Optional[date] = None
    verification_status: str = "Pending"

class EmployeeDocumentCreate(EmployeeDocumentBase):
    pass

class EmployeeDocumentUpdate(BaseModel):
    document_type: Optional[str] = None
    file_path: Optional[str] = None
    expiry_date: Optional[date] = None
    verification_status: Optional[str] = None

class EmployeeDocumentResponse(EmployeeDocumentBase):
    id: str
    tenant_id: str
    uploaded_by: str
    created_at: datetime
    employee_name: Optional[str] = None

    class Config:
        from_attributes = True


# Performance Review
class PerformanceReviewBase(BaseModel):
    reviewer_id: str
    employee_id: str
    review_period: str
    goals: Optional[dict] = None
    achievements: Optional[dict] = None
    rating: Optional[float] = None
    comments: Optional[str] = None
    next_review_date: Optional[date] = None

class PerformanceReviewCreate(PerformanceReviewBase):
    pass

class PerformanceReviewUpdate(BaseModel):
    review_period: Optional[str] = None
    goals: Optional[dict] = None
    achievements: Optional[dict] = None
    rating: Optional[float] = None
    comments: Optional[str] = None
    next_review_date: Optional[date] = None

class PerformanceReviewResponse(PerformanceReviewBase):
    id: str
    tenant_id: str
    created_at: datetime
    employee_name: Optional[str] = None
    reviewer_name: Optional[str] = None

    class Config:
        from_attributes = True


# Employee Task
class EmployeeTaskBase(BaseModel):
    employee_id: str
    title: str
    description: Optional[str] = None
    status: str = "Pending"
    priority: str = "Medium"
    due_date: Optional[datetime] = None

class EmployeeTaskCreate(EmployeeTaskBase):
    pass

class EmployeeTaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None

class EmployeeTaskResponse(EmployeeTaskBase):
    id: str
    tenant_id: str
    assigned_by: str
    created_at: datetime
    employee_name: Optional[str] = None
    assigner_name: Optional[str] = None

    class Config:
        from_attributes = True


# Training Program
class TrainingProgramBase(BaseModel):
    title: str
    branch_id: Optional[str] = None
    department_id: Optional[str] = None
    trainer: Optional[str] = None
    capacity: int = 0
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    materials: Optional[dict] = None
    completion_status: str = "Upcoming"

class TrainingProgramCreate(TrainingProgramBase):
    pass

class TrainingProgramUpdate(BaseModel):
    title: Optional[str] = None
    branch_id: Optional[str] = None
    department_id: Optional[str] = None
    trainer: Optional[str] = None
    capacity: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    materials: Optional[dict] = None
    completion_status: Optional[str] = None

class TrainingProgramResponse(TrainingProgramBase):
    id: str
    tenant_id: str
    created_at: datetime
    branch_name: Optional[str] = None
    department_name: Optional[str] = None

    class Config:
        from_attributes = True


# Training Attendance
class TrainingAttendanceBase(BaseModel):
    program_id: str
    employee_id: str
    status: str = "Present"

class TrainingAttendanceCreate(TrainingAttendanceBase):
    pass

class TrainingAttendanceUpdate(BaseModel):
    status: Optional[str] = None

class TrainingAttendanceResponse(TrainingAttendanceBase):
    id: str
    tenant_id: str
    created_at: datetime
    employee_name: Optional[str] = None
    program_title: Optional[str] = None

    class Config:
        from_attributes = True
