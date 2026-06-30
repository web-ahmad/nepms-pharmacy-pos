from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date

from models.hr import Department, Designation, Employee, Attendance, LeaveRequest, Shift, PayrollRun, PayrollLine
from schemas.hr import (
    DepartmentCreate, EmployeeCreate, EmployeeUpdate, AttendanceCreate, 
    LeaveRequestCreate, ShiftCreate, PayrollRunCreate
)

class HRRepository:
    def __init__(self, db: Session):
        self.db = db

    # Departments
    def get_departments(self, tenant_id: str):
        return self.db.query(Department).filter(Department.tenant_id == tenant_id).all()

    def create_department(self, tenant_id: str, obj_in: DepartmentCreate):
        db_obj = Department(tenant_id=tenant_id, name=obj_in.name)
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    # Designations
    def get_designations(self, tenant_id: str):
        return self.db.query(Designation).filter(Designation.tenant_id == tenant_id).all()

    def create_designation(self, tenant_id: str, name: str):
        db_obj = Designation(tenant_id=tenant_id, name=name)
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    # Employees
    def get_employees(self, tenant_id: str):
        return self.db.query(Employee).filter(Employee.tenant_id == tenant_id).all()

    def get_employee(self, tenant_id: str, employee_id: str):
        return self.db.query(Employee).filter(Employee.tenant_id == tenant_id, Employee.id == employee_id).first()

    def create_employee(self, tenant_id: str, obj_in: EmployeeCreate):
        db_obj = Employee(tenant_id=tenant_id, **obj_in.model_dump())
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def update_employee(self, tenant_id: str, employee_id: str, obj_in: EmployeeUpdate):
        db_obj = self.get_employee(tenant_id, employee_id)
        if not db_obj:
            return None
        
        update_data = obj_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_obj, key, value)
            
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    # Attendance
    def get_attendances(self, tenant_id: str, target_date: date = None):
        q = self.db.query(Attendance).filter(Attendance.tenant_id == tenant_id)
        if target_date:
            q = q.filter(Attendance.date == target_date)
        return q.all()

    def create_attendance(self, tenant_id: str, obj_in: AttendanceCreate):
        db_obj = Attendance(tenant_id=tenant_id, **obj_in.model_dump())
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    # Leave Requests
    def get_leaves(self, tenant_id: str):
        return self.db.query(LeaveRequest).filter(LeaveRequest.tenant_id == tenant_id).all()

    def get_leave(self, tenant_id: str, leave_id: str):
        return self.db.query(LeaveRequest).filter(LeaveRequest.tenant_id == tenant_id, LeaveRequest.id == leave_id).first()

    def create_leave(self, tenant_id: str, obj_in: LeaveRequestCreate):
        db_obj = LeaveRequest(tenant_id=tenant_id, **obj_in.model_dump())
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def update_leave_status(self, db_obj: LeaveRequest, status: str, approved_by: str):
        db_obj.status = status
        db_obj.approved_by = approved_by
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    # Shifts
    def get_shifts(self, tenant_id: str):
        return self.db.query(Shift).filter(Shift.tenant_id == tenant_id).all()

    def create_shift(self, tenant_id: str, obj_in: ShiftCreate):
        db_obj = Shift(tenant_id=tenant_id, **obj_in.model_dump())
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    # Payroll
    def get_payroll_runs(self, tenant_id: str):
        return self.db.query(PayrollRun).filter(PayrollRun.tenant_id == tenant_id).all()

    def get_payroll_run(self, tenant_id: str, run_id: str):
        return self.db.query(PayrollRun).filter(PayrollRun.tenant_id == tenant_id, PayrollRun.id == run_id).first()

    def create_payroll_run(self, tenant_id: str, user_id: str, obj_in: PayrollRunCreate, employees: list):
        db_obj = PayrollRun(
            tenant_id=tenant_id,
            month=obj_in.month,
            year=obj_in.year,
            created_by=user_id
        )
        self.db.add(db_obj)
        self.db.flush()
        
        total_gross = 0.0
        total_net = 0.0
        
        for emp in employees:
            if not emp.is_active:
                continue
                
            base = emp.base_salary
            allowances = 0.0 # Placeholder for advanced logic
            deductions = 0.0 # Placeholder for advanced logic
            net = base + allowances - deductions
            
            line = PayrollLine(
                payroll_run_id=db_obj.id,
                employee_id=emp.id,
                base_salary=base,
                allowances=allowances,
                deductions=deductions,
                net_pay=net
            )
            self.db.add(line)
            total_gross += base + allowances
            total_net += net
            
        db_obj.total_gross = total_gross
        db_obj.total_deductions = total_gross - total_net
        db_obj.total_net = total_net
        
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    # Analytics
    def get_analytics(self, tenant_id: str):
        total_emp = self.db.query(Employee).filter(Employee.tenant_id == tenant_id).count()
        active_emp = self.db.query(Employee).filter(Employee.tenant_id == tenant_id, Employee.is_active == True).count()
        pending_leaves = self.db.query(LeaveRequest).filter(LeaveRequest.tenant_id == tenant_id, LeaveRequest.status == "Pending").count()
        
        # Simple attendance % approx
        total_att = self.db.query(Attendance).filter(Attendance.tenant_id == tenant_id).count()
        present_att = self.db.query(Attendance).filter(Attendance.tenant_id == tenant_id, Attendance.status == "Present").count()
        att_percent = (present_att / total_att * 100) if total_att > 0 else 0.0
        
        # Payroll Cost
        res = self.db.query(func.sum(Employee.base_salary)).filter(Employee.tenant_id == tenant_id, Employee.is_active == True).scalar()
        monthly_cost = res or 0.0
        
        return {
            "total_employees": total_emp,
            "active_employees": active_emp,
            "attendance_percent": round(att_percent, 2),
            "pending_leaves": pending_leaves,
            "monthly_payroll_cost": monthly_cost
        }
