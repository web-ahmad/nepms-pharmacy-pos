from sqlalchemy.orm import Session
from fastapi import HTTPException
from datetime import datetime, date

from repositories.hr import HRRepository
from schemas.hr import (
    DepartmentCreate, EmployeeCreate, EmployeeUpdate, AttendanceCreate, 
    LeaveRequestCreate, ShiftCreate, PayrollRunCreate
)
from services.auto_posting_service import AutoPostingService
from schemas.accounts import JournalEntryCreate, JournalEntryLineCreate

class HRService:
    def __init__(self, db: Session):
        self.repo = HRRepository(db)
        self.auto_posting = AutoPostingService(db)
        self.db = db

    def get_departments(self, tenant_id: str):
        return self.repo.get_departments(tenant_id)

    def create_department(self, tenant_id: str, obj_in: DepartmentCreate):
        return self.repo.create_department(tenant_id, obj_in)

    def update_department(self, tenant_id: str, dept_id: str, obj_in):
        from schemas.hr import DepartmentUpdate
        dept = self.repo.update_department(tenant_id, dept_id, obj_in)
        if not dept:
            raise HTTPException(404, "Department not found")
        return dept

    def get_designations(self, tenant_id: str):
        return self.repo.get_designations(tenant_id)

    def create_designation(self, tenant_id: str, obj_in):
        return self.repo.create_designation(tenant_id, obj_in)

    def update_designation(self, tenant_id: str, desig_id: str, obj_in):
        desig = self.repo.update_designation(tenant_id, desig_id, obj_in)
        if not desig:
            raise HTTPException(404, "Designation not found")
        return desig

    def get_employees(self, tenant_id: str):
        return self.repo.get_employees(tenant_id)

    def get_employee(self, tenant_id: str, emp_id: str):
        emp = self.repo.get_employee(tenant_id, emp_id)
        if not emp:
            raise HTTPException(404, "Employee not found")
        return emp

    def create_employee(self, tenant_id: str, user_id: str, obj_in: EmployeeCreate):
        emp = self.repo.create_employee(tenant_id, obj_in)
        # Assuming we have an audit service or we just log it directly, standard is via AuditLog
        from models.audit import AuditLog
        self.db.add(AuditLog(
            tenant_id=tenant_id,
            user_id=user_id,
            action="Create Employee",
            entity_type="Employee",
            entity_id=emp.id,
            details=f"Created employee {emp.first_name} {emp.last_name}"
        ))
        self.db.commit()
        return emp

    def update_employee(self, tenant_id: str, user_id: str, emp_id: str, obj_in: EmployeeUpdate):
        emp = self.repo.update_employee(tenant_id, emp_id, obj_in)
        if not emp:
            raise HTTPException(404, "Employee not found")
        from models.audit import AuditLog
        self.db.add(AuditLog(
            tenant_id=tenant_id,
            user_id=user_id,
            action="Update Employee",
            entity_type="Employee",
            entity_id=emp.id,
            details=f"Updated employee {emp.first_name} {emp.last_name}"
        ))
        self.db.commit()
        return emp

    def get_attendances(self, tenant_id: str):
        return self.repo.get_attendances(tenant_id)

    def create_attendance(self, tenant_id: str, obj_in: AttendanceCreate):
        return self.repo.create_attendance(tenant_id, obj_in)

    def get_leaves(self, tenant_id: str):
        return self.repo.get_leaves(tenant_id)

    def create_leave(self, tenant_id: str, obj_in: LeaveRequestCreate):
        return self.repo.create_leave(tenant_id, obj_in)

    def approve_leave(self, tenant_id: str, user_id: str, leave_id: str):
        leave = self.repo.get_leave(tenant_id, leave_id)
        if not leave:
            raise HTTPException(404, "Leave not found")
        
        updated = self.repo.update_leave_status(leave, "Approved", user_id)
        
        from models.audit import AuditLog
        self.db.add(AuditLog(
            tenant_id=tenant_id,
            user_id=user_id,
            action="Approve Leave",
            entity_type="LeaveRequest",
            entity_id=updated.id,
            details=f"Approved leave for {leave.employee_id}"
        ))
        self.db.commit()
        return updated

    def get_shifts(self, tenant_id: str):
        return self.repo.get_shifts(tenant_id)

    def create_shift(self, tenant_id: str, obj_in: ShiftCreate):
        return self.repo.create_shift(tenant_id, obj_in)

    def update_shift(self, tenant_id: str, shift_id: str, obj_in):
        shift = self.repo.update_shift(tenant_id, shift_id, obj_in)
        if not shift:
            raise HTTPException(404, "Shift not found")
        return shift

    def get_payroll_runs(self, tenant_id: str):
        return self.repo.get_payroll_runs(tenant_id)

    def get_payroll_run(self, tenant_id: str, run_id: str):
        run = self.repo.get_payroll_run(tenant_id, run_id)
        if not run:
            raise HTTPException(404, "Payroll run not found")
        return run

    def run_payroll(self, tenant_id: str, user_id: str, obj_in: PayrollRunCreate):
        employees = self.repo.get_employees(tenant_id)
        run = self.repo.create_payroll_run(tenant_id, user_id, obj_in, employees)
        
        # Auto-post to Accounting
        # User defined:
        # DR Salary Expense
        # CR Payroll Payable
        
        try:
            exp_acc = self.auto_posting._get_account_id(tenant_id, "5030") # Using 5030 Operating Expenses, but ideally 5040 Salary
            pay_acc = self.auto_posting._get_account_id(tenant_id, "2000") # Using 2000 AP, ideally 2020 Payroll Payable
            
            entry = JournalEntryCreate(
                reference=f"PAYROLL-{run.month}-{run.year}",
                description=f"Auto Post: Payroll generation {run.month}/{run.year}",
                lines=[
                    JournalEntryLineCreate(account_id=exp_acc, debit=run.total_gross, credit=0),
                    JournalEntryLineCreate(account_id=pay_acc, debit=0, credit=run.total_gross)
                ]
            )
            self.auto_posting.accounts_svc.create_journal_entry(tenant_id, user_id, entry)
        except Exception as e:
            print(f"Warning: Failed to auto post payroll: {e}")
            
        from models.audit import AuditLog
        self.db.add(AuditLog(
            tenant_id=tenant_id,
            user_id=user_id,
            action="Run Payroll",
            entity_type="PayrollRun",
            entity_id=run.id,
            details=f"Generated payroll for {run.month}/{run.year} - Net: {run.total_net}"
        ))
        self.db.commit()
        return run

    def get_analytics(self, tenant_id: str):
        return self.repo.get_analytics(tenant_id)
