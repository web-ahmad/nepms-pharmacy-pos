from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Body
import os, shutil, uuid as _uuid
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from database import get_db
from models.users import User
from core.deps import requires_permission, get_current_user
from core.pharmacy_scope import get_pharmacy_scope, PharmacyScope
from dependencies.module_guard import require_module
from schemas.hr import (
    DepartmentCreate, DepartmentResponse,
    EmployeeCreate, EmployeeUpdate, EmployeeResponse,
    AttendanceCreate, AttendanceResponse, AttendanceUpdate,
    ClockInRequest, ClockOutRequest,
    BulkAttendanceRow, BulkAttendanceResponse, AttendanceWeeklySummaryResponse,
    LeaveRequestCreate, LeaveRequestResponse,
    ShiftCreate, ShiftResponse, ShiftUpdate,
    PayrollRunCreate, PayrollRunResponse, PayrollLineResponse, PayrollApprovalRequest,
    HRAnalyticsResponse,
    DesignationCreate, DesignationResponse, DesignationUpdate,
    AdvanceSalaryCreate, AdvanceSalaryResponse,
    EmployeeDocumentCreate, EmployeeDocumentUpdate, EmployeeDocumentResponse,
    PerformanceReviewCreate, PerformanceReviewUpdate, PerformanceReviewResponse,
    EmployeeTaskCreate, EmployeeTaskUpdate, EmployeeTaskResponse,
    TrainingProgramCreate, TrainingProgramUpdate, TrainingProgramResponse,
    TrainingAttendanceCreate, TrainingAttendanceUpdate, TrainingAttendanceResponse
)
from services.hr_service import HRService

router = APIRouter(dependencies=[Depends(require_module("hr"))])

class PayloadUser:
    def __init__(self, payload: dict):
        self.id = payload.get("sub")
        self.tenant_id = payload.get("tenant_id")
        self.payload = payload

def require_hr_view(token_payload: dict = Depends(requires_permission("hr:view"))): return PayloadUser(token_payload)
def require_hr_create(token_payload: dict = Depends(requires_permission("hr:create"))): return PayloadUser(token_payload)
def require_hr_update(token_payload: dict = Depends(requires_permission("hr:update"))): return PayloadUser(token_payload)
def require_hr_delete(token_payload: dict = Depends(requires_permission("hr:delete"))): return PayloadUser(token_payload)
def require_hr_approve(token_payload: dict = Depends(requires_permission("hr:manage"))): return PayloadUser(token_payload)
def require_payroll_view(token_payload: dict = Depends(requires_permission("payroll:view"))): return PayloadUser(token_payload)
def require_payroll_run(token_payload: dict = Depends(requires_permission("payroll:create"))): return PayloadUser(token_payload)
def require_payroll_approve(token_payload: dict = Depends(requires_permission("payroll:approve"))): return PayloadUser(token_payload)

def get_effective_branch_id(db: Session, tenant_id: str, scope: PharmacyScope):
    effective_branch_id = scope.branch_id
    if not effective_branch_id:
        from models.users import Branch
        main_branch = db.query(Branch).filter(Branch.tenant_id == tenant_id, Branch.is_main == True).first()
        if main_branch:
            effective_branch_id = main_branch.id
    return effective_branch_id


# Departments
@router.get("/departments", response_model=List[DepartmentResponse])
def get_departments(db: Session = Depends(get_db), current_user: User = Depends(require_hr_view), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    try:
        effective_branch_id = get_effective_branch_id(db, current_user.tenant_id, scope)
        return HRService(db).get_departments(current_user.tenant_id, effective_branch_id)
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"get_departments failed: {str(e)}")

@router.post("/departments", response_model=DepartmentResponse)
def create_department(obj_in: DepartmentCreate, db: Session = Depends(get_db), current_user: User = Depends(require_hr_create), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    try:
        effective_branch_id = get_effective_branch_id(db, current_user.tenant_id, scope)
        # Sanitize empty strings to None for FK fields
        if getattr(obj_in, 'head_id', None) == "":
            obj_in.head_id = None
        return HRService(db).create_department(current_user.tenant_id, obj_in, effective_branch_id)
    except HTTPException as he:
        raise he
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Failed to create department: {str(e)}")

from schemas.hr import DepartmentUpdate

@router.put("/departments/{id}", response_model=DepartmentResponse)
def update_department(id: str, obj_in: DepartmentUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_hr_update)):
    try:
        if getattr(obj_in, 'head_id', None) == "":
            obj_in.head_id = None
        return HRService(db).update_department(current_user.tenant_id, id, obj_in)
    except HTTPException as he:
        raise he
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Failed to update department: {str(e)}")

@router.delete("/departments/{id}")
def delete_department(id: str, db: Session = Depends(get_db), current_user: User = Depends(require_hr_delete)):
    try:
        return HRService(db).delete_department(current_user.tenant_id, id)
    except HTTPException as he:
        raise he
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Failed to delete department: {str(e)}")

# Designations
@router.get("/designations", response_model=List[DesignationResponse])
def get_designations(db: Session = Depends(get_db), current_user: User = Depends(require_hr_view), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    try:
        effective_branch_id = get_effective_branch_id(db, current_user.tenant_id, scope)
        return HRService(db).get_designations(current_user.tenant_id, effective_branch_id)
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"get_designations failed: {str(e)}")

