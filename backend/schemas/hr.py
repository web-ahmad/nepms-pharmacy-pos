from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, date

# Department
class DepartmentBase(BaseModel):
    name: str

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentResponse(DepartmentBase):
    id: str
    class Config:
        from_attributes = True

# Designation
class DesignationBase(BaseModel):
    name: str

class DesignationCreate(DesignationBase):
    pass

class DesignationResponse(DesignationBase):
    id: str
    class Config:
        from_attributes = True

# Employee
class EmployeeBase(BaseModel):
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    department_id: str
    designation_id: str
    join_date: date
    base_salary: float
    is_active: bool = True

class EmployeeCreate(EmployeeBase):
    pass

class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
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

class ShiftCreate(ShiftBase):
    pass

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
