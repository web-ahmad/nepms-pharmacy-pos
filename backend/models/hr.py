from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Boolean, Date
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from database import Base

class Department(Base):
    __tablename__ = "departments"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), index=True)
    name = Column(String)
    
    employees = relationship("Employee", back_populates="department")

class Designation(Base):
    __tablename__ = "designations"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), index=True)
    name = Column(String)
    
    employees = relationship("Employee", back_populates="designation")

class Employee(Base):
    __tablename__ = "employees"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), index=True)
    first_name = Column(String)
    last_name = Column(String)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    department_id = Column(String, ForeignKey("departments.id"))
    designation_id = Column(String, ForeignKey("designations.id"))
    join_date = Column(Date)
    base_salary = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    department = relationship("Department", back_populates="employees")
    designation = relationship("Designation", back_populates="employees")
    attendances = relationship("Attendance", back_populates="employee")
    leave_requests = relationship("LeaveRequest", back_populates="employee")
    payroll_lines = relationship("PayrollLine", back_populates="employee")

class Shift(Base):
    __tablename__ = "shifts"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), index=True)
    name = Column(String)
    start_time = Column(String) # HH:MM
    end_time = Column(String) # HH:MM

class Attendance(Base):
    __tablename__ = "attendance"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), index=True)
    employee_id = Column(String, ForeignKey("employees.id"))
    date = Column(Date)
    clock_in = Column(DateTime, nullable=True)
    clock_out = Column(DateTime, nullable=True)
    status = Column(String) # Present, Absent, Late, Half Day

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
    status = Column(String, default="Pending") # Pending, Approved, Rejected
    approved_by = Column(String, ForeignKey("users.id"), nullable=True)
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
    created_by = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    lines = relationship("PayrollLine", back_populates="payroll_run")

class PayrollLine(Base):
    __tablename__ = "payroll_lines"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    payroll_run_id = Column(String, ForeignKey("payroll_runs.id"))
    employee_id = Column(String, ForeignKey("employees.id"))
    base_salary = Column(Float, default=0.0)
    allowances = Column(Float, default=0.0)
    deductions = Column(Float, default=0.0)
    net_pay = Column(Float, default=0.0)

    payroll_run = relationship("PayrollRun", back_populates="lines")
    employee = relationship("Employee", back_populates="payroll_lines")