@router.post("/designations", response_model=DesignationResponse)
def create_designation(obj_in: DesignationCreate, db: Session = Depends(get_db), current_user: User = Depends(require_hr_create), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    effective_branch_id = get_effective_branch_id(db, current_user.tenant_id, scope)
    return HRService(db).create_designation(current_user.tenant_id, obj_in, effective_branch_id)

@router.put("/designations/{id}", response_model=DesignationResponse)
def update_designation(id: str, obj_in: DesignationUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_hr_update)):
    return HRService(db).update_designation(current_user.tenant_id, id, obj_in)

# Employees
@router.get("/employees", response_model=List[EmployeeResponse])
def get_employees(db: Session = Depends(get_db), current_user: User = Depends(require_hr_view), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    try:
        effective_branch_id = get_effective_branch_id(db, current_user.tenant_id, scope)
        return HRService(db).get_employees(current_user.tenant_id, effective_branch_id)
    except Exception as e:
        print("--- CRITICAL BACKEND ERROR ---")
        print(str(e))
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"get_employees failed: {str(e)}")

@router.get("/employees/{id}", response_model=EmployeeResponse)
def get_employee(id: str, db: Session = Depends(get_db), current_user: User = Depends(require_hr_view)):
    return HRService(db).get_employee(current_user.tenant_id, id)


@router.get("/employees/{id}/payroll")
def get_employee_payroll(id: str, db: Session = Depends(get_db), current_user: User = Depends(require_hr_view)):
    """Payslip history for one employee (admin view of the /me/payroll shape)."""
    from models.hr import PayrollLine, PayrollRun
    rows = (db.query(PayrollLine, PayrollRun)
            .join(PayrollRun, PayrollRun.id == PayrollLine.payroll_run_id)
            .filter(PayrollLine.employee_id == id,
                    PayrollRun.tenant_id == current_user.tenant_id)
            .order_by(PayrollRun.year.desc(), PayrollRun.month.desc()).all())
    return [{
        "id": ln.id, "month": run.month, "year": run.year, "status": run.status,
        "base_salary": ln.base_salary, "allowances": ln.allowances, "overtime": ln.overtime,
        "bonuses": ln.bonuses, "deductions": ln.deductions, "tax": ln.tax, "net_pay": ln.net_pay,
    } for ln, run in rows]


@router.get("/employees/{id}/training")
def get_employee_training(id: str, db: Session = Depends(get_db), current_user: User = Depends(require_hr_view)):
    """Training programs one employee is enrolled in (admin view of /me/training)."""
    from models.hr import TrainingAttendance, TrainingProgram
    rows = (db.query(TrainingAttendance, TrainingProgram)
            .join(TrainingProgram, TrainingProgram.id == TrainingAttendance.program_id)
            .filter(TrainingAttendance.employee_id == id,
                    TrainingAttendance.tenant_id == current_user.tenant_id)
            .order_by(TrainingProgram.start_date.desc()).all())
    return [{
        "id": ta.id, "title": prog.title, "trainer": prog.trainer,
        "start_date": str(prog.start_date) if prog.start_date else None,
        "end_date": str(prog.end_date) if prog.end_date else None,
        "program_status": prog.completion_status, "my_status": ta.status,
    } for ta, prog in rows]

@router.post("/employees", response_model=EmployeeResponse)
def create_employee(obj_in: EmployeeCreate, db: Session = Depends(get_db), current_user: User = Depends(require_hr_create), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    try:
        effective_branch_id = get_effective_branch_id(db, current_user.tenant_id, scope)
        # Clean up empty strings for relational fields to avoid DB foreign key errors
        if getattr(obj_in, 'department_id', None) == "":
            obj_in.department_id = None
        if getattr(obj_in, 'designation_id', None) == "":
            obj_in.designation_id = None
        if getattr(obj_in, 'shift_id', None) == "":
            obj_in.shift_id = None
            
        return HRService(db).create_employee(current_user.tenant_id, current_user.id, obj_in, effective_branch_id)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        error_str = str(e).lower()
        if "unique" in error_str or "integrity" in error_str or "foreign key" in error_str or "not null" in error_str:
            return JSONResponse(status_code=400, content={"message": "Username already exists or missing required fields.", "error": str(e)})
        return JSONResponse(status_code=400, content={"message": "Failed to create employee.", "error": str(e)})

@router.put("/employees/{id}", response_model=EmployeeResponse)
def update_employee(id: str, obj_in: EmployeeUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_hr_update)):
    try:
        # Clean up empty strings for relational fields
        if getattr(obj_in, 'department_id', None) == "":
            obj_in.department_id = None
        if getattr(obj_in, 'designation_id', None) == "":
            obj_in.designation_id = None
        if getattr(obj_in, 'shift_id', None) == "":
            obj_in.shift_id = None
            
        return HRService(db).update_employee(current_user.tenant_id, current_user.id, id, obj_in)
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        error_str = str(e).lower()
        if "unique" in error_str or "integrity" in error_str or "foreign key" in error_str or "not null" in error_str:
            return JSONResponse(status_code=400, content={"message": "Username already exists or missing required fields.", "error": str(e)})
        return JSONResponse(status_code=400, content={"message": "Failed to update employee.", "error": str(e)})

@router.delete("/employees/{id}")
def delete_employee(id: str, db: Session = Depends(get_db), current_user: User = Depends(require_hr_delete)):
    return HRService(db).delete_employee(current_user.tenant_id, current_user.id, id)

