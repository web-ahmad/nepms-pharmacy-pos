from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from database import get_db
from models.users import User
from core.deps import requires_permission
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

router = APIRouter(dependencies=[Depends(require_module("employees"))])

class PayloadUser:
    def __init__(self, payload: dict):
        self.id = payload.get("sub")
        self.tenant_id = payload.get("tenant_id")
        self.payload = payload

def require_hr_view(token_payload: dict = Depends(requires_permission("hr:view"))): return PayloadUser(token_payload)
def require_hr_create(token_payload: dict = Depends(requires_permission("hr:create"))): return PayloadUser(token_payload)
def require_hr_update(token_payload: dict = Depends(requires_permission("hr:update"))): return PayloadUser(token_payload)
def require_hr_approve(token_payload: dict = Depends(requires_permission("hr:approve"))): return PayloadUser(token_payload)
def require_payroll_view(token_payload: dict = Depends(requires_permission("payroll:view"))): return PayloadUser(token_payload)
def require_payroll_run(token_payload: dict = Depends(requires_permission("payroll:run"))): return PayloadUser(token_payload)

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
def delete_department(id: str, db: Session = Depends(get_db), current_user: User = Depends(require_hr_create)):
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
def delete_employee(id: str, db: Session = Depends(get_db), current_user: User = Depends(require_hr_update)):
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
    current_user: User = Depends(require_hr_create)
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
def get_leaves(db: Session = Depends(get_db), current_user: User = Depends(require_hr_view)):
    return HRService(db).get_leaves(current_user.tenant_id)

@router.post("/leaves", response_model=LeaveRequestResponse)
def create_leave(obj_in: LeaveRequestCreate, db: Session = Depends(get_db), current_user: User = Depends(require_hr_create)):
    return HRService(db).create_leave(current_user.tenant_id, obj_in)

@router.post("/leaves/{id}/approve", response_model=LeaveRequestResponse)
def approve_leave(id: str, db: Session = Depends(get_db), current_user: User = Depends(require_hr_approve)):
    return HRService(db).approve_leave(current_user.tenant_id, current_user.id, id)

@router.post("/leaves/{id}/reject", response_model=LeaveRequestResponse)
def reject_leave(id: str, db: Session = Depends(get_db), current_user: User = Depends(require_hr_approve)):
    return HRService(db).reject_leave(current_user.tenant_id, current_user.id, id)

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
def get_payroll_runs(db: Session = Depends(get_db), current_user: User = Depends(require_payroll_view)):
    runs = HRService(db).get_payroll_runs(current_user.tenant_id)
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
def preview_payroll(month: int, year: int, department_id: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(require_payroll_run)):
    return HRService(db).preview_payroll(current_user.tenant_id, month, year, department_id)

@router.post("/payroll/run", response_model=PayrollRunResponse)
def run_payroll(obj_in: PayrollRunCreate, db: Session = Depends(get_db), current_user: User = Depends(require_payroll_run)):
    return HRService(db).run_payroll(current_user.tenant_id, current_user.id, obj_in)

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
def approve_payroll(id: str, request: PayrollApprovalRequest, db: Session = Depends(get_db), current_user: User = Depends(require_payroll_run)):
    return HRService(db).approve_payroll(current_user.tenant_id, current_user.id, id, request.override, request.remarks)

@router.post("/payroll/{id}/reject", response_model=PayrollRunResponse)
def reject_payroll(id: str, db: Session = Depends(get_db), current_user: User = Depends(require_payroll_run)):
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
def get_advances(db: Session = Depends(get_db), current_user: User = Depends(require_hr_view)):
    return HRService(db).get_advances(current_user.tenant_id)

@router.post("/advances", response_model=AdvanceSalaryResponse)
def create_advance(obj_in: AdvanceSalaryCreate, db: Session = Depends(get_db), current_user: User = Depends(require_hr_create)):
    return HRService(db).create_advance(current_user.tenant_id, obj_in)

