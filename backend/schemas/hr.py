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

class DepartmentResponse(DepartmentBase):
    id: str
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

class DesignationResponse(DesignationBase):
    id: str
    employee_count: Optional[int] = 0
    department_name: Optional[str] = None
    class Config:
        from_attributes = True

# Employee
class EmployeeBase(BaseModel):
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
    is_active: bool = True

class EmployeeCreate(EmployeeBase):
    pass

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
    base_salary: Optional[float] = None
    is_active: Optional[bool] = None

class EmployeeResponse(EmployeeBase):
    id: str
    created_at: datetime
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

class ShiftResponse(ShiftBase):
    id: str
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

class AttendanceResponse(AttendanceBase):
    id: str
    class Config:
        from_attributes = True

# Leave Request
class LeaveRequestBase(BaseModel):
    employee_id: str
    leave_type: str
    start_date: date
    end_date: date
    reason: str

class LeaveRequestCreate(LeaveRequestBase):
    pass

class LeaveRequestResponse(LeaveRequestBase):
    id: str
    status: str
    approved_by: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

# Payroll
class PayrollLineBase(BaseModel):
    employee_id: str
    base_salary: float
    allowances: float
    deductions: float
    net_pay: float

class PayrollLineResponse(PayrollLineBase):
    id: str
    class Config:
        from_attributes = True

class PayrollRunBase(BaseModel):
    month: int
    year: int

class PayrollRunCreate(PayrollRunBase):
    pass

class PayrollRunResponse(PayrollRunBase):
    id: str
    total_gross: float
    total_deductions: float
    total_net: float
    status: str
    created_at: datetime
    lines: List[PayrollLineResponse]
    class Config:
        from_attributes = True

# Analytics
class HRAnalyticsResponse(BaseModel):
    total_employees: int
    active_employees: int
    attendance_percent: float
    pending_leaves: int
    monthly_payroll_cost: float
