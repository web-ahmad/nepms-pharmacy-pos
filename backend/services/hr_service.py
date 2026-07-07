from sqlalchemy.orm import Session
from fastapi import HTTPException
from datetime import datetime, date

from repositories.hr import HRRepository
from schemas.hr import (
    DepartmentCreate, EmployeeCreate, EmployeeUpdate, AttendanceCreate, AttendanceUpdate,
    LeaveRequestCreate, ShiftCreate, PayrollRunCreate, AdvanceSalaryCreate,
    ClockInRequest, ClockOutRequest,
    BulkAttendanceRow, BulkAttendanceResponse, AttendanceWeeklySummaryResponse
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
        from models.audit import AuditLog
        self.db.add(AuditLog(
            tenant_id=tenant_id,
            user_id=user_id,
            action="Create Employee",
            entity_type="Employee",
            entity_id=emp.id,
            new_value={"name": f"{emp.first_name} {emp.last_name}"}
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
            new_value={"name": f"{emp.first_name} {emp.last_name}"}
        ))
        self.db.commit()
        return emp

    def delete_employee(self, tenant_id: str, user_id: str, emp_id: str):
        success = self.repo.delete_employee(tenant_id, emp_id)
        if not success:
            raise HTTPException(404, "Employee not found")
            
        from models.audit import AuditLog
        self.db.add(AuditLog(
            tenant_id=tenant_id,
            user_id=user_id,
            action="Delete Employee",
            entity_type="Employee",
            entity_id=emp_id,
            new_value={"action": "soft_delete"}
        ))
        self.db.commit()
        return {"message": "Employee deleted successfully"}

    def get_attendances(self, tenant_id: str):
        return self.repo.get_attendances(tenant_id)

    def get_attendance_logs(
        self, tenant_id: str, target_date: date = None,
        employee_id: str = None, month: int = None, year: int = None
    ):
        """Return enriched attendance logs (with employee name, shift, hours)."""
        return self.repo.get_attendances_enriched(tenant_id, target_date, employee_id, month, year)

    def get_today_attendance(self, tenant_id: str, employee_id: str):
        """Fetch today's attendance record for the given employee."""
        return self.repo.get_today_attendance(tenant_id, employee_id)

    def clock_in(self, tenant_id: str, employee_id: str):
        # Prevent double clock-in
        existing = self.repo.get_today_attendance(tenant_id, employee_id)
        if existing:
            raise HTTPException(status_code=409, detail="Already clocked in today")
        result = self.repo.clock_in(tenant_id, employee_id)
        if not result:
            raise HTTPException(status_code=404, detail="Employee not found")
        return result

    def clock_out(self, tenant_id: str, attendance_id: str):
        result = self.repo.clock_out(tenant_id, attendance_id)
        if not result:
            raise HTTPException(status_code=404, detail="Attendance record not found")
        return result

    def create_attendance(self, tenant_id: str, obj_in: AttendanceCreate):
        return self.repo.create_attendance(tenant_id, obj_in)

    def update_attendance(self, tenant_id: str, attendance_id: str, obj_in: AttendanceUpdate):
        rec = self.repo.update_attendance(tenant_id, attendance_id, obj_in)
        if not rec:
            raise HTTPException(status_code=404, detail="Attendance record not found")
        return rec

    def bulk_create_attendance(self, tenant_id: str, rows: list):
        res = self.repo.bulk_create_attendance(tenant_id, rows)
        return res

    def delete_monthly_attendance_batch(self, tenant_id: str, employee_id: str, month: int, year: int):
        return self.repo.delete_monthly_attendance_batch(tenant_id, employee_id, month, year)

    def get_weekly_summary(self, tenant_id: str):
        days = self.repo.get_weekly_summary(tenant_id)
        return {"days": days}

    def get_leaves(self, tenant_id: str):
        return self.repo.get_leaves(tenant_id)

    def create_leave(self, tenant_id: str, obj_in: LeaveRequestCreate):
        return self.repo.create_leave(tenant_id, obj_in)

    def reject_leave(self, tenant_id: str, user_id: str, leave_id: str):
        leave = self.repo.get_leave(tenant_id, leave_id)
        if not leave:
            raise HTTPException(404, "Leave not found")
        
        updated = self.repo.update_leave_status(leave, "Rejected", user_id)
        
        from models.audit import AuditLog
        self.db.add(AuditLog(
            tenant_id=tenant_id,
            user_id=user_id,
            action="reject_leave",
            entity_type="LeaveRequest",
            entity_id=leave_id,
            new_value={"status": "Rejected"}
        ))
        self.db.commit()
        return updated

    def approve_leave(self, tenant_id: str, user_id: str, leave_id: str):
        leave = self.repo.get_leave(tenant_id, leave_id)
        if not leave:
            raise HTTPException(404, "Leave not found")
        
        updated = self.repo.update_leave_status(leave, "Approved", user_id)
        
        from models.audit import AuditLog
        self.db.add(AuditLog(
            tenant_id=tenant_id,
            user_id=user_id,
            action="approve_leave",
            entity_type="LeaveRequest",
            entity_id=updated.id,
            new_value={"status": "Approved"}
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

    def finalize_payroll(self, tenant_id: str, user_id: str, run_id: str):
        run = self.repo.finalize_payroll_run(tenant_id, run_id)
        
        # Trigger accounting auto-post hook now that it is Paid!
        je = self.auto_posting.post_payroll(
            tenant_id, 
            user_id, 
            f"PAYROLL-{run.month}-{run.year}", 
            run.total_net, 
            description=f"Auto Post: Payroll run disbursed {run.month}/{run.year}"
        )
        if je:
            run.journal_entry_id = je.id
            self.db.add(run)
            
        from models.audit import AuditLog
        self.db.add(AuditLog(
            tenant_id=tenant_id,
            user_id=user_id,
            action="Paid Payroll",
            entity_type="PayrollRun",
            entity_id=run.id,
            new_value={"message": f"Marked payroll as Paid for {run.month}/{run.year}"}
        ))
        self.db.commit()
        return run

    def submit_payroll(self, tenant_id: str, user_id: str, run_id: str):
        run = self.repo.get_payroll_run(tenant_id, run_id)
        if not run:
            raise HTTPException(404, "Payroll run not found")
        run.status = "Pending Approval"
        self.db.add(run)
        self.db.commit()
        return run

    def approve_payroll(self, tenant_id: str, user_id: str, run_id: str, override: bool = False, remarks: str = None):
        run = self.repo.get_payroll_run(tenant_id, run_id)
        if not run:
            raise HTTPException(404, "Payroll run not found")
        run.status = "Approved"
        run.approved_by = user_id
        if remarks:
            run.remarks = remarks
        self.db.add(run)
        self.db.commit()
        return run

    def reject_payroll(self, tenant_id: str, user_id: str, run_id: str):
        run = self.repo.get_payroll_run(tenant_id, run_id)
        if not run:
            raise HTTPException(404, "Payroll run not found")
        run.status = "Draft"
        self.db.add(run)
        self.db.commit()
        return run

    def get_payroll_summary(self, tenant_id: str):
        return self.repo.get_payroll_summary(tenant_id)

    def preview_payroll(self, tenant_id: str, month: int, year: int, department_id: str = None):
        return self.repo.calculate_payroll_lines(tenant_id, month, year, department_id)

    def run_payroll(self, tenant_id: str, user_id: str, obj_in: PayrollRunCreate):
        try:
            employees = self.repo.get_employees(tenant_id)
            run = self.repo.create_payroll_run(tenant_id, user_id, obj_in, employees)
            
            # Auto-post to Accounting REMOVED from initial run (delayed to final payment step)
            
            from models.audit import AuditLog
            self.db.add(AuditLog(
                tenant_id=tenant_id,
                user_id=user_id,
                action="Run Payroll",
                entity_type="PayrollRun",
                entity_id=run.id,
                new_value={"message": f"Ran payroll for {run.month}/{run.year}"}
            ))
            self.db.commit()
            return run
        except Exception as e:
            self.db.rollback()
            raise HTTPException(status_code=400, detail=str(e))

    def get_analytics(self, tenant_id: str):
        return self.repo.get_analytics(tenant_id)

    # Advance Salary Methods
    def get_advances(self, tenant_id: str):
        return self.repo.get_advances(tenant_id)

    def create_advance(self, tenant_id: str, obj_in: AdvanceSalaryCreate):
        return self.repo.create_advance(tenant_id, obj_in)

    def approve_advance(self, tenant_id: str, user_id: str, advance_id: str):
        adv = self.repo.get_advance(tenant_id, advance_id)
        if not adv:
            raise HTTPException(404, "Advance Salary not found")
        if adv.status == "Paid":
            raise HTTPException(400, "Advance Salary is already paid")
            
        adv.status = "Paid"
        adv.approved_by = user_id
        
        # Trigger accounting hook
        je = self.auto_posting.post_advance_salary(
            tenant_id=tenant_id,
            user_id=user_id,
            reference=f"ADV-{adv.id.split('-')[0].upper()}",
            amount=adv.amount,
            description=f"Auto Post: Advance Salary disbursed for {adv.deduction_month}"
        )
        if je:
            adv.journal_entry_id = je.id
            
        from models.audit import AuditLog
        self.db.add(AuditLog(
            tenant_id=tenant_id,
            user_id=user_id,
            action="Approve Advance Salary",
            entity_type="AdvanceSalary",
            entity_id=adv.id,
            new_value={"status": "Paid"}
        ))
        
        self.db.add(adv)
        self.db.commit()
        self.db.refresh(adv)
        return adv
