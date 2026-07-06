from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from database import get_db
from models.users import User
from dependencies.auth import require_role
from dependencies.module_guard import require_module
from schemas.hr import (
    DepartmentCreate, DepartmentResponse,
    EmployeeCreate, EmployeeUpdate, EmployeeResponse,
    AttendanceCreate, AttendanceResponse,
    ClockInRequest, ClockOutRequest,
    LeaveRequestCreate, LeaveRequestResponse,
    ShiftCreate, ShiftResponse, ShiftUpdate,
    PayrollRunCreate, PayrollRunResponse,
    HRAnalyticsResponse,
    DesignationCreate, DesignationResponse, DesignationUpdate
)
from services.hr_service import HRService

router = APIRouter(dependencies=[Depends(require_module("employees"))])

def require_hr_view(current_user: User = Depends(require_role("hr.view"))): return current_user
def require_hr_create(current_user: User = Depends(require_role("hr.create"))): return current_user
def require_hr_update(current_user: User = Depends(require_role("hr.update"))): return current_user
def require_hr_approve(current_user: User = Depends(require_role("hr.approve"))): return current_user
def require_payroll_view(current_user: User = Depends(require_role("payroll.view"))): return current_user
def require_payroll_run(current_user: User = Depends(require_role("payroll.run"))): return current_user

# Departments
@router.get("/departments", response_model=List[DepartmentResponse])
def get_departments(db: Session = Depends(get_db), current_user: User = Depends(require_hr_view)):
    try:
        return HRService(db).get_departments(current_user.tenant_id)
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"get_departments failed: {str(e)}")

@router.post("/departments", response_model=DepartmentResponse)
def create_department(obj_in: DepartmentCreate, db: Session = Depends(get_db), current_user: User = Depends(require_hr_create)):
    try:
        # Sanitize empty strings to None for FK fields
        if getattr(obj_in, 'head_id', None) == "":
            obj_in.head_id = None
        return HRService(db).create_department(current_user.tenant_id, obj_in)
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
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Failed to update department: {str(e)}")

# Designations
@router.get("/designations", response_model=List[DesignationResponse])
def get_designations(db: Session = Depends(get_db), current_user: User = Depends(require_hr_view)):
    try:
        return HRService(db).get_designations(current_user.tenant_id)
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"get_designations failed: {str(e)}")

@router.post("/designations", response_model=DesignationResponse)
def create_designation(obj_in: DesignationCreate, db: Session = Depends(get_db), current_user: User = Depends(require_hr_create)):
    return HRService(db).create_designation(current_user.tenant_id, obj_in)

@router.put("/designations/{id}", response_model=DesignationResponse)
def update_designation(id: str, obj_in: DesignationUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_hr_update)):
    return HRService(db).update_designation(current_user.tenant_id, id, obj_in)

# Employees
@router.get("/employees", response_model=List[EmployeeResponse])
def get_employees(db: Session = Depends(get_db), current_user: User = Depends(require_hr_view)):
    try:
        return HRService(db).get_employees(current_user.tenant_id)
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"get_employees failed: {str(e)}")

@router.get("/employees/{id}", response_model=EmployeeResponse)
def get_employee(id: str, db: Session = Depends(get_db), current_user: User = Depends(require_hr_view)):
    return HRService(db).get_employee(current_user.tenant_id, id)

@router.post("/employees", response_model=EmployeeResponse)
def create_employee(obj_in: EmployeeCreate, db: Session = Depends(get_db), current_user: User = Depends(require_hr_create)):
    try:
        # Clean up empty strings for relational fields to avoid DB foreign key errors
        if getattr(obj_in, 'department_id', None) == "":
            obj_in.department_id = None
        if getattr(obj_in, 'designation_id', None) == "":
            obj_in.designation_id = None
        if getattr(obj_in, 'shift_id', None) == "":
            obj_in.shift_id = None
            
        return HRService(db).create_employee(current_user.tenant_id, current_user.id, obj_in)
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
def delete_employee(id: str, db: Session = Depends(get_db), current_user: User = Depends(require_hr_update)):
    return HRService(db).delete_employee(current_user.tenant_id, current_user.id, id)

# Attendance
@router.get("/attendance", response_model=List[AttendanceResponse])
def get_attendance(
    date: Optional[date] = Query(None, description="Filter by date (YYYY-MM-DD). Defaults to today."),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_view)
):
    from datetime import date as date_cls
    target = date if date else date_cls.today()
    try:
        return HRService(db).get_attendance_logs(current_user.tenant_id, target)
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

# Leaves
@router.get("/leaves", response_model=List[LeaveRequestResponse])
def get_leaves(db: Session = Depends(get_db), current_user: User = Depends(require_hr_view)):
    return HRService(db).get_leaves(current_user.tenant_id)

@router.post("/leaves", response_model=LeaveRequestResponse)
def create_leave(obj_in: LeaveRequestCreate, db: Session = Depends(get_db), current_user: User = Depends(require_hr_create)):
    return HRService(db).create_leave(current_user.tenant_id, obj_in)

@router.post("/leaves/{id}/approve", response_model=LeaveRequestResponse)
def approve_leave(id: str, db: Session = Depends(get_db), current_user: User = Depends(require_hr_approve)):
    return HRService(db).approve_leave(current_user.tenant_id, current_user.id, id)

# Shifts
@router.get("/shifts", response_model=List[ShiftResponse])
def get_shifts(db: Session = Depends(get_db), current_user: User = Depends(require_hr_view)):
    try:
        return HRService(db).get_shifts(current_user.tenant_id)
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"get_shifts failed: {str(e)}")

@router.post("/shifts", response_model=ShiftResponse)
def create_shift(obj_in: ShiftCreate, db: Session = Depends(get_db), current_user: User = Depends(require_hr_create)):
    return HRService(db).create_shift(current_user.tenant_id, obj_in)

@router.put("/shifts/{id}", response_model=ShiftResponse)
def update_shift(id: str, obj_in: ShiftUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_hr_update)):
    return HRService(db).update_shift(current_user.tenant_id, id, obj_in)

# Payroll
@router.get("/payroll", response_model=List[PayrollRunResponse])
def get_payroll_runs(db: Session = Depends(get_db), current_user: User = Depends(require_payroll_view)):
    return HRService(db).get_payroll_runs(current_user.tenant_id)

@router.post("/payroll/run", response_model=PayrollRunResponse)
def run_payroll(obj_in: PayrollRunCreate, db: Session = Depends(get_db), current_user: User = Depends(require_payroll_run)):
    return HRService(db).run_payroll(current_user.tenant_id, current_user.id, obj_in)

@router.get("/payroll/{id}", response_model=PayrollRunResponse)
def get_payroll_run(id: str, db: Session = Depends(get_db), current_user: User = Depends(require_payroll_view)):
    return HRService(db).get_payroll_run(current_user.tenant_id, id)

# Analytics
@router.get("/analytics", response_model=HRAnalyticsResponse)
def get_hr_analytics(db: Session = Depends(get_db), current_user: User = Depends(require_hr_view)):
    return HRService(db).get_analytics(current_user.tenant_id)
