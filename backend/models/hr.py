from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Boolean, Date, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from database import Base

class Department(Base):
    __tablename__ = "departments"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), index=True)
    name = Column(String)
    description = Column(String, nullable=True)
    head_id = Column(String, ForeignKey("employees.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    
    employees = relationship("Employee", back_populates="department", foreign_keys="[Employee.department_id]")
    head = relationship("Employee", foreign_keys=[head_id])

class Designation(Base):
    __tablename__ = "designations"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), index=True)
    name = Column(String)
    department_id = Column(String, ForeignKey("departments.id"), nullable=True)
    description = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    
    department = relationship("Department")
    employees = relationship("Employee", back_populates="designation")

class Employee(Base):
    __tablename__ = "employees"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), index=True)
    branch_id = Column(String, ForeignKey("branches.id"), nullable=True)
    
    first_name = Column(String)
    last_name = Column(String)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    cnic = Column(String, nullable=True)
    address = Column(String, nullable=True)
    dob = Column(Date, nullable=True)
    gender = Column(String, nullable=True)
    
    employee_id = Column(String, unique=True, index=True, nullable=True)
    employee_code = Column(String, unique=True, index=True, nullable=True)
    username = Column(String, unique=True, index=True, nullable=True)
    
    department_id = Column(String, ForeignKey("departments.id"))
    designation_id = Column(String, ForeignKey("designations.id"))
    reporting_manager_id = Column(String, ForeignKey("employees.id"), nullable=True)
    shift_id = Column(String, ForeignKey("shifts.id"), nullable=True)
    
    join_date = Column(Date)
    employment_type = Column(String, nullable=True)
    salary_grade = Column(String, nullable=True)
    
    base_salary = Column(Float, default=0.0)
    salary_type = Column(String, default="Monthly") # Monthly, Hourly
    account_no = Column(String, nullable=True)
    bank_account = Column(String, nullable=True)
    tax_number = Column(String, nullable=True)
    
    emergency_contact = Column(String, nullable=True)
    blood_group = Column(String, nullable=True)
    biometric_id = Column(String, nullable=True)
    photo = Column(String, nullable=True)
    signature = Column(String, nullable=True)
    
    # Custom Attendance Rules
    weekend_days = Column(JSON, default=list) # e.g. ["Sunday", "Saturday"]
    overtime_allowed = Column(Boolean, default=False)
    standard_break_time = Column(Integer, default=60) # minutes
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    department = relationship("Department", back_populates="employees", foreign_keys=[department_id])
    designation = relationship("Designation", back_populates="employees")
    shift = relationship("Shift", back_populates="employees", foreign_keys=[shift_id])
    attendances = relationship("Attendance", back_populates="employee")
    leave_requests = relationship("LeaveRequest", back_populates="employee")
    payroll_lines = relationship("PayrollLine", back_populates="employee")
    payroll_setting = relationship("PayrollSetting", back_populates="employee", uselist=False)
    
    reporting_manager = relationship("Employee", remote_side=[id])

class Shift(Base):
    __tablename__ = "shifts"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), index=True)
    name = Column(String)
    start_time = Column(String) # HH:MM
    end_time = Column(String) # HH:MM
    grace_period = Column(Integer, default=15)
    is_active = Column(Boolean, default=True)
    
    employees = relationship("Employee", back_populates="shift", foreign_keys="[Employee.shift_id]")

class Attendance(Base):
    __tablename__ = "attendance"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), index=True)
    employee_id = Column(String, ForeignKey("employees.id"))
    date = Column(Date)
    clock_in = Column(DateTime, nullable=True)
    clock_out = Column(DateTime, nullable=True)
    status = Column(String) # Present, Absent, Late, Half Day
    attendance_status = Column(String, nullable=True) # Extended status for detailed view
    
    overtime_minutes = Column(Integer, default=0)
    undertime_minutes = Column(Integer, default=0)
    late_minutes = Column(Integer, default=0)
    early_exit_minutes = Column(Integer, default=0)
    
    check_in_device = Column(String, nullable=True)
    check_out_device = Column(String, nullable=True)
    geo_location = Column(JSON, nullable=True)

    employee = relationship("Employee", back_populates="attendances")

class LeaveRequest(Base):
    __tablename__ = "leave_requests"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), index=True)
    employee_id = Column(String, ForeignKey("employees.id"))
    leave_type = Column(String) # Sick, Casual, Annual
    start_date = Column(Date)
    end_date = Column(Date)
    reason = Column(String)
    status = Column(String, default="Pending") # Pending, Approved, Rejected, Cancelled
    approval_status = Column(String, default="Pending") # Alias/Extended field
    approved_by = Column(String, ForeignKey("users.id"), nullable=True)
    attachment = Column(String, nullable=True)
    leave_balance = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    employee = relationship("Employee", back_populates="leave_requests")