@router.post("/advances/{id}/approve", response_model=AdvanceSalaryResponse)
def approve_advance(id: str, db: Session = Depends(get_db), current_user: User = Depends(require_hr_approve)):
    return HRService(db).approve_advance(current_user.tenant_id, current_user.id, id)

# Analytics
@router.get("/analytics", response_model=HRAnalyticsResponse)
def get_hr_analytics(db: Session = Depends(get_db), current_user: User = Depends(require_hr_view), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    effective_branch_id = get_effective_branch_id(db, current_user.tenant_id, scope)
    return HRService(db).get_analytics(current_user.tenant_id, effective_branch_id)

# =====================================================================
# Enterprise Phase 10: Missing Endpoints
# =====================================================================

# Employee Documents
@router.get("/employee-documents", response_model=List[EmployeeDocumentResponse])
def get_employee_documents(employee_id: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(require_hr_view)):
    return HRService(db).get_employee_documents(current_user.tenant_id, employee_id)

@router.post("/employee-documents", response_model=EmployeeDocumentResponse)
def create_employee_document(obj_in: EmployeeDocumentCreate, db: Session = Depends(get_db), current_user: User = Depends(require_hr_create)):
    return HRService(db).create_employee_document(current_user.tenant_id, current_user.id, obj_in)

@router.put("/employee-documents/{id}", response_model=EmployeeDocumentResponse)
def update_employee_document(id: str, obj_in: EmployeeDocumentUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_hr_update)):
    return HRService(db).update_employee_document(current_user.tenant_id, id, obj_in)

@router.delete("/employee-documents/{id}")
def delete_employee_document(id: str, db: Session = Depends(get_db), current_user: User = Depends(require_hr_update)):
    return HRService(db).delete_employee_document(current_user.tenant_id, id)


# Performance Reviews
@router.get("/performance-reviews", response_model=List[PerformanceReviewResponse])
def get_performance_reviews(employee_id: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(require_hr_view)):
    return HRService(db).get_performance_reviews(current_user.tenant_id, employee_id)

@router.post("/performance-reviews", response_model=PerformanceReviewResponse)
def create_performance_review(obj_in: PerformanceReviewCreate, db: Session = Depends(get_db), current_user: User = Depends(require_hr_create)):
    return HRService(db).create_performance_review(current_user.tenant_id, obj_in)

@router.put("/performance-reviews/{id}", response_model=PerformanceReviewResponse)
def update_performance_review(id: str, obj_in: PerformanceReviewUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_hr_update)):
    return HRService(db).update_performance_review(current_user.tenant_id, id, obj_in)


# Employee Tasks
@router.get("/employee-tasks", response_model=List[EmployeeTaskResponse])
def get_employee_tasks(employee_id: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(require_hr_view)):
    return HRService(db).get_employee_tasks(current_user.tenant_id, employee_id)

@router.post("/employee-tasks", response_model=EmployeeTaskResponse)
def create_employee_task(obj_in: EmployeeTaskCreate, db: Session = Depends(get_db), current_user: User = Depends(require_hr_create)):
    return HRService(db).create_employee_task(current_user.tenant_id, current_user.id, obj_in)

@router.put("/employee-tasks/{id}", response_model=EmployeeTaskResponse)
def update_employee_task(id: str, obj_in: EmployeeTaskUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_hr_update)):
    return HRService(db).update_employee_task(current_user.tenant_id, id, obj_in)

@router.delete("/employee-tasks/{id}")
def delete_employee_task(id: str, db: Session = Depends(get_db), current_user: User = Depends(require_hr_update)):
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
def delete_training_program(id: str, db: Session = Depends(get_db), current_user: User = Depends(require_hr_update)):
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
def delete_training_attendance(id: str, db: Session = Depends(get_db), current_user: User = Depends(require_hr_update)):
    return HRService(db).delete_training_attendance(current_user.tenant_id, id)
