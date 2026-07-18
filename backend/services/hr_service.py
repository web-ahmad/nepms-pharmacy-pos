from sqlalchemy.orm import Session
from fastapi import HTTPException
from datetime import datetime, date

from repositories.hr import HRRepository
from schemas.hr import (
    DepartmentCreate, EmployeeCreate, EmployeeUpdate, AttendanceCreate, AttendanceUpdate,
    LeaveRequestCreate, ShiftCreate, PayrollRunCreate, AdvanceSalaryCreate,
    ClockInRequest, ClockOutRequest,
    BulkAttendanceRow, BulkAttendanceResponse, AttendanceWeeklySummaryResponse,
    EmployeeDocumentCreate, EmployeeDocumentUpdate,
    PerformanceReviewCreate, PerformanceReviewUpdate,
    EmployeeTaskCreate, EmployeeTaskUpdate,
    TrainingProgramCreate, TrainingProgramUpdate,
    TrainingAttendanceCreate, TrainingAttendanceUpdate
)
from services.auto_posting_service import AutoPostingService
from schemas.accounts import JournalEntryCreate, JournalEntryLineCreate

class HRService:
    def __init__(self, db: Session):
        self.repo = HRRepository(db)
        self.auto_posting = AutoPostingService(db)
        self.db = db

    def get_analytics(self, tenant_id: str):
        # Stub implementation
        return {
            "total_employees": 0,
            "active_employees": 0,
            "attendance_percent": 0.0,
            "pending_leaves": 0,
            "monthly_payroll_cost": 0.0
        }

    def get_departments(self, tenant_id: str):
        return self.repo.get_departments(tenant_id)

    def create_department(self, tenant_id: str, obj_in: DepartmentCreate):
        from models.hr import Department
        from fastapi import HTTPException
        
        existing = self.db.query(Department).filter(
            Department.tenant_id == tenant_id,
            Department.name.ilike(obj_in.name)
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Department with name '{obj_in.name}' already exists.")
            
        return self.repo.create_department(tenant_id, obj_in)

    def update_department(self, tenant_id: str, dept_id: str, obj_in):
        from models.hr import Department
        from fastapi import HTTPException
        
        if hasattr(obj_in, 'name') and obj_in.name:
            existing = self.db.query(Department).filter(
                Department.tenant_id == tenant_id,
                Department.name.ilike(obj_in.name),
                Department.id != dept_id
            ).first()
            if existing:
                raise HTTPException(status_code=400, detail=f"Department with name '{obj_in.name}' already exists.")
                
        dept = self.repo.update_department(tenant_id, dept_id, obj_in)
        if not dept:
            raise HTTPException(404, "Department not found")
        return dept

    def delete_department(self, tenant_id: str, dept_id: str):
        from fastapi import HTTPException
        success = self.repo.delete_department(tenant_id, dept_id)
        if not success:
            raise HTTPException(status_code=404, detail="Department not found")
        return {"message": "Department deleted successfully"}

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
        new_user = None
        if obj_in.system_access:
            if not obj_in.email:
                raise HTTPException(400, "Email is required to create a login account")
            if not obj_in.password:
                raise HTTPException(400, "Password is required to create a login account")
            if not obj_in.role_id:
                raise HTTPException(400, "Role assignment is required to create a login account")
            
            from models.users import User, UserBranch
            from core.security import get_password_hash
            
            if self.db.query(User).filter(User.email == obj_in.email).first():
                raise HTTPException(400, "Email already registered for a user account")
                
            new_user = User(
                username=obj_in.username or obj_in.email,
                email=obj_in.email,
                hashed_password=get_password_hash(obj_in.password),
                full_name=f"{obj_in.first_name} {obj_in.last_name}",
                phone=obj_in.phone,
                tenant_id=tenant_id,
                role_id=obj_in.role_id,
                is_active=True
            )
            self.db.add(new_user)
            self.db.flush()
            
            if obj_in.branch_id:
                user_branch = UserBranch(user_id=new_user.id, branch_id=obj_in.branch_id)
                self.db.add(user_branch)
                self.db.flush()

        emp = self.repo.create_employee(tenant_id, obj_in)
        
        if new_user:
            emp.user_id = new_user.id
            self.db.flush()

        self.db.commit()
        return emp

    def update_employee(self, tenant_id: str, user_id: str, emp_id: str, obj_in: EmployeeUpdate):
        emp = self.repo.update_employee(tenant_id, emp_id, obj_in)
        if not emp:
            raise HTTPException(404, "Employee not found")

        
        self.db.commit()
        return emp

    def delete_employee(self, tenant_id: str, user_id: str, emp_id: str):
        success = self.repo.delete_employee(tenant_id, emp_id)
        if not success:
            raise HTTPException(404, "Employee not found")

        
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

        
        self.db.commit()
        return updated

    def approve_leave(self, tenant_id: str, user_id: str, leave_id: str):
        leave = self.repo.get_leave(tenant_id, leave_id)
        if not leave:
            raise HTTPException(404, "Leave not found")
        
        updated = self.repo.update_leave_status(leave, "Approved", user_id)

        
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
        from models.hr import PayrollRun
        existing_run = self.db.query(PayrollRun).filter(
            PayrollRun.tenant_id == tenant_id,
            PayrollRun.month == obj_in.month,
            PayrollRun.year == obj_in.year
        ).first()
        if existing_run:
            raise HTTPException(
                status_code=400,
                detail=f"Payroll for {obj_in.month:02d}-{obj_in.year} already exists. Please edit the existing draft or review the finalized run."
            )

        try:
            employees = self.repo.get_employees(tenant_id)
            run = self.repo.create_payroll_run(tenant_id, user_id, obj_in, employees)
            
            # Auto-post to Accounting REMOVED from initial run (delayed to final payment step)

            
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

        
        
        self.db.add(adv)
        self.db.commit()
        self.db.refresh(adv)
        return adv

    # =====================================================================
    # Enterprise Phase 10: Missing Service Methods
    # =====================================================================

    # Employee Documents
    def get_employee_documents(self, tenant_id: str, employee_id: str = None):
        return self.repo.get_employee_documents(tenant_id, employee_id)

    def create_employee_document(self, tenant_id: str, user_id: str, obj_in: EmployeeDocumentCreate):
        return self.repo.create_employee_document(tenant_id, user_id, obj_in)

    def update_employee_document(self, tenant_id: str, doc_id: str, obj_in: EmployeeDocumentUpdate):
        doc = self.repo.update_employee_document(tenant_id, doc_id, obj_in)
        if not doc:
            raise HTTPException(404, "Employee document not found")
        return doc

    def delete_employee_document(self, tenant_id: str, doc_id: str):
        success = self.repo.delete_employee_document(tenant_id, doc_id)
        if not success:
            raise HTTPException(404, "Employee document not found")
        return {"message": "Employee document deleted successfully"}

    # Performance Reviews
    def get_performance_reviews(self, tenant_id: str, employee_id: str = None):
        return self.repo.get_performance_reviews(tenant_id, employee_id)

    def create_performance_review(self, tenant_id: str, obj_in: PerformanceReviewCreate):
        return self.repo.create_performance_review(tenant_id, obj_in)

    def update_performance_review(self, tenant_id: str, review_id: str, obj_in: PerformanceReviewUpdate):
        review = self.repo.update_performance_review(tenant_id, review_id, obj_in)
        if not review:
            raise HTTPException(404, "Performance review not found")
        return review

    # Employee Tasks
    def get_employee_tasks(self, tenant_id: str, employee_id: str = None):
        return self.repo.get_employee_tasks(tenant_id, employee_id)

    def create_employee_task(self, tenant_id: str, user_id: str, obj_in: EmployeeTaskCreate):
        return self.repo.create_employee_task(tenant_id, user_id, obj_in)

    def update_employee_task(self, tenant_id: str, task_id: str, obj_in: EmployeeTaskUpdate):
        task = self.repo.update_employee_task(tenant_id, task_id, obj_in)
        if not task:
            raise HTTPException(404, "Employee task not found")
        return task

    def delete_employee_task(self, tenant_id: str, task_id: str):
        success = self.repo.delete_employee_task(tenant_id, task_id)
        if not success:
            raise HTTPException(404, "Employee task not found")
        return {"message": "Employee task deleted successfully"}

    # Training Programs
    def get_training_programs(self, tenant_id: str):
        return self.repo.get_training_programs(tenant_id)

    def create_training_program(self, tenant_id: str, obj_in: TrainingProgramCreate):
        return self.repo.create_training_program(tenant_id, obj_in)

    def update_training_program(self, tenant_id: str, program_id: str, obj_in: TrainingProgramUpdate):
        prog = self.repo.update_training_program(tenant_id, program_id, obj_in)
        if not prog:
            raise HTTPException(404, "Training program not found")
        return prog

    def delete_training_program(self, tenant_id: str, program_id: str):
        success = self.repo.delete_training_program(tenant_id, program_id)
        if not success:
            raise HTTPException(404, "Training program not found")
        return {"message": "Training program deleted successfully"}

    # Training Attendance
    def get_training_attendances(self, tenant_id: str, program_id: str):
        return self.repo.get_training_attendances(tenant_id, program_id)

    def create_training_attendance(self, tenant_id: str, obj_in: TrainingAttendanceCreate):
        return self.repo.create_training_attendance(tenant_id, obj_in)

    def update_training_attendance(self, tenant_id: str, att_id: str, obj_in: TrainingAttendanceUpdate):
        att = self.repo.update_training_attendance(tenant_id, att_id, obj_in)
        if not att:
            raise HTTPException(404, "Training attendance not found")
        return att

    def delete_training_attendance(self, tenant_id: str, att_id: str):
        success = self.repo.delete_training_attendance(tenant_id, att_id)
        if not success:
            raise HTTPException(404, "Training attendance not found")
        return {"message": "Training attendance deleted successfully"}