# Attendance
@router.get("/attendance", response_model=List[AttendanceResponse])
def get_attendance(
    date: Optional[date] = Query(None, description="Filter by date (YYYY-MM-DD). Defaults to today."),
    employee_id: Optional[str] = Query(None, description="Filter by employee ID"),
    month: Optional[int] = Query(None, description="Filter by month (1-12)"),
    year: Optional[int] = Query(None, description="Filter by year"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_view),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    from datetime import date as date_cls
    target = date if date else date_cls.today()
    try:
        effective_branch_id = get_effective_branch_id(db, current_user.tenant_id, scope)
        return HRService(db).get_attendance_logs(current_user.tenant_id, target, employee_id, month, year, effective_branch_id)
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"get_attendance failed: {str(e)}")

@router.post("/attendance", response_model=AttendanceResponse)
def create_attendance(obj_in: AttendanceCreate, db: Session = Depends(get_db), current_user: User = Depends(require_hr_create)):
    return HRService(db).create_attendance(current_user.tenant_id, obj_in)

# Clock-in/Clock-out
@router.post("/attendance/clock-in", response_model=AttendanceResponse)
def clock_in(
    body: ClockInRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_create)
):
    try:
        return HRService(db).clock_in(current_user.tenant_id, body.employee_id)
    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"clock_in failed: {str(e)}")

@router.post("/attendance/clock-out", response_model=AttendanceResponse)
def clock_out(
    body: ClockOutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_create)
):
    try:
        return HRService(db).clock_out(current_user.tenant_id, body.attendance_id)
    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"clock_out failed: {str(e)}")

# ── Self attendance (any logged-in employee clocks themselves in/out) ──────────
def _my_employee(db: Session, current_user: User):
    from models.hr import Employee
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="No employee record is linked to your account. Please contact HR.")
    return emp