class PayrollRun(Base):
    __tablename__ = "payroll_runs"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), index=True)
    month = Column(Integer)
    year = Column(Integer)
    total_gross = Column(Float, default=0.0)
    total_deductions = Column(Float, default=0.0)
    total_net = Column(Float, default=0.0)
    status = Column(String, default="Draft") # Draft, Paid
    journal_entry_id = Column(String, nullable=True) # Linked to accounting
    remarks = Column(String, nullable=True)
    approved_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_by = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    lines = relationship("PayrollLine", back_populates="payroll_run")

class PayrollLine(Base):
    __tablename__ = "payroll_lines"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    payroll_run_id = Column(String, ForeignKey("payroll_runs.id"))
    employee_id = Column(String, ForeignKey("employees.id"))
    base_salary = Column(Float, default=0.0)
    worked_units = Column(String, nullable=True)
    
    allowances = Column(Float, default=0.0)
    deductions = Column(Float, default=0.0)
    overtime = Column(Float, default=0.0)
    bonuses = Column(Float, default=0.0)
    incentives = Column(Float, default=0.0)
    tax = Column(Float, default=0.0)
    provident_fund = Column(Float, default=0.0)
    
    deductions_breakdown = Column(JSON, nullable=True)
    net_pay = Column(Float, default=0.0)
    
    payment_method = Column(String, nullable=True)
    bank_reference = Column(String, nullable=True)

    payroll_run = relationship("PayrollRun", back_populates="lines")
    employee = relationship("Employee", back_populates="payroll_lines")

class Holiday(Base):
    __tablename__ = "holidays"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), index=True)
    date = Column(Date)
    name = Column(String)

class AdvanceSalary(Base):
    __tablename__ = "advance_salaries"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), index=True)
    employee_id = Column(String, ForeignKey("employees.id"))
    amount = Column(Float, default=0.0)
    request_date = Column(Date)
    deduction_month = Column(String) # e.g., "07-2026"
    reason = Column(String, nullable=True)
    status = Column(String, default="Pending") # Pending, Approved, Rejected, Paid
    approved_by = Column(String, ForeignKey("users.id"), nullable=True)
    journal_entry_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    employee = relationship("Employee")

class PayrollSetting(Base):
    __tablename__ = "payroll_settings"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), index=True)
    employee_id = Column(String, ForeignKey("employees.id"), unique=True)
    grace_period_mins = Column(Integer, default=15)
    ot_type = Column(String, default="FIXED_AMOUNT") # FIXED_AMOUNT, PERCENTAGE
    ot_rate = Column(Float, default=0.0)
    ut_type = Column(String, default="FIXED_AMOUNT") # FIXED_AMOUNT, PERCENTAGE
    ut_rate = Column(Float, default=0.0)
    bonus_amount = Column(Float, default=0.0)
    
    employee = relationship("Employee", back_populates="payroll_setting")

# =========================================================================
# Enterprise Phase 10: Missing Models
# =========================================================================

class EmployeeDocument(Base):
    __tablename__ = "employee_documents"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), index=True)
    employee_id = Column(String, ForeignKey("employees.id"))
    document_type = Column(String)
    file_path = Column(String)
    expiry_date = Column(Date, nullable=True)
    verification_status = Column(String, default="Pending")
    uploaded_by = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

class PerformanceReview(Base):
    __tablename__ = "performance_reviews"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), index=True)
    reviewer_id = Column(String, ForeignKey("employees.id"))
    employee_id = Column(String, ForeignKey("employees.id"))
    review_period = Column(String)
    goals = Column(JSON, nullable=True)
    achievements = Column(JSON, nullable=True)
    rating = Column(Float, nullable=True)
    comments = Column(String, nullable=True)
    next_review_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class EmployeeTask(Base):
    __tablename__ = "employee_tasks"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), index=True)
    employee_id = Column(String, ForeignKey("employees.id"))
    assigned_by = Column(String, ForeignKey("users.id"))
    title = Column(String)
    description = Column(String, nullable=True)
    status = Column(String, default="Pending") # Pending, In Progress, Completed, Cancelled
    priority = Column(String, default="Medium") # Low, Medium, High, Critical
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class TrainingProgram(Base):
    __tablename__ = "training_programs"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), index=True)
    branch_id = Column(String, ForeignKey("branches.id"), nullable=True)
    department_id = Column(String, ForeignKey("departments.id"), nullable=True)
    title = Column(String)
    trainer = Column(String, nullable=True)
    capacity = Column(Integer, default=0)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    materials = Column(JSON, nullable=True)
    completion_status = Column(String, default="Upcoming") # Upcoming, Ongoing, Completed, Cancelled
    created_at = Column(DateTime, default=datetime.utcnow)

class TrainingAttendance(Base):
    __tablename__ = "training_attendance"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), index=True)
    program_id = Column(String, ForeignKey("training_programs.id"))
    employee_id = Column(String, ForeignKey("employees.id"))
    status = Column(String, default="Present") # Present, Absent, Passed, Failed
    created_at = Column(DateTime, default=datetime.utcnow)