@router.get("/attendance/my/today")
def my_today_attendance(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = _my_employee(db, current_user)
    svc = HRService(db)
    rec = svc.repo.get_today_attendance(current_user.tenant_id, emp.id)
    return {
        "employee_id": emp.id,
        "employee_name": f"{emp.first_name} {emp.last_name}".strip(),
        "attendance": AttendanceResponse.model_validate(rec) if rec else None,
    }


@router.post("/attendance/my/clock-in", response_model=AttendanceResponse)
def my_clock_in(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = _my_employee(db, current_user)
    return HRService(db).clock_in(current_user.tenant_id, emp.id)


@router.post("/attendance/my/clock-out", response_model=AttendanceResponse)
def my_clock_out(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = _my_employee(db, current_user)
    svc = HRService(db)
    rec = svc.repo.get_today_attendance(current_user.tenant_id, emp.id)
    if not rec:
        raise HTTPException(status_code=409, detail="You haven't clocked in today — please clock in first.")
    return svc.clock_out(current_user.tenant_id, rec.id)


# ── Employee Self-Service (ESS): each employee sees ONLY their own data ─────────
@router.get("/me")
def my_hr_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = _my_employee(db, current_user)
    from models.hr import Department, Designation
    dept = db.query(Department).filter(Department.id == emp.department_id).first() if emp.department_id else None
    desig = db.query(Designation).filter(Designation.id == emp.designation_id).first() if emp.designation_id else None
    return {
        "id": emp.id,
        "name": f"{emp.first_name} {emp.last_name}".strip(),
        "employee_code": emp.employee_id,
        "email": emp.email, "phone": emp.phone,
        "department": dept.name if dept else None,
        "designation": desig.name if desig else None,
        "joining_date": str(emp.joining_date) if getattr(emp, "joining_date", None) else None,
        "base_salary": getattr(emp, "base_salary", None),
        "salary_type": getattr(emp, "salary_type", None),
    }


@router.get("/me/attendance")
def my_attendance(month: Optional[int] = None, year: Optional[int] = None,
                  db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models.hr import Attendance
    from datetime import date as _date
    emp = _my_employee(db, current_user)
    q = db.query(Attendance).filter(Attendance.employee_id == emp.id)
    m = month or _date.today().month
    y = year or _date.today().year
    from sqlalchemy import extract
    q = q.filter(extract('month', Attendance.date) == m, extract('year', Attendance.date) == y)
    rows = q.order_by(Attendance.date.desc()).all()
    return {
        "month": m, "year": y,
        "records": [AttendanceResponse.model_validate(r) for r in rows],
        "present": sum(1 for r in rows if r.status in ("Present", "Late")),
        "absent": sum(1 for r in rows if r.status == "Absent"),
        "total": len(rows),
    }


@router.get("/me/payroll")
def my_payroll(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models.hr import PayrollLine, PayrollRun
    emp = _my_employee(db, current_user)
    rows = (db.query(PayrollLine, PayrollRun)
            .join(PayrollRun, PayrollRun.id == PayrollLine.payroll_run_id)
            .filter(PayrollLine.employee_id == emp.id)
            .order_by(PayrollRun.year.desc(), PayrollRun.month.desc()).all())
    return [{
        "id": ln.id, "month": run.month, "year": run.year, "status": run.status,
        "base_salary": ln.base_salary, "allowances": ln.allowances, "overtime": ln.overtime,
        "bonuses": ln.bonuses, "deductions": ln.deductions, "tax": ln.tax, "net_pay": ln.net_pay,
    } for ln, run in rows]


@router.get("/me/leaves")
def my_leaves(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models.hr import LeaveRequest
    emp = _my_employee(db, current_user)
    rows = db.query(LeaveRequest).filter(LeaveRequest.employee_id == emp.id).order_by(LeaveRequest.start_date.desc()).all()
    return [{
        "id": l.id, "leave_type": l.leave_type, "start_date": str(l.start_date),
        "end_date": str(l.end_date), "reason": l.reason, "status": l.status,
        "rejection_reason": getattr(l, "rejection_reason", None),
    } for l in rows]


@router.post("/me/leaves")
def my_apply_leave(body: dict = Body(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = _my_employee(db, current_user)
    payload = LeaveRequestCreate(
        employee_id=emp.id,
        leave_type=body.get("leave_type") or "Casual",
        start_date=body["start_date"],
        end_date=body["end_date"],
        reason=body.get("reason") or "",
        status="Pending",
    )
    return HRService(db).create_leave(current_user.tenant_id, payload)


@router.get("/me/training")
def my_training(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models.hr import TrainingAttendance, TrainingProgram
    emp = _my_employee(db, current_user)
    rows = (db.query(TrainingAttendance, TrainingProgram)
            .join(TrainingProgram, TrainingProgram.id == TrainingAttendance.program_id)
            .filter(TrainingAttendance.employee_id == emp.id)
            .order_by(TrainingProgram.start_date.desc()).all())
    return [{
        "id": ta.id,
        "title": prog.title,
        "trainer": prog.trainer,
        "start_date": str(prog.start_date) if prog.start_date else None,
        "end_date": str(prog.end_date) if prog.end_date else None,
        "program_status": prog.completion_status,
        "my_status": ta.status,
    } for ta, prog in rows]


@router.get("/me/shift")
def my_shift(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """The employee's own assigned shift (read-only)."""
    from models.hr import Shift
    emp = _my_employee(db, current_user)
    if not emp.shift_id:
        return None
    sh = db.query(Shift).filter(Shift.id == emp.shift_id).first()
    if not sh:
        return None
    return {
        "id": sh.id, "name": sh.name,
        "start_time": sh.start_time, "end_time": sh.end_time,
        "grace_period": sh.grace_period, "is_active": sh.is_active,
    }


@router.get("/me/advances")
def my_advances(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models.hr import AdvanceSalary
    emp = _my_employee(db, current_user)
    rows = (db.query(AdvanceSalary)
            .filter(AdvanceSalary.employee_id == emp.id)
            .order_by(AdvanceSalary.created_at.desc()).all())
    return [{
        "id": a.id, "amount": a.amount,
        "request_date": str(a.request_date) if a.request_date else None,
        "deduction_month": a.deduction_month, "reason": a.reason, "status": a.status,
        "rejection_reason": getattr(a, "rejection_reason", None),
    } for a in rows]


@router.post("/me/advances")
def my_request_advance(body: dict = Body(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Employee requests an advance for themselves — always starts as Pending."""
    from models.hr import AdvanceSalary
    from datetime import date as _date
    emp = _my_employee(db, current_user)
    try:
        amount = float(body.get("amount") or 0)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Amount must be a number.")
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero.")
    adv = AdvanceSalary(
        tenant_id=current_user.tenant_id,
        employee_id=emp.id,
        amount=amount,
        request_date=_date.today(),
        deduction_month=body.get("deduction_month") or _date.today().strftime("%m-%Y"),
        reason=body.get("reason") or "",
        status="Pending",          # staff can never self-approve
    )
    db.add(adv)
    db.commit()
    db.refresh(adv)
    return {"id": adv.id, "amount": adv.amount, "status": adv.status}


@router.get("/me/performance")
def my_performance(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models.hr import PerformanceReview, Employee
    emp = _my_employee(db, current_user)
    rows = (db.query(PerformanceReview)
            .filter(PerformanceReview.employee_id == emp.id)
            .order_by(PerformanceReview.created_at.desc()).all())
    out = []
    for r in rows:
        reviewer = db.query(Employee).filter(Employee.id == r.reviewer_id).first() if r.reviewer_id else None
        out.append({
            "id": r.id, "review_period": r.review_period, "rating": r.rating,
            "comments": r.comments, "goals": r.goals, "achievements": r.achievements,
            "next_review_date": str(r.next_review_date) if r.next_review_date else None,
            "reviewer": f"{reviewer.first_name} {reviewer.last_name}".strip() if reviewer else None,
        })
    return out


@router.get("/me/tasks")
def my_tasks(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models.hr import EmployeeTask
    emp = _my_employee(db, current_user)
    rows = (db.query(EmployeeTask)
            .filter(EmployeeTask.employee_id == emp.id)
            .order_by(EmployeeTask.created_at.desc()).all())
    return [{
        "id": t.id, "title": t.title, "description": t.description,
        "status": t.status, "priority": t.priority,
        "due_date": str(t.due_date) if t.due_date else None,
    } for t in rows]


_MY_TASK_STATUSES = {"Pending", "In Progress", "Completed"}


@router.patch("/me/tasks/{task_id}")
def my_update_task_status(task_id: str, body: dict = Body(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Employee moves their OWN task along. Status only — they can't retitle,
    reassign or cancel a task that was assigned to them."""
    from models.hr import EmployeeTask
    emp = _my_employee(db, current_user)
    task = (db.query(EmployeeTask)
            .filter(EmployeeTask.id == task_id, EmployeeTask.employee_id == emp.id)
            .first())
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    status_val = body.get("status")
    if status_val not in _MY_TASK_STATUSES:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {', '.join(sorted(_MY_TASK_STATUSES))}.")
    task.status = status_val
    db.commit()
    db.refresh(task)
    return {"id": task.id, "status": task.status}


@router.get("/me/documents")
def my_documents(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models.hr import EmployeeDocument
    emp = _my_employee(db, current_user)
    rows = (db.query(EmployeeDocument)
            .filter(EmployeeDocument.employee_id == emp.id)
            .order_by(EmployeeDocument.created_at.desc()).all())
    return [{
        "id": d.id, "document_type": d.document_type, "file_path": d.file_path,
        "expiry_date": str(d.expiry_date) if d.expiry_date else None,
        "verification_status": d.verification_status,
        "created_at": str(d.created_at) if d.created_at else None,
    } for d in rows]


@router.post("/me/documents/upload", summary="Upload own document file → returns its URL")
def my_upload_document_file(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    ext = (file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "")
    if ext not in _ALLOWED_DOC_EXT:
        raise HTTPException(status_code=400, detail=f"Unsupported file type '.{ext}'. Allowed: PDF, images, DOC, XLS.")
    filename = f"{_uuid.uuid4().hex}.{ext}"
    with open(os.path.join(_HR_DOC_DIR, filename), "wb") as buf:
        shutil.copyfileobj(file.file, buf)
    return {"url": f"/storage/hr_documents/{filename}", "name": file.filename}


@router.post("/me/documents")
def my_add_document(body: dict = Body(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Attach an uploaded file to the employee's OWN record. Always lands as
    Pending — HR still has to verify it."""
    from models.hr import EmployeeDocument
    from datetime import date as _date
    emp = _my_employee(db, current_user)
    if not body.get("file_path"):
        raise HTTPException(status_code=400, detail="Please upload a file first.")
    expiry = body.get("expiry_date") or None
    doc = EmployeeDocument(
        tenant_id=current_user.tenant_id,
        employee_id=emp.id,
        document_type=body.get("document_type") or "Other",
        file_path=body["file_path"],
        expiry_date=_date.fromisoformat(expiry) if expiry else None,
        verification_status="Pending",   # staff can never self-verify
        uploaded_by=current_user.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return {"id": doc.id, "document_type": doc.document_type, "verification_status": doc.verification_status}


@router.get("/attendance/today/{employee_id}", response_model=Optional[AttendanceResponse])
def get_today_attendance(
    employee_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_view)
):
    """Returns today's attendance record for the employee, or null if not found."""
    try:
        record = HRService(db).get_today_attendance(current_user.tenant_id, employee_id)
        return record  # can be None -> returns null in JSON
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"get_today_attendance failed: {str(e)}")

@router.put("/attendance/{id}", response_model=AttendanceResponse)
def update_attendance(
    id: str,
    obj_in: AttendanceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_update)
):
    """HR Admin override: edit clock-in/out times and/or status. Total hours auto-recalculated."""
    try:
        return HRService(db).update_attendance(current_user.tenant_id, id, obj_in)
    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"update_attendance failed: {str(e)}")

@router.post("/attendance/bulk", response_model=BulkAttendanceResponse)
def bulk_create_attendance(
    rows: List[BulkAttendanceRow],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_create)
):
    """Bulk-import attendance from a parsed CSV payload."""
    try:
        return HRService(db).bulk_create_attendance(current_user.tenant_id, rows)
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"bulk_create_attendance failed: {str(e)}")

@router.delete("/attendance/monthly-batch")
def delete_monthly_batch(
    employeeId: str,
    month: int,
    year: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_delete)
):
    """Delete all attendance records for a specific employee in a specific month."""
    try:
        res = HRService(db).delete_monthly_attendance_batch(current_user.tenant_id, employeeId, month, year)
        return {"success": True, "message": "Monthly attendance reset successfully.", **res}
    except Exception as e:
        db.rollback()
        print(f"CRITICAL ERROR IN RESET: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/attendance/weekly-summary", response_model=AttendanceWeeklySummaryResponse)
def get_weekly_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_view)
):
    """Returns Present/Late/Absent counts for the last 7 days for the chart."""
    try:
        return HRService(db).get_weekly_summary(current_user.tenant_id)
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"get_weekly_summary failed: {str(e)}")

# Leaves
@router.get("/leaves", response_model=List[LeaveRequestResponse])
def get_leaves(db: Session = Depends(get_db), current_user: User = Depends(require_hr_view), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    effective_branch_id = get_effective_branch_id(db, current_user.tenant_id, scope)
    return HRService(db).get_leaves(current_user.tenant_id, branch_id=effective_branch_id)

@router.post("/leaves", response_model=LeaveRequestResponse)
def create_leave(obj_in: LeaveRequestCreate, db: Session = Depends(get_db), current_user: User = Depends(require_hr_create)):
    return HRService(db).create_leave(current_user.tenant_id, obj_in)

@router.post("/leaves/{id}/approve", response_model=LeaveRequestResponse)
def approve_leave(id: str, db: Session = Depends(get_db), current_user: User = Depends(require_hr_approve)):
    return HRService(db).approve_leave(current_user.tenant_id, current_user.id, id)

@router.post("/leaves/{id}/reject", response_model=LeaveRequestResponse)
def reject_leave(id: str, body: dict = Body(default={}), db: Session = Depends(get_db), current_user: User = Depends(require_hr_approve)):
    """Rejecting always requires a reason so the employee knows why."""
    return HRService(db).reject_leave(
        current_user.tenant_id, current_user.id, id,
        rejection_reason=(body or {}).get("rejection_reason"),
    )

# Shifts
@router.get("/shifts", response_model=List[ShiftResponse])
def get_shifts(db: Session = Depends(get_db), current_user: User = Depends(require_hr_view), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    try:
        effective_branch_id = get_effective_branch_id(db, current_user.tenant_id, scope)
        return HRService(db).get_shifts(current_user.tenant_id, effective_branch_id)
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"get_shifts failed: {str(e)}")

@router.post("/shifts", response_model=ShiftResponse)
def create_shift(obj_in: ShiftCreate, db: Session = Depends(get_db), current_user: User = Depends(require_hr_create), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    effective_branch_id = get_effective_branch_id(db, current_user.tenant_id, scope)
    return HRService(db).create_shift(current_user.tenant_id, obj_in, effective_branch_id)

@router.put("/shifts/{id}", response_model=ShiftResponse)
def update_shift(id: str, obj_in: ShiftUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_hr_update)):
    return HRService(db).update_shift(current_user.tenant_id, id, obj_in)

# Payroll
@router.get("/payroll", response_model=List[PayrollRunResponse])
def get_payroll_runs(db: Session = Depends(get_db), current_user: User = Depends(require_payroll_view), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    effective_branch_id = get_effective_branch_id(db, current_user.tenant_id, scope)
    runs = HRService(db).get_payroll_runs(current_user.tenant_id, branch_id=effective_branch_id)
    valid_runs = []
    for run in runs:
        try:
            if hasattr(PayrollRunResponse, "model_validate"):
                valid_runs.append(PayrollRunResponse.model_validate(run))
            else:
                valid_runs.append(PayrollRunResponse.from_orm(run))
        except Exception as e:
            print(f"Skipping invalid payroll run {run.id}: {e}")
    return valid_runs

@router.get("/payroll/preview", response_model=List[PayrollLineResponse])
def preview_payroll(month: int, year: int, department_id: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(require_payroll_run), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    effective_branch_id = get_effective_branch_id(db, current_user.tenant_id, scope)
    return HRService(db).preview_payroll(current_user.tenant_id, month, year, department_id, branch_id=effective_branch_id)

@router.post("/payroll/run", response_model=PayrollRunResponse)
def run_payroll(obj_in: PayrollRunCreate, db: Session = Depends(get_db), current_user: User = Depends(require_payroll_run), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    effective_branch_id = get_effective_branch_id(db, current_user.tenant_id, scope)
    return HRService(db).run_payroll(current_user.tenant_id, current_user.id, obj_in, branch_id=effective_branch_id)

@router.get("/payroll/summary")
def get_payroll_summary(db: Session = Depends(get_db), current_user: User = Depends(require_payroll_view)):
    return HRService(db).get_payroll_summary(current_user.tenant_id)

@router.post("/payroll/{id}/finalize", response_model=PayrollRunResponse)
def finalize_payroll(id: str, db: Session = Depends(get_db), current_user: User = Depends(require_payroll_run)):
    return HRService(db).finalize_payroll(current_user.tenant_id, current_user.id, id)

@router.get("/payroll/{id}", response_model=PayrollRunResponse)
def get_payroll_run(id: str, db: Session = Depends(get_db), current_user: User = Depends(require_payroll_view)):
    return HRService(db).get_payroll_run(current_user.tenant_id, id)

@router.post("/payroll/{id}/submit", response_model=PayrollRunResponse)
def submit_payroll(id: str, db: Session = Depends(get_db), current_user: User = Depends(require_payroll_run)):
    return HRService(db).submit_payroll(current_user.tenant_id, current_user.id, id)

@router.post("/payroll/{id}/approve", response_model=PayrollRunResponse)
def approve_payroll(id: str, request: PayrollApprovalRequest, db: Session = Depends(get_db), current_user: User = Depends(require_payroll_approve)):
    return HRService(db).approve_payroll(current_user.tenant_id, current_user.id, id, request.override, request.remarks)

@router.post("/payroll/{id}/reject", response_model=PayrollRunResponse)
def reject_payroll(id: str, db: Session = Depends(get_db), current_user: User = Depends(require_payroll_approve)):
    return HRService(db).reject_payroll(current_user.tenant_id, current_user.id, id)

@router.get("/payroll/{id}/export-master")
def export_master_payroll(id: str, db: Session = Depends(get_db), current_user: User = Depends(require_payroll_view)):
    import io
    from fastapi.responses import StreamingResponse
    from reportlab.lib.pagesizes import letter, landscape
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    from models.hr import PayrollRun, PayrollLine, Employee
    
    run = db.query(PayrollRun).filter(PayrollRun.tenant_id == current_user.tenant_id, PayrollRun.id == id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Payroll run not found")
        
    lines = db.query(PayrollLine).filter(PayrollLine.payroll_run_id == id).all()
    
    stream = io.BytesIO()
    doc = SimpleDocTemplate(stream, pagesize=landscape(letter), rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    elements = []
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#065f46'),
        spaceAfter=15
    )
    
    title_text = f"Master Payroll Sheet - {run.month}/{run.year} - Status: {run.status}"
    elements.append(Paragraph(title_text, title_style))
    elements.append(Spacer(1, 10))
    
    headers = ["Emp ID", "Name", "Base Salary", "Allowances", "Deductions", "Net Payable", "Signature Area"]
    data = [headers]
    
    total_base = 0.0
    total_allow = 0.0
    total_deduct = 0.0
    total_net = 0.0
    
    for l in lines:
        emp = db.query(Employee).filter(Employee.id == l.employee_id).first()
        emp_id = emp.employee_id if emp else "—"
        emp_name = f"{emp.first_name} {emp.last_name}" if emp else "Unknown"
        
        total_base += (l.base_salary or 0.0)
        total_allow += (l.allowances or 0.0)
        total_deduct += (l.deductions or 0.0)
        total_net += (l.net_pay or 0.0)
        
        data.append([
            emp_id,
            emp_name,
            f"Rs {(l.base_salary or 0.0):,.2f}",
            f"Rs {(l.allowances or 0.0):,.2f}",
            f"Rs {(l.deductions or 0.0):,.2f}",
            f"Rs {(l.net_pay or 0.0):,.2f}",
            "____________________"
        ])
        
    data.append([
        "GRAND TOTAL",
        "",
        f"Rs {total_base:,.2f}",
        f"Rs {total_allow:,.2f}",
        f"Rs {total_deduct:,.2f}",
        f"Rs {total_net:,.2f}",
        ""
    ])
    
    t = Table(data, colWidths=[60, 150, 90, 80, 80, 90, 130])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#065f46')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('BACKGROUND', (0, 1), (-1, -2), colors.HexColor('#f9fafb')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, -1), (-1, -1), 11),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#d1fae5')),
        ('TEXTCOLOR', (0, -1), (-1, -1), colors.HexColor('#065f46')),
        ('SPAN', (0, -1), (1, -1)),
    ]))
    
    elements.append(t)
    doc.build(elements)
    
    stream.seek(0)
    response = StreamingResponse(iter([stream.getvalue()]), media_type="application/pdf")
    response.headers["Content-Disposition"] = f"attachment; filename=master_payroll_{run.month}_{run.year}.pdf"
    return response

# Advance Salary
@router.get("/advances", response_model=List[AdvanceSalaryResponse])
def get_advances(db: Session = Depends(get_db), current_user: User = Depends(require_hr_view), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    effective_branch_id = get_effective_branch_id(db, current_user.tenant_id, scope)
    return HRService(db).get_advances(current_user.tenant_id, branch_id=effective_branch_id)

@router.post("/advances", response_model=AdvanceSalaryResponse)
def create_advance(obj_in: AdvanceSalaryCreate, db: Session = Depends(get_db), current_user: User = Depends(require_hr_create)):
    return HRService(db).create_advance(current_user.tenant_id, obj_in)

@router.post("/advances/{id}/approve", response_model=AdvanceSalaryResponse)
def approve_advance(id: str, db: Session = Depends(get_db), current_user: User = Depends(require_hr_approve)):
    return HRService(db).approve_advance(current_user.tenant_id, current_user.id, id)

@router.post("/advances/{id}/reject", response_model=AdvanceSalaryResponse)
def reject_advance(id: str, body: dict = Body(default={}), db: Session = Depends(get_db), current_user: User = Depends(require_hr_approve)):
    """Rejecting always requires a reason so the employee knows why."""
    return HRService(db).reject_advance(
        current_user.tenant_id, current_user.id, id,
        rejection_reason=(body or {}).get("rejection_reason"),
    )

# Analytics
@router.get("/analytics", response_model=HRAnalyticsResponse)
def get_hr_analytics(db: Session = Depends(get_db), current_user: User = Depends(require_hr_view), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    effective_branch_id = get_effective_branch_id(db, current_user.tenant_id, scope)
    return HRService(db).get_analytics(current_user.tenant_id, effective_branch_id)

# =====================================================================
# Enterprise Phase 10: Missing Endpoints
# =====================================================================

# Employee Documents
_HR_DOC_DIR = os.path.join(os.getcwd(), "storage", "hr_documents")
os.makedirs(_HR_DOC_DIR, exist_ok=True)
_ALLOWED_DOC_EXT = {"pdf", "png", "jpg", "jpeg", "webp", "doc", "docx", "xls", "xlsx"}


@router.post("/employee-documents/upload", summary="Upload a document file → returns its URL")
def upload_employee_document(file: UploadFile = File(...), current_user: User = Depends(require_hr_create)):
    ext = (file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "")
    if ext not in _ALLOWED_DOC_EXT:
        raise HTTPException(status_code=400, detail=f"Unsupported file type '.{ext}'. Allowed: PDF, images, DOC, XLS.")
    filename = f"{_uuid.uuid4().hex}.{ext}"
    with open(os.path.join(_HR_DOC_DIR, filename), "wb") as buf:
        shutil.copyfileobj(file.file, buf)
    return {"url": f"/storage/hr_documents/{filename}", "name": file.filename}


@router.get("/employee-documents", response_model=List[EmployeeDocumentResponse])
def get_employee_documents(employee_id: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(require_hr_view), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    effective_branch_id = get_effective_branch_id(db, current_user.tenant_id, scope)
    return HRService(db).get_employee_documents(current_user.tenant_id, employee_id, branch_id=effective_branch_id)

@router.post("/employee-documents", response_model=EmployeeDocumentResponse)
def create_employee_document(obj_in: EmployeeDocumentCreate, db: Session = Depends(get_db), current_user: User = Depends(require_hr_create)):
    return HRService(db).create_employee_document(current_user.tenant_id, current_user.id, obj_in)

@router.put("/employee-documents/{id}", response_model=EmployeeDocumentResponse)
def update_employee_document(id: str, obj_in: EmployeeDocumentUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_hr_update)):
    return HRService(db).update_employee_document(current_user.tenant_id, id, obj_in)

@router.delete("/employee-documents/{id}")
def delete_employee_document(id: str, db: Session = Depends(get_db), current_user: User = Depends(require_hr_delete)):
    return HRService(db).delete_employee_document(current_user.tenant_id, id)


# Performance Reviews
@router.get("/performance-reviews", response_model=List[PerformanceReviewResponse])
def get_performance_reviews(employee_id: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(require_hr_view), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    effective_branch_id = get_effective_branch_id(db, current_user.tenant_id, scope)
    return HRService(db).get_performance_reviews(current_user.tenant_id, employee_id, branch_id=effective_branch_id)

@router.post("/performance-reviews", response_model=PerformanceReviewResponse)
def create_performance_review(obj_in: PerformanceReviewCreate, db: Session = Depends(get_db), current_user: User = Depends(require_hr_create)):
    return HRService(db).create_performance_review(current_user.tenant_id, obj_in)

@router.put("/performance-reviews/{id}", response_model=PerformanceReviewResponse)
def update_performance_review(id: str, obj_in: PerformanceReviewUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_hr_update)):
    return HRService(db).update_performance_review(current_user.tenant_id, id, obj_in)


# Employee Tasks
@router.get("/employee-tasks", response_model=List[EmployeeTaskResponse])
def get_employee_tasks(employee_id: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(require_hr_view), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    effective_branch_id = get_effective_branch_id(db, current_user.tenant_id, scope)
    return HRService(db).get_employee_tasks(current_user.tenant_id, employee_id, branch_id=effective_branch_id)

@router.post("/employee-tasks", response_model=EmployeeTaskResponse)
def create_employee_task(obj_in: EmployeeTaskCreate, db: Session = Depends(get_db), current_user: User = Depends(require_hr_create)):
    return HRService(db).create_employee_task(current_user.tenant_id, current_user.id, obj_in)

@router.put("/employee-tasks/{id}", response_model=EmployeeTaskResponse)
def update_employee_task(id: str, obj_in: EmployeeTaskUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_hr_update)):
    return HRService(db).update_employee_task(current_user.tenant_id, id, obj_in)

@router.delete("/employee-tasks/{id}")
def delete_employee_task(id: str, db: Session = Depends(get_db), current_user: User = Depends(require_hr_delete)):
    return HRService(db).delete_employee_task(current_user.tenant_id, id)


# Training Programs
@router.get("/training-programs", response_model=List[TrainingProgramResponse])
def get_training_programs(db: Session = Depends(get_db), current_user: User = Depends(require_hr_view)):
    return HRService(db).get_training_programs(current_user.tenant_id)

@router.post("/training-programs", response_model=TrainingProgramResponse)
def create_training_program(obj_in: TrainingProgramCreate, db: Session = Depends(get_db), current_user: User = Depends(require_hr_create)):
    return HRService(db).create_training_program(current_user.tenant_id, obj_in)

@router.put("/training-programs/{id}", response_model=TrainingProgramResponse)
def update_training_program(id: str, obj_in: TrainingProgramUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_hr_update)):
    return HRService(db).update_training_program(current_user.tenant_id, id, obj_in)

@router.delete("/training-programs/{id}")
def delete_training_program(id: str, db: Session = Depends(get_db), current_user: User = Depends(require_hr_delete)):
    return HRService(db).delete_training_program(current_user.tenant_id, id)


# Training Attendance
@router.get("/training-programs/{program_id}/attendance", response_model=List[TrainingAttendanceResponse])
def get_training_attendances(program_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_hr_view)):
    return HRService(db).get_training_attendances(current_user.tenant_id, program_id)

@router.post("/training-programs/{program_id}/attendance", response_model=TrainingAttendanceResponse)
def create_training_attendance(program_id: str, obj_in: TrainingAttendanceCreate, db: Session = Depends(get_db), current_user: User = Depends(require_hr_create)):
    if obj_in.program_id != program_id:
        obj_in.program_id = program_id
    return HRService(db).create_training_attendance(current_user.tenant_id, obj_in)

@router.put("/training-attendance/{id}", response_model=TrainingAttendanceResponse)
def update_training_attendance(id: str, obj_in: TrainingAttendanceUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_hr_update)):
    return HRService(db).update_training_attendance(current_user.tenant_id, id, obj_in)

@router.delete("/training-attendance/{id}")
def delete_training_attendance(id: str, db: Session = Depends(get_db), current_user: User = Depends(require_hr_delete)):
    return HRService(db).delete_training_attendance(current_user.tenant_id, id)
